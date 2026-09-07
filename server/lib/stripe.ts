import Stripe from "stripe";
import express, { type Express, type Request, type Response } from "express";
import { config } from "../config";
import { log } from "../vite";
import * as userStore from "../storage/users";
import * as merchantStore from "../storage/merchants";
import type { User, Merchant } from "@shared/schema";

// Stripe is optional. Without STRIPE_SECRET_KEY the checkout routes activate the
// membership or plan directly (development mode) instead of returning a Checkout URL.

export const stripe: Stripe | null = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

export function isStripeConfigured(): boolean {
  return stripe !== null;
}

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Activates the resident's annual membership for 12 months from now (or from the current expiry if later). */
export async function activateMembership(user: User, stripeIds?: { customerId?: string | null; subscriptionId?: string | null }) {
  const now = new Date();
  const base = user.membershipExpiry && user.membershipExpiry > now ? user.membershipExpiry : now;
  return userStore.updateUser(user.id, {
    membershipStatus: "active",
    membershipExpiry: addMonths(base, 12),
    stripeCustomerId: stripeIds?.customerId ?? user.stripeCustomerId,
    stripeSubscriptionId: stripeIds?.subscriptionId ?? user.stripeSubscriptionId,
  });
}

/** Activates the merchant's monthly plan; renews one month from now. */
export async function activateMerchantPlan(merchant: Merchant, stripeIds?: { customerId?: string | null; subscriptionId?: string | null }) {
  const now = new Date();
  return merchantStore.updateMerchant(merchant.id, {
    planStatus: "active",
    planStartedAt: merchant.planStatus === "active" ? merchant.planStartedAt : now,
    planRenewsAt: addMonths(now, 1),
    stripeCustomerId: stripeIds?.customerId ?? merchant.stripeCustomerId,
    stripeSubscriptionId: stripeIds?.subscriptionId ?? merchant.stripeSubscriptionId,
  });
}

function toPence(gbp: number): number {
  return Math.round(gbp * 100);
}

/** Checkout Session for the resident's annual membership. Returns the hosted page URL. */
export async function createMembershipCheckout(user: User): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: user.stripeCustomerId ?? undefined,
    customer_email: user.stripeCustomerId ? undefined : user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: toPence(config.residentAnnualFeeGbp),
          recurring: { interval: "year" },
          product_data: { name: "Resicard annual membership" },
        },
      },
    ],
    metadata: { kind: "membership", userId: String(user.id) },
    subscription_data: { metadata: { kind: "membership", userId: String(user.id) } },
    success_url: `${config.publicBaseUrl}/membership?checkout=success`,
    cancel_url: `${config.publicBaseUrl}/membership?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Checkout Session for the merchant's monthly plan. Returns the hosted page URL. */
export async function createMerchantPlanCheckout(merchant: Merchant, ownerEmail: string): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: merchant.stripeCustomerId ?? undefined,
    customer_email: merchant.stripeCustomerId ? undefined : ownerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: toPence(config.merchantMonthlyFeeGbp),
          recurring: { interval: "month" },
          product_data: { name: "Resicard merchant plan" },
        },
      },
    ],
    metadata: { kind: "merchant_plan", merchantId: merchant.id },
    subscription_data: { metadata: { kind: "merchant_plan", merchantId: merchant.id } },
    success_url: `${config.publicBaseUrl}/merchant/plan?checkout=success`,
    cancel_url: `${config.publicBaseUrl}/merchant/plan?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Cancels the Stripe subscription if there is one; silently does nothing otherwise. */
export async function cancelSubscription(subscriptionId: string | null | undefined): Promise<void> {
  if (!stripe || !subscriptionId) return;
  try {
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (err) {
    log(`Stripe cancel failed for ${subscriptionId}: ${(err as Error).message}`, "stripe");
  }
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const kind = session.metadata?.kind;
  const ids = { customerId: idOf(session.customer), subscriptionId: idOf(session.subscription) };
  if (kind === "membership") {
    const userId = Number(session.metadata?.userId);
    const user = Number.isInteger(userId) ? await userStore.getUserById(userId) : undefined;
    if (user) await activateMembership(user, ids);
  } else if (kind === "merchant_plan") {
    const merchantId = session.metadata?.merchantId;
    const merchant = merchantId ? await merchantStore.getMerchantById(merchantId) : undefined;
    if (merchant) await activateMerchantPlan(merchant, ids);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const user = await userStore.getUserByStripeSubscription(subscription.id);
  if (user) {
    await userStore.updateUser(user.id, { membershipStatus: "cancelled", stripeSubscriptionId: null });
  }
  const merchant = await merchantStore.getMerchantByStripeSubscription(subscription.id);
  if (merchant) {
    await merchantStore.updateMerchant(merchant.id, { planStatus: "inactive", stripeSubscriptionId: null });
  }
}

/**
 * POST /api/stripe/webhook. Must be mounted before the JSON body parser so the raw
 * body is available for signature verification.
 */
export function registerStripeWebhook(app: Express): void {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
    if (!stripe) {
      res.status(404).json({ message: "Stripe is not configured" });
      return;
    }
    let event: Stripe.Event;
    try {
      const signature = req.headers["stripe-signature"];
      if (config.stripeWebhookSecret && typeof signature === "string") {
        event = stripe.webhooks.constructEvent(req.body as Buffer, signature, config.stripeWebhookSecret);
      } else if (!config.isProduction) {
        // Unsigned events are accepted only outside production, for local testing.
        event = JSON.parse((req.body as Buffer).toString("utf8")) as Stripe.Event;
      } else {
        res.status(400).json({ message: "Missing webhook signature" });
        return;
      }
    } catch (err) {
      res.status(400).json({ message: `Webhook error: ${(err as Error).message}` });
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        await handleCheckoutCompleted(event.data.object);
      } else if (event.type === "customer.subscription.deleted") {
        await handleSubscriptionDeleted(event.data.object);
      }
      res.json({ received: true });
    } catch (err) {
      log(`Webhook handling failed: ${(err as Error).message}`, "stripe");
      res.status(500).json({ message: "Webhook handling failed" });
    }
  });
}
