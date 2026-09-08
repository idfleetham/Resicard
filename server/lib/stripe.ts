import Stripe from "stripe";
import express, { type Express, type Request, type Response } from "express";
import { config } from "../config";
import { log } from "../vite";
import * as userStore from "../storage/users";
import * as merchantStore from "../storage/merchants";
import * as offerStore from "../storage/offers";
import type { User, Merchant } from "@shared/schema";
import { planFeeGbp, randomHouseholdCode, type MembershipPlan } from "./membership";
import { liveOffersOverLimit, normalisePlan, planFeeGbp as merchantPlanFeeGbp, type PlanStatus } from "./plan";
import {
  recordSubscriptionEvent,
  startOrRenew,
  hasEverPaid,
  residentSubjectName,
  merchantSubjectName,
  type LedgerKind,
  type LedgerSource,
} from "./ledger";
import { addDays, renewalFromInvoice, trialDaysFrom } from "./trial";
import { creditReferralOnFirstPayment } from "./referral-service";

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

export interface StripeIds {
  customerId?: string | null;
  subscriptionId?: string | null;
}

/** Overrides for an activation: the real period end from Stripe, and what was actually charged. */
export interface ActivationOpts {
  /** Use this as the expiry / planRenewsAt instead of computing the next period. */
  periodEnd?: Date;
  /** What went on the ledger row. 0 during a free trial, so trials are not counted as revenue. */
  amountGbp?: number;
}

/** How many free trial days this subject gets right now: the configured length, or 0 if they have paid before. */
export async function trialDaysFor(kind: LedgerKind, subjectId: string): Promise<number> {
  if (config.freeTrialDays <= 0) return 0;
  return trialDaysFrom(await hasEverPaid(kind, subjectId), config.freeTrialDays);
}

/** A household code not already used by another primary. */
export async function uniqueHouseholdCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomHouseholdCode();
    if (!(await userStore.getUserByHouseholdCode(code))) return code;
  }
  throw new Error("Could not generate a unique household code");
}

/**
 * Activates the resident's annual membership on the given plan for 12 months from now
 * (or from the current expiry if later). A household primary gets a householdCode if missing.
 */
export async function activateMembership(
  user: User,
  plan: MembershipPlan,
  stripeIds?: StripeIds,
  source: LedgerSource = stripeIds ? "stripe" : "dev",
  opts?: ActivationOpts,
) {
  const now = new Date();
  const base = user.membershipExpiry && user.membershipExpiry > now ? user.membershipExpiry : now;
  const expiry = opts?.periodEnd ?? addMonths(base, 12);
  const householdCode = plan === "household" && !user.householdCode ? await uniqueHouseholdCode() : user.householdCode;
  const updated = await userStore.updateUser(user.id, {
    membershipPlan: plan,
    membershipStatus: "active",
    membershipExpiry: expiry,
    membershipRenews: true,
    householdCode,
    stripeCustomerId: stripeIds?.customerId ?? user.stripeCustomerId,
    stripeSubscriptionId: stripeIds?.subscriptionId ?? user.stripeSubscriptionId,
  });
  await recordSubscriptionEvent({
    kind: "resident_membership",
    subjectId: String(user.id),
    subjectName: residentSubjectName(user),
    plan,
    action: await startOrRenew("resident_membership", String(user.id), Boolean(user.membershipExpiry)),
    amountGbp: opts?.amountGbp ?? planFeeGbp(plan, config.residentAnnualFeeGbp),
    periodStart: base,
    periodEnd: expiry,
    source,
  });
  return updated;
}

/** Records the end of a resident's membership (cancelled by them, or lapsed via Stripe). */
export async function recordMembershipEnded(user: User, action: "cancelled" | "lapsed", source: LedgerSource) {
  await recordSubscriptionEvent({
    kind: "resident_membership",
    subjectId: String(user.id),
    subjectName: residentSubjectName(user),
    plan: user.membershipPlan === "household" ? "household" : "individual",
    action,
    amountGbp: 0,
    periodStart: null,
    periodEnd: user.membershipExpiry ?? null,
    source,
  });
}

/** The merchant tiers that are actually bought. */
export type PaidMerchantPlan = Exclude<PlanStatus, "free">;

const MERCHANT_PLAN_NAMES: Record<PaidMerchantPlan, string> = {
  standard: "Resicard Standard (business)",
  insight: "Resicard Insight (business)",
};

