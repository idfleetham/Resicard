import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { updateMerchantSchema, insertOfferSchema, updateOfferSchema, offers, type Merchant } from "@shared/schema";
import { config } from "../config";
import { db } from "../db";
import * as userStore from "../storage/users";
import * as priceChangeStore from "../storage/price-changes";
import * as merchantStore from "../storage/merchants";
import * as offerStore from "../storage/offers";
import * as staffStore from "../storage/staff";
import { authenticate, requireRole, currentUser, currentMerchantId } from "../lib/auth";
import { asyncHandler, parseBody, notFound, forbidden, badRequest, toNumericString, HttpError } from "../lib/http";
import { scanUrl, qrDataUrl, posterHtml } from "../lib/qr";
import { uniqueScanCode } from "../lib/scan-code";
import { diffPriceFields } from "../lib/price-changes";
import { imageUpload, fileToDataUrl, uploadErrorHandler } from "../lib/uploads";
import {
  isStripeConfigured,
  createMerchantPlanCheckout,
  activateMerchantPlanForCheckout,
  deactivateMerchantPlan,
  changeMerchantPlanTier,
  cancelSubscription,
  trialDaysFor,
  merchantPlanFee,
} from "../lib/stripe";
import { hasEverPaid } from "../lib/ledger";
import { canGoLive, normalisePlan, planFeatures, planLimitMessage } from "../lib/plan";
import { assertIdentityAvailable } from "./auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BCRYPT_ROUNDS = 10;

const teamMemberSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  surname: z.string().min(1),
  staffPin: z.string().regex(/^\d{4,8}$/, "Staff PIN must be 4 to 8 digits"),
});

/*
  Till staff are not accounts. A name and a PIN is the whole record: no pub is
  going to create eight logins with eight email addresses for eight bar staff,
  and when the only way to get a PIN was to create one, nobody had a PIN and the
  till tool went unused.
*/
const PIN_RE = /^\d{4}$/;
const staffSchema = z.object({
  name: z.string().trim().min(1, "Give them a name").max(60),
  pin: z.string().regex(PIN_RE, "The PIN must be 4 digits"),
});
const staffUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  pin: z.string().regex(PIN_RE, "The PIN must be 4 digits").optional(),
  active: z.boolean().optional(),
});

/** Never returns the PIN, only whether one is set. */
function staffPublic(row: { id: string; name: string; active: boolean; createdAt: Date | null }) {
  return { id: row.id, name: row.name, active: row.active, createdAt: row.createdAt };
}

type OfferInput = z.infer<typeof updateOfferSchema>;
type OfferRow = Partial<typeof offers.$inferInsert>;

/** Maps validated offer input onto the row shape (numeric columns are strings in drizzle). */
function toOfferRow(input: OfferInput): OfferRow {
  const row: OfferRow = {};
  const copy = <K extends keyof OfferInput & keyof OfferRow>(key: K) => {
    if (input[key] !== undefined) (row as Record<string, unknown>)[key] = input[key];
  };
  (["title", "description", "shortPromo", "type", "category", "stackable", "newCustomerOnly", "terms", "dineInOnly",
    "excludesAlcohol", "imageUrl", "menuPdf", "priority", "active", "tags", "eligibleTiers", "daysOfWeek",
    "timeSlots", "blackoutDates", "validFrom", "validTo"] as const).forEach(copy);

  const int = (value: number | null | undefined) => (value === null || value === undefined ? null : Math.round(value));
  if (input.percentOff !== undefined) row.percentOff = int(input.percentOff);
  if (input.maxPerDay !== undefined) row.maxPerDay = int(input.maxPerDay);
  if (input.maxPerWeek !== undefined) row.maxPerWeek = int(input.maxPerWeek);
  if (input.maxLifetime !== undefined) row.maxLifetime = int(input.maxLifetime);
  if (input.globalUsageLimit !== undefined) row.globalUsageLimit = int(input.globalUsageLimit);
  if (input.fixedPrice !== undefined) row.fixedPrice = toNumericString(input.fixedPrice);
  if (input.originalValue !== undefined) row.originalValue = toNumericString(input.originalValue);
  if (input.typicalSpend !== undefined) row.typicalSpend = toNumericString(input.typicalSpend);
  if (input.itemValue !== undefined) row.itemValue = toNumericString(input.itemValue);
  if (input.minBasket !== undefined) row.minBasket = toNumericString(input.minBasket);
  if (input.maxDiscount !== undefined) row.maxDiscount = toNumericString(input.maxDiscount);
  if (row.validFrom === "") row.validFrom = null;
  if (row.validTo === "") row.validTo = null;
  if (row.validFrom && row.validTo && row.validFrom > row.validTo) throw badRequest("validTo must not be before validFrom");
  return row;
}

