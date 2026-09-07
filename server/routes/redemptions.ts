import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { scanRedeemSchema, generateCustomerAlias, redemptions, type Offer, type Merchant, type User, type Redemption } from "@shared/schema";
import { db } from "../db";
import * as userStore from "../storage/users";
import * as merchantStore from "../storage/merchants";
import * as offerStore from "../storage/offers";
import * as redemptionStore from "../storage/redemptions";
import * as loyaltyStore from "../storage/loyalty";
import type { DbClient } from "../storage/types";
import { authenticate, requireRole, currentUser, currentMerchantId } from "../lib/auth";
import { asyncHandler, parseBody, notFound, forbidden, badRequest, toNumber, toNumericString, HttpError } from "../lib/http";
import {
  isOfferLiveNow,
  checkResidentLimits,
  generateRedemptionCode,
  residentRedeemReasons,
  merchantRedeemReasons,
} from "../lib/offer-rules";
import { awardPoints } from "../lib/loyalty";
import { effectiveMembership } from "../lib/membership";
import { isPremium } from "../lib/plan";
import { stripMenuPdf } from "./public";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function merchantSummary(m: Merchant) {
  return { id: m.id, name: m.name, category: m.category, logoUrl: m.logoUrl, address: m.address };
}

/** Rule 5: when eligibleTiers is set, the resident's current tier at this merchant must be listed. */
function tierEligible(offer: Offer, currentTierId: string | null): boolean {
  const tiers = offer.eligibleTiers ?? [];
  if (tiers.length === 0) return true;
  return currentTierId !== null && tiers.includes(currentTierId);
}

interface OfferCheckContext {
  userId: number;
  merchantId: string;
  currentTierId: string | null;
  redeemedAtMerchantBefore: boolean;
  now: Date;
}

/** Applies rules 3 to 5 and the new-customer flag. Returns the blocking reason or null. */
async function offerBlockReason(offer: Offer, ctx: OfferCheckContext, client: DbClient): Promise<string | null> {
  if (!isOfferLiveNow(offer, ctx.now)) return "This offer is not available right now";
  if (!tierEligible(offer, ctx.currentTierId)) return "This offer is only available to certain loyalty tiers";
  if (offer.newCustomerOnly && ctx.redeemedAtMerchantBefore) return "This offer is for new customers only";
  const counts = await redemptionStore.countRedemptionsForLimits(offer.id, ctx.userId, client);
  const limits = checkResidentLimits(offer, counts);
  return limits.ok ? null : limits.reason;
}

async function buildContext(user: User, merchant: Merchant, client: DbClient): Promise<OfferCheckContext> {
  const balance = await loyaltyStore.getBalance(merchant.id, user.id, client);
  const priorAtMerchant = await redemptionStore.countRedemptionsWhere(
    and(eq(redemptions.merchantId, merchant.id), eq(redemptions.userId, user.id)),
    client,
  );
  return {
    userId: user.id,
    merchantId: merchant.id,
    currentTierId: balance?.tierId ?? null,
    redeemedAtMerchantBefore: priorAtMerchant > 0,
    now: new Date(),
  };
}

/** The merchant's active loyalty programme, only while they are on Premium. */
async function activeProgram(merchant: Merchant, client: DbClient) {
  if (!isPremium(merchant.planStatus)) return null;
  const program = await loyaltyStore.getProgramByMerchant(merchant.id, client);
  return program && program.active ? program : null;
}

/** Loyalty details for the resident at this merchant, or null on Free or without a programme. */
async function loyaltySnapshot(merchant: Merchant, userId: number, client: DbClient) {
  const program = await activeProgram(merchant, client);
  if (!program) return null;
  const balance = await loyaltyStore.getBalance(merchant.id, userId, client);
  const tier = balance?.tierId ? await loyaltyStore.getTierById(balance.tierId, client) : null;
  return { program, balance: balance ?? null, tier: tier ?? null };
}

/** Rule 1 with the household taken into account. */
async function residentReasons(user: User, client: DbClient): Promise<string[]> {
  const primary = await userStore.getHouseholdPrimary(user, client);
  return residentRedeemReasons(user, effectiveMembership(user, primary));
}

/** The success-screen payload shared by POST /api/redemptions and GET /api/redemptions/:id. */
async function redemptionResponse(redemption: Redemption, offer: Offer, merchant: Merchant, user: User) {
  const snapshot = await loyaltySnapshot(merchant, user.id, db);
  return {
    redemption: {
      id: redemption.id,
      code: redemption.code,
      redeemedAt: redemption.redeemedAt,
      pointsAwarded: redemption.pointsAwarded ?? 0,
      basketAmount: toNumber(redemption.basketAmount),
    },
    offer: {
      id: offer.id,
      title: offer.title,
      type: offer.type,
      percentOff: offer.percentOff,
      fixedPrice: toNumber(offer.fixedPrice),
      shortPromo: offer.shortPromo,
      terms: offer.terms,
    },
    merchant: { id: merchant.id, name: merchant.name, logoUrl: merchant.logoUrl },
    resident: { firstName: user.firstName, surname: user.surname, profilePhoto: user.profilePhoto },
    loyalty: snapshot ? { points: snapshot.balance?.points ?? 0, tierName: snapshot.tier?.name ?? null } : null,
  };
}