function toPence(gbp: number): number {
  return Math.round(gbp * 100);
}

/** The monthly fee for a paid merchant tier, at the prices this deployment is configured with. */
export function merchantPlanFee(plan: PaidMerchantPlan): number {
  return merchantPlanFeeGbp(plan, { standard: config.merchantStandardMonthlyFeeGbp, insight: config.merchantInsightMonthlyFeeGbp });
}

/**
 * Moves the merchant onto `plan` (Standard or Insight); renews one month from now.
 * `planStartedAt` is kept when they were already paying, so a tier change does not
 * look like a new customer.
 */
export async function activateMerchantPlan(
  merchant: Merchant,
  plan: PaidMerchantPlan,
  stripeIds?: StripeIds,
  source: LedgerSource = stripeIds ? "stripe" : "dev",
  opts?: ActivationOpts,
) {
  const now = new Date();
  const renewsAt = opts?.periodEnd ?? addMonths(now, 1);
  const wasPaying = normalisePlan(merchant.planStatus) !== "free";
  const updated = await merchantStore.updateMerchant(merchant.id, {
    planStatus: plan,
    planStartedAt: wasPaying ? merchant.planStartedAt : now,
    planRenewsAt: renewsAt,
    stripeCustomerId: stripeIds?.customerId ?? merchant.stripeCustomerId,
    stripeSubscriptionId: stripeIds?.subscriptionId ?? merchant.stripeSubscriptionId,
  });
  await recordSubscriptionEvent({
    kind: "merchant_premium",
    subjectId: merchant.id,
    subjectName: merchantSubjectName(merchant),
    plan,
    action: await startOrRenew("merchant_premium", merchant.id, wasPaying),
    amountGbp: opts?.amountGbp ?? merchantPlanFee(plan),
    periodStart: now,
    periodEnd: renewsAt,
    source,
  });
  return updated;
}

/**
 * Repoints an existing merchant subscription at another tier's price. Stripe only ever
 * gives these subscriptions one item, so this swaps that item's price and lets Stripe
 * prorate. Errors are not swallowed: the caller must not move the plan if the billing
 * did not move with it.
 */
export async function changeMerchantSubscriptionPrice(subscriptionId: string, plan: PaidMerchantPlan): Promise<void> {
  if (!stripe) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const item = subscription.items.data[0];
  if (!item) throw new Error(`Subscription ${subscriptionId} has no item to reprice`);
  // A subscription item can only be pointed at a Price object, so the new tier's price
  // is created first (the same inline shape checkout builds for a new subscription).
  const price = await stripe.prices.create({
    currency: "gbp",
    unit_amount: toPence(merchantPlanFee(plan)),
    recurring: { interval: "month" },
    product_data: { name: MERCHANT_PLAN_NAMES[plan], tax_code: config.stripeTaxCodeMerchantPlan },
  });
  await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price: price.id }],
    proration_behavior: "create_prorations",
    metadata: { kind: "merchant_plan", merchantId: subscription.metadata?.merchantId ?? "", plan },
  });
}

/**
 * Moves a merchant who is already paying onto another tier. The period and the start
 * date are untouched, so a tier change does not read as a new customer and, going down
 * from Insight to Standard, the loyalty programme and the live offers carry on. Nothing
 * goes on the ledger: no money moves today, and the next paid invoice records the new
 * amount at the new price.
 */
export async function changeMerchantPlanTier(merchant: Merchant, plan: PaidMerchantPlan): Promise<Merchant | undefined> {
  if (merchant.stripeSubscriptionId) await changeMerchantSubscriptionPrice(merchant.stripeSubscriptionId, plan);
  return merchantStore.updateMerchant(merchant.id, { planStatus: plan });
}

/**
 * Moves the merchant back to Free. Any live offers beyond the Free limit are paused
 * (newest first). Returns the updated merchant and the number of offers paused.
 */