async function loadMerchant(merchantId: string): Promise<Merchant> {
  const merchant = await merchantStore.getMerchantById(merchantId);
  if (!merchant) throw notFound("Merchant not found");
  return merchant;
}

/** Throws 403 plan_limit when one more live offer would exceed the merchant's plan. */
async function assertCanGoLive(merchant: Merchant): Promise<void> {
  const liveCount = await offerStore.countLiveOffersForMerchant(merchant.id);
  if (canGoLive(merchant.planStatus, liveCount, config.freePlanLiveOfferLimit)) return;
  throw new HttpError(403, planLimitMessage(config.freePlanLiveOfferLimit), "plan_limit");
}

async function scanCodePayload(merchant: Merchant) {
  const url = scanUrl(merchant.scanCode);
  return { scanCode: merchant.scanCode, url, qrDataUrl: await qrDataUrl(url) };
}

export const merchantRouter = Router();
merchantRouter.use("/api/merchant", authenticate, requireRole("merchant"));

merchantRouter.get(
  "/api/merchant",
  asyncHandler(async (req, res) => {
    res.json(await loadMerchant(currentMerchantId(req)));
  }),
);

merchantRouter.put(
  "/api/merchant",
  asyncHandler(async (req, res) => {
    const input = parseBody(updateMerchantSchema, req.body);
    const values: Partial<Merchant> = { ...input };
    if (values.reservationUrl === "") values.reservationUrl = null;
    const merchant = await merchantStore.updateMerchant(currentMerchantId(req), values);
    if (!merchant) throw notFound("Merchant not found");
    res.json(merchant);
  }),
);

merchantRouter.post(
  "/api/merchant/logo",
  imageUpload.single("logo"),
  uploadErrorHandler,
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("No image uploaded (field name: logo)");
    const logoUrl = fileToDataUrl(req.file);
    await merchantStore.updateMerchant(currentMerchantId(req), { logoUrl });
    res.json({ logoUrl });
  }),
);

merchantRouter.get(
  "/api/merchant/scan-code",
  asyncHandler(async (req, res) => {
    res.json(await scanCodePayload(await loadMerchant(currentMerchantId(req))));
  }),
);

merchantRouter.post(
  "/api/merchant/scan-code/rotate",
  asyncHandler(async (req, res) => {
    const merchant = await merchantStore.updateMerchant(currentMerchantId(req), { scanCode: await uniqueScanCode() });
    if (!merchant) throw notFound("Merchant not found");
    res.json(await scanCodePayload(merchant));
  }),
);

merchantRouter.get(
  "/api/merchant/poster",
  asyncHandler(async (req, res) => {
    const merchant = await loadMerchant(currentMerchantId(req));
    const url = scanUrl(merchant.scanCode);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(posterHtml(merchant.name, await qrDataUrl(url), url));
  }),
);

// Offers

merchantRouter.get(
  "/api/merchant/offers",
  asyncHandler(async (req, res) => {
    res.json(await offerStore.listOffersForMerchant(currentMerchantId(req)));
  }),
);

merchantRouter.post(
  "/api/merchant/offers",
  asyncHandler(async (req, res) => {
    const input = parseBody(insertOfferSchema, req.body);
    const row = toOfferRow(input);
    const merchant = await loadMerchant(currentMerchantId(req));
    if (row.active !== false) await assertCanGoLive(merchant);
    const offer = await offerStore.createOffer({ ...row, title: input.title, merchantId: merchant.id });
    res.status(201).json(offer);
  }),
);

async function ownOffer(req: Parameters<typeof currentMerchantId>[0]) {
  if (!UUID_RE.test(req.params.id)) throw notFound("Offer not found");
  const offer = await offerStore.getOfferForMerchant(req.params.id, currentMerchantId(req));
  if (!offer) throw notFound("Offer not found");
  return offer;
}

merchantRouter.get(
  "/api/merchant/offers/:id",
  asyncHandler(async (req, res) => {
    res.json(await ownOffer(req));
  }),
);