async function uniqueRedemptionCode(client: DbClient): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRedemptionCode();
    if (!(await redemptionStore.getRedemptionByCode(code, client))) return code;
  }
  throw new Error("Could not generate a unique redemption code");
}

export const redemptionsRouter = Router();

redemptionsRouter.get(
  "/api/scan/:scanCode",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const merchant = await merchantStore.getMerchantByScanCode(req.params.scanCode);
    if (!merchant) throw notFound("Unknown scan code");
    const user = await userStore.getUserById(currentUser(req).id);
    if (!user) throw notFound("Account not found");

    const reasons = [...(await residentReasons(user, db)), ...merchantRedeemReasons(merchant)];
    const ctx = await buildContext(user, merchant, db);
    const candidates = await offerStore.listActiveOffersForMerchant(merchant.id);
    const live: Offer[] = [];
    // Offers that exist but cannot be used right now, with the reason, so the
    // app can say "used today" rather than "nothing on".
    const unavailable: { id: string; title: string; reason: string }[] = [];
    for (const offer of candidates) {
      const reason = await offerBlockReason(offer, ctx, db);
      if (reason === null) live.push(offer);
      else unavailable.push({ id: offer.id, title: offer.title, reason });
    }

    res.json({
      merchant: merchantSummary(merchant),
      offers: live.map(stripMenuPdf),
      unavailable,
      loyalty: await loyaltySnapshot(merchant, user.id, db),
      canRedeem: reasons.length === 0,
      reasons,
    });
  }),
);

redemptionsRouter.post(
  "/api/redemptions",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const input = parseBody(scanRedeemSchema, req.body);
    const basketAmount = input.basketAmount ?? null;
    if (basketAmount !== null && (!Number.isFinite(basketAmount) || basketAmount < 0)) {
      throw badRequest("basketAmount must be a positive number");
    }

    const result = await db.transaction(async (tx) => {
      const user = await userStore.getUserById(currentUser(req).id, tx);
      if (!user) throw notFound("Account not found");
      const merchant = await merchantStore.getMerchantByScanCode(input.scanCode, tx);
      if (!merchant) throw notFound("Unknown scan code");
      const offer = await offerStore.getOfferForMerchant(input.offerId, merchant.id, tx);
      if (!offer || offer.archived || !offer.active) throw notFound("Offer not found");

      const userReasons = await residentReasons(user, tx);
      if (userReasons.length) throw forbidden(userReasons[0]);
      const merchantReasons = merchantRedeemReasons(merchant);
      if (merchantReasons.length) throw forbidden(merchantReasons[0]);

      const ctx = await buildContext(user, merchant, tx);
      const blocked = await offerBlockReason(offer, ctx, tx);
      if (blocked) throw new HttpError(400, blocked);

      const program = await activeProgram(merchant, tx);
      let pointsAwarded = 0;
      if (program) {
        const award = await awardPoints(program, merchant.id, user.id, basketAmount, { source: "redemption", offerId: offer.id }, tx);
        pointsAwarded = award.pointsAwarded;
      }

      const redemption = await redemptionStore.createRedemption(
        {
          offerId: offer.id,
          merchantId: merchant.id,
          userId: user.id,
          code: await uniqueRedemptionCode(tx),
          basketAmount: toNumericString(basketAmount),
          pointsAwarded,
        },
        tx,
      );
      await offerStore.incrementOfferUsage(offer.id, tx);
      return { redemption, offer, merchant, user };
    });

    res.status(201).json(await redemptionResponse(result.redemption, result.offer, result.merchant, result.user));
  }),
);

redemptionsRouter.get(
  "/api/redemptions/mine",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const rows = await redemptionStore.listRedemptionsForUser(currentUser(req).id);
    res.json(rows.map((r) => ({ ...r, basketAmount: toNumber(r.basketAmount) })));
  }),
);

redemptionsRouter.get(
  "/api/redemptions/:id",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) throw notFound("Redemption not found");
    const redemption = await redemptionStore.getRedemptionById(req.params.id);
    if (!redemption || redemption.userId !== currentUser(req).id) throw notFound("Redemption not found");
    const [offer, merchant, user] = await Promise.all([
      offerStore.getOfferById(redemption.offerId),
      merchantStore.getMerchantById(redemption.merchantId),
      userStore.getUserById(redemption.userId),
    ]);
    if (!offer || !merchant || !user) throw notFound("Redemption not found");
    res.json(await redemptionResponse(redemption, offer, merchant, user));
  }),
);

function parseDateParam(value: unknown, endOfDay: boolean): Date | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest("Invalid date");
  // A bare date for "to" should include the whole day.
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
  return date;
}

redemptionsRouter.get(
  "/api/merchant/redemptions",
  authenticate,
  requireRole("merchant"),
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    const rows = await redemptionStore.listRedemptionsForMerchant(merchantId, {
      from: parseDateParam(req.query.from, false),
      to: parseDateParam(req.query.to, true),
    });
    res.json(
      rows.map(({ userId, username, ...rest }) => ({
        ...rest,
        basketAmount: toNumber(rest.basketAmount),
        customerAlias: generateCustomerAlias({ id: userId, username }),
      })),
    );
  }),
);

redemptionsRouter.get(
  "/api/merchant/redemptions/summary",
  authenticate,
  requireRole("merchant"),
  asyncHandler(async (req, res) => {
    res.json(await redemptionStore.summariseRedemptionsForMerchant(currentMerchantId(req)));
  }),
);