export async function deactivateMerchantPlan(
  merchant: Merchant,
  source: LedgerSource = "dev",
  action: "cancelled" | "lapsed" = "cancelled",
): Promise<{ merchant: Merchant; pausedOffers: number }> {
  const previous = normalisePlan(merchant.planStatus);
  const updated = await merchantStore.updateMerchant(merchant.id, { planStatus: "free", planRenewsAt: null, stripeSubscriptionId: null });
  const liveCount = await offerStore.countLiveOffersForMerchant(merchant.id);
  const extra = liveOffersOverLimit("free", liveCount, config.freePlanLiveOfferLimit);
  const pausedOffers = await offerStore.pauseNewestLiveOffers(merchant.id, extra);
  if (previous !== "free") {
    await recordSubscriptionEvent({
      kind: "merchant_premium",
      subjectId: merchant.id,
      subjectName: merchantSubjectName(merchant),
      plan: previous,
      action,
      amountGbp: 0,
      periodStart: null,
      periodEnd: merchant.planRenewsAt ?? null,
      source,
    });
  }
  return { merchant: updated ?? merchant, pausedOffers };
}

/** `subscription_data` with a trial when one is due, and the card always collected up front. */
function subscriptionData(metadata: Record<string, string>, trialDays: number): Stripe.Checkout.SessionCreateParams.SubscriptionData {
  const data: Stripe.Checkout.SessionCreateParams.SubscriptionData = { metadata };
  if (trialDays > 0) data.trial_period_days = trialDays;
  return data;
}

/** Checkout Session for the resident's annual membership. Returns the hosted page URL. */
export async function createMembershipCheckout(user: User, plan: MembershipPlan): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");
  const trialDays = await trialDaysFor("resident_membership", String(user.id));
  const metadata = { kind: "membership", userId: String(user.id), plan };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    // Taken during a trial too, so the trial converts on its own.
    payment_method_collection: "always",
    customer: user.stripeCustomerId ?? undefined,
    customer_email: user.stripeCustomerId ? undefined : user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: toPence(planFeeGbp(plan, config.residentAnnualFeeGbp)),
          recurring: { interval: "year" },
          product_data: {
            name: plan === "household" ? "Resicard household membership" : "Resicard individual membership",
            tax_code: config.stripeTaxCodeMembership,
          },
        },
      },
    ],
    metadata,
    subscription_data: subscriptionData(metadata, trialDays),
    success_url: `${config.publicBaseUrl}/membership?checkout=success`,
    cancel_url: `${config.publicBaseUrl}/membership?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Checkout Session for a merchant plan. The target tier travels in the metadata. */
export async function createMerchantPlanCheckout(merchant: Merchant, ownerEmail: string, plan: PaidMerchantPlan): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");
  const trialDays = await trialDaysFor("merchant_premium", merchant.id);
  const metadata = { kind: "merchant_plan", merchantId: merchant.id, plan };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_collection: "always",
    customer: merchant.stripeCustomerId ?? undefined,
    customer_email: merchant.stripeCustomerId ? undefined : ownerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: toPence(merchantPlanFee(plan)),
          recurring: { interval: "month" },
          product_data: { name: MERCHANT_PLAN_NAMES[plan], tax_code: config.stripeTaxCodeMerchantPlan },
        },
      },
    ],
    metadata,
    subscription_data: subscriptionData(metadata, trialDays),
    success_url: `${config.publicBaseUrl}/merchant/plan?checkout=success`,
    cancel_url: `${config.publicBaseUrl}/merchant/plan?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/**
 * Development mode (no Stripe key): activate the membership as checkout would.
 * A first-time resident gets the trial (expiry now + trial days, nothing on the ledger);
 * a returning one gets the full year at the full fee.
 */
export async function activateMembershipForCheckout(user: User, plan: MembershipPlan) {
  const trialDays = await trialDaysFor("resident_membership", String(user.id));
  if (trialDays === 0) return activateMembership(user, plan);
  return activateMembership(user, plan, undefined, "dev", { periodEnd: addDays(new Date(), trialDays), amountGbp: 0 });
}

/** Development mode: the same for a merchant plan. */
export async function activateMerchantPlanForCheckout(merchant: Merchant, plan: PaidMerchantPlan) {
  const trialDays = await trialDaysFor("merchant_premium", merchant.id);
  if (trialDays === 0) return activateMerchantPlan(merchant, plan);
  return activateMerchantPlan(merchant, plan, undefined, "dev", { periodEnd: addDays(new Date(), trialDays), amountGbp: 0 });
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

/**
 * Schedules (or undoes) cancellation of the Stripe subscription at the end of the current
 * period; silently does nothing without Stripe or a subscription.
 */
export async function setCancelAtPeriodEnd(subscriptionId: string | null | undefined, cancel: boolean): Promise<void> {
  if (!stripe || !subscriptionId) return;
  try {
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: cancel });
  } catch (err) {
    log(`Stripe cancel_at_period_end update failed for ${subscriptionId}: ${(err as Error).message}`, "stripe");
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
    const plan: MembershipPlan = session.metadata?.plan === "household" ? "household" : "individual";
    if (user) await activateMembership(user, plan, ids);
  } else if (kind === "merchant_plan") {
    const merchantId = session.metadata?.merchantId;
    const merchant = merchantId ? await merchantStore.getMerchantById(merchantId) : undefined;
    // Sessions created before the re-cut carry no plan; they bought what is now Standard.
    const plan: PaidMerchantPlan = session.metadata?.plan === "insight" ? "insight" : "standard";
    if (merchant) await activateMerchantPlan(merchant, plan, ids);
  }
}