merchantRouter.put(
  "/api/merchant/offers/:id",
  asyncHandler(async (req, res) => {
    const offer = await ownOffer(req);
    const input = parseBody(updateOfferSchema, req.body);
    const row = toOfferRow(input);
    if (row.active === true && !offer.active) await assertCanGoLive(await loadMerchant(currentMerchantId(req)));

    // The figures behind the offer are compared before the update overwrites
    // them, and the record is written with the update or not at all.
    const changes = diffPriceFields(offer, row, row.type ?? offer.type);
    const changedBy = currentUser(req).id;
    const updated = await db.transaction(async (tx) => {
      const saved = await offerStore.updateOffer(offer.id, row, tx);
      await priceChangeStore.insertPriceChanges(
        changes.map((c) => ({
          offerId: offer.id,
          merchantId: offer.merchantId,
          changedBy,
          field: c.field,
          oldValue: toNumericString(c.oldValue),
          newValue: toNumericString(c.newValue),
          direction: c.direction,
          inflatesSaving: c.inflatesSaving,
        })),
        tx,
      );
      return saved;
    });
    res.json(updated ?? offer);
  }),
);

merchantRouter.post(
  "/api/merchant/offers/:id/toggle",
  asyncHandler(async (req, res) => {
    const offer = await ownOffer(req);
    if (offer.archived) throw badRequest("Archived offers cannot be toggled");
    if (!offer.active) await assertCanGoLive(await loadMerchant(currentMerchantId(req)));
    res.json((await offerStore.updateOffer(offer.id, { active: !offer.active })) ?? offer);
  }),
);

merchantRouter.post(
  "/api/merchant/offers/:id/archive",
  asyncHandler(async (req, res) => {
    const offer = await ownOffer(req);
    res.json((await offerStore.updateOffer(offer.id, { archived: true, active: false })) ?? offer);
  }),
);

merchantRouter.post(
  "/api/merchant/offers/:id/image",
  imageUpload.single("image"),
  uploadErrorHandler,
  asyncHandler(async (req, res) => {
    const offer = await ownOffer(req);
    if (!req.file) throw badRequest("No image uploaded (field name: image)");
    const imageUrl = fileToDataUrl(req.file);
    await offerStore.updateOffer(offer.id, { imageUrl });
    res.json({ imageUrl });
  }),
);

// Plan

const PLAN_NAMES = { free: "Free", standard: "Standard", insight: "Insight" } as const;

/** All three tiers with their prices, so the client never hard-codes a fee. */
function planCatalogue() {
  return [
    { key: "free" as const, name: PLAN_NAMES.free, monthlyFee: 0 },
    { key: "standard" as const, name: PLAN_NAMES.standard, monthlyFee: config.merchantStandardMonthlyFeeGbp },
    { key: "insight" as const, name: PLAN_NAMES.insight, monthlyFee: config.merchantInsightMonthlyFeeGbp },
  ];
}

const targetPlanSchema = z.object({ plan: z.enum(["standard", "insight"]) });

async function planPayload(merchant: Merchant) {
  const plan = normalisePlan(merchant.planStatus);
  // In trial = on a paid plan but never charged; the trial ends when the plan next renews.
  const paidBefore = await hasEverPaid("merchant_premium", merchant.id);
  const inTrial = plan !== "free" && !paidBefore;
  return {
    planStatus: plan,
    planName: PLAN_NAMES[plan],
    planStartedAt: merchant.planStartedAt,
    planRenewsAt: merchant.planRenewsAt,
    inTrial,
    trialEndsAt: inTrial ? merchant.planRenewsAt : null,
    trialDaysAvailable: await trialDaysFor("merchant_premium", merchant.id),
    monthlyFee: plan === "free" ? 0 : merchantPlanFee(plan),
    plans: planCatalogue(),
    currency: "GBP",
    freeLiveOfferLimit: config.freePlanLiveOfferLimit,
    liveOfferCount: await offerStore.countLiveOffersForMerchant(merchant.id),
    features: planFeatures(plan),
  };
}

merchantRouter.get(
  "/api/merchant/plan",
  asyncHandler(async (req, res) => {
    res.json(await planPayload(await loadMerchant(currentMerchantId(req))));
  }),
);