/** The subscription metadata snapshot Stripe copies onto the invoice, as plain strings. */
function invoiceSubscriptionMetadata(invoice: Stripe.Invoice): Record<string, string> | null {
  const parent = invoice.parent;
  if (parent?.type !== "subscription_details" || !parent.subscription_details) return null;
  return (parent.subscription_details.metadata ?? null) as Record<string, string> | null;
}

/**
 * A paid renewal invoice: the trial converting into the first real payment, or a later
 * period (year two for a resident, next month for a merchant). Extends the membership or
 * plan to the period the invoice paid for and records the real amount on the ledger.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const renewal = renewalFromInvoice({
    billingReason: invoice.billing_reason,
    amountPaidPence: invoice.amount_paid,
    metadata: invoiceSubscriptionMetadata(invoice),
    periodEndSeconds: invoice.lines?.data?.[0]?.period?.end ?? invoice.period_end,
  });
  if (!renewal) return;
  const subscriptionId = idOf(invoiceSubscription(invoice));
  const ids: StripeIds = { customerId: idOf(invoice.customer), subscriptionId };

  if (renewal.kind === "membership" && renewal.userId !== null) {
    const user = await userStore.getUserById(renewal.userId);
    if (user) {
      // This is the payment a referral waits for. Crediting claims the pending row
      // in one statement, so a webhook Stripe sends twice pays out once; the month
      // owed to the referred member comes back as a number and is folded into the
      // expiry, which keeps the expiry a function of the invoice rather than of how
      // many times it arrived.
      // Two days of slack so a clock difference between here and Stripe cannot put
      // the moment of crediting a fraction before the period it belongs to.
      const periodStart = addDays(addMonths(renewal.periodEnd, -12), -2);
      const credit = await creditReferralOnFirstPayment(user.id, periodStart);
      await activateMembership(user, renewal.plan === "household" ? "household" : "individual", ids, "stripe", {
        periodEnd: credit.referredMonths > 0 ? addMonths(renewal.periodEnd, credit.referredMonths) : renewal.periodEnd,
        amountGbp: renewal.amountGbp,
      });
    }
    return;
  }
  if (renewal.kind === "merchant_plan" && renewal.merchantId) {
    const merchant = await merchantStore.getMerchantById(renewal.merchantId);
    if (merchant) {
      // A renewal never changes the tier: the metadata tier wins, else what they are already on.
      const plan: PaidMerchantPlan = renewal.merchantPlan ?? (normalisePlan(merchant.planStatus) === "insight" ? "insight" : "standard");
      await activateMerchantPlan(merchant, plan, ids, "stripe", { periodEnd: renewal.periodEnd, amountGbp: renewal.amountGbp });
    }
  }
}

function invoiceSubscription(invoice: Stripe.Invoice): string | { id: string } | null {
  const parent = invoice.parent;
  if (parent?.type !== "subscription_details" || !parent.subscription_details) return null;
  return parent.subscription_details.subscription ?? null;
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const user = await userStore.getUserByStripeSubscription(subscription.id);
  if (user) {
    await userStore.updateUser(user.id, { membershipStatus: "inactive", stripeSubscriptionId: null });
    // A scheduled downgrade was already written to the ledger as "cancelled".
    if (user.membershipRenews !== false) await recordMembershipEnded(user, "lapsed", "stripe");
  }
  const merchant = await merchantStore.getMerchantByStripeSubscription(subscription.id);
  if (merchant) await deactivateMerchantPlan(merchant, "stripe", "lapsed");
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
      } else if (event.type === "invoice.paid") {
        await handleInvoicePaid(event.data.object);
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