merchantRouter.post(
  "/api/merchant/plan/checkout",
  asyncHandler(async (req, res) => {
    const merchant = await loadMerchant(currentMerchantId(req));
    const { plan } = parseBody(targetPlanSchema, req.body);
    const current = normalisePlan(merchant.planStatus);
    if (current === plan) throw badRequest(`You are already on ${PLAN_NAMES[plan]}`);

    // Already paying, either way up or down: the card is on file, so the tier changes in
    // place rather than through checkout. Insight to Standard therefore only takes
    // analytics away; the loyalty programme and every live offer carry on.
    if (current !== "free") {
      const updated = await changeMerchantPlanTier(merchant, plan);
      res.json(await planPayload(updated ?? merchant));
      return;
    }

    if (isStripeConfigured()) {
      const owner = await userStore.getUserById(merchant.ownerUserId);
      res.json({ url: await createMerchantPlanCheckout(merchant, owner?.email ?? merchant.email ?? "", plan) });
      return;
    }
    await activateMerchantPlanForCheckout(merchant, plan);
    res.json({ activated: true, planStatus: plan });
  }),
);

merchantRouter.post(
  "/api/merchant/plan/cancel",
  asyncHandler(async (req, res) => {
    const merchant = await loadMerchant(currentMerchantId(req));
    await cancelSubscription(merchant.stripeSubscriptionId);
    const result = await deactivateMerchantPlan(merchant, merchant.stripeSubscriptionId ? "stripe" : "dev", "cancelled");
    res.json({ planStatus: normalisePlan(result.merchant.planStatus), pausedOffers: result.pausedOffers });
  }),
);

// Till staff (no login)

merchantRouter.get(
  "/api/merchant/staff",
  asyncHandler(async (req, res) => {
    res.json((await staffStore.listStaff(currentMerchantId(req))).map(staffPublic));
  }),
);

merchantRouter.post(
  "/api/merchant/staff",
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    const input = parseBody(staffSchema, req.body);
    const row = await staffStore.createStaff({
      merchantId,
      name: input.name,
      pin: await bcrypt.hash(input.pin, BCRYPT_ROUNDS),
    });
    res.status(201).json(staffPublic(row));
  }),
);

merchantRouter.put(
  "/api/merchant/staff/:id",
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    if (!UUID_RE.test(req.params.id)) throw notFound("Staff member not found");
    const existing = await staffStore.getStaff(req.params.id, merchantId);
    if (!existing) throw notFound("Staff member not found");
    const input = parseBody(staffUpdateSchema, req.body);
    const row = await staffStore.updateStaff(existing.id, {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.active === undefined ? {} : { active: input.active }),
      ...(input.pin === undefined ? {} : { pin: await bcrypt.hash(input.pin, BCRYPT_ROUNDS) }),
    });
    res.json(staffPublic(row ?? existing));
  }),
);

merchantRouter.delete(
  "/api/merchant/staff/:id",
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    if (!UUID_RE.test(req.params.id)) throw notFound("Staff member not found");
    const existing = await staffStore.getStaff(req.params.id, merchantId);
    if (!existing) throw notFound("Staff member not found");
    await staffStore.deleteStaff(existing.id);
    res.json({ ok: true });
  }),
);

// Portal logins

merchantRouter.get(
  "/api/merchant/team",
  asyncHandler(async (req, res) => {
    const merchant = await loadMerchant(currentMerchantId(req));
    const staff = await userStore.listUsersByMerchant(merchant.id);
    res.json(
      staff.map((u) => ({
        id: u.id,
        username: u.username,
        firstName: u.firstName,
        surname: u.surname,
        hasPin: Boolean(u.staffPin),
        isOwner: u.id === merchant.ownerUserId,
      })),
    );
  }),
);

merchantRouter.post(
  "/api/merchant/team",
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    const input = parseBody(teamMemberSchema, req.body);
    await assertIdentityAvailable(input.email, input.username);
    const user = await userStore.createUser({
      username: input.username,
      email: input.email.toLowerCase(),
      password: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      firstName: input.firstName,
      surname: input.surname,
      role: "merchant",
      merchantId,
      staffPin: await bcrypt.hash(input.staffPin, BCRYPT_ROUNDS),
    });
    res.status(201).json({ id: user.id, username: user.username, firstName: user.firstName, surname: user.surname, hasPin: true, isOwner: false });
  }),
);

merchantRouter.delete(
  "/api/merchant/team/:userId",
  asyncHandler(async (req, res) => {
    const merchant = await loadMerchant(currentMerchantId(req));
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) throw notFound("Team member not found");
    if (userId === merchant.ownerUserId) throw forbidden("The owner cannot be removed");
    if (userId === currentUser(req).id) throw forbidden("You cannot remove yourself");
    const target = await userStore.getUserById(userId);
    if (!target || target.merchantId !== merchant.id) throw notFound("Team member not found");
    await userStore.deleteUser(userId);
    res.json({ ok: true });
  }),
);
