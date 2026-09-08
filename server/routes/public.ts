import { config } from "../config";
import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { users, merchants, type Offer } from "@shared/schema";
import * as merchantStore from "../storage/merchants";
import * as offerStore from "../storage/offers";
import * as userStore from "../storage/users";
import { asyncHandler, notFound, badRequest } from "../lib/http";
import { householdFeeGbp } from "../lib/membership";
import { dataUrlToBuffer } from "../lib/uploads";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Offers are listed without the (large) PDF body; a flag says whether one exists. */
export function stripMenuPdf(offer: Offer): Omit<Offer, "menuPdf"> & { hasMenuPdf: boolean } {
  const { menuPdf, ...rest } = offer;
  return { ...rest, hasMenuPdf: Boolean(menuPdf) };
}

export const publicRouter = Router();

publicRouter.get(
  "/api/merchants",
  asyncHandler(async (_req, res) => {
    res.json(await merchantStore.listApprovedMerchantsWithOfferCount());
  }),
);

publicRouter.get(
  "/api/offers",
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === "string" && req.query.category ? req.query.category : undefined;
    const merchantId = typeof req.query.merchantId === "string" && req.query.merchantId ? req.query.merchantId : undefined;
    if (merchantId && !UUID_RE.test(merchantId)) throw badRequest("merchantId must be a UUID");
    const rows = await offerStore.listPublicOffers({ category, merchantId });
    res.json(rows.map((row) => ({ ...stripMenuPdf(row.offer), merchant: row.merchant })));
  }),
);

publicRouter.get(
  "/api/offers/:id",
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) throw notFound("Offer not found");
    const row = await offerStore.getOfferWithMerchant(req.params.id);
    if (!row || row.offer.archived) throw notFound("Offer not found");
    res.json({ ...stripMenuPdf(row.offer), merchant: row.merchant });
  }),
);

publicRouter.get(
  "/api/offers/:id/menu-pdf",
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) throw notFound("Offer not found");
    const offer = await offerStore.getOfferById(req.params.id);
    if (!offer || !offer.menuPdf) throw notFound("No menu PDF for this offer");
    const parsed = dataUrlToBuffer(offer.menuPdf);
    if (!parsed) throw notFound("Menu PDF is not readable");
    res.setHeader("Content-Type", parsed.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="menu-${offer.id}.pdf"`);
    res.send(parsed.buffer);
  }),
);

/**
 * The public counter: residents with a current membership and approved outlets.
 * Both figures are withheld together until each clears `publicCounterMinimum`,
 * because "34 residents and 6 outlets" is an argument against joining and the
 * client cannot be trusted to make that judgement for us.
 */
publicRouter.get(
  "/api/stats",
  asyncHandler(async (_req, res) => {
    const [residents, merchantCount] = await Promise.all([
      userStore.countUsersWhere(and(eq(users.role, "resident"), eq(users.membershipStatus, "active"))),
      merchantStore.countMerchantsWhere(eq(merchants.status, "approved")),
    ]);
    const visible = residents >= config.publicCounterMinimum && merchantCount >= config.publicCounterMinimum;
    res.json({ town: config.townName, residents, merchants: merchantCount, visible });
  }),
);

/** Everything the public pricing page needs, so no fee is ever hardcoded in the client. */
publicRouter.get("/api/pricing", (_req, res) => {
  res.json({
    townName: config.townName,
    currency: "GBP",
    freeTrialDays: config.freeTrialDays,
    resident: {
      individual: config.residentAnnualFeeGbp,
      household: householdFeeGbp(config.residentAnnualFeeGbp),
    },
    merchant: {
      freeLiveOfferLimit: config.freePlanLiveOfferLimit,
      standardMonthly: config.merchantStandardMonthlyFeeGbp,
      insightMonthly: config.merchantInsightMonthlyFeeGbp,
      // Kept for one release for clients still asking for the old single price.
      premiumMonthly: config.merchantStandardMonthlyFeeGbp,
    },
  });
});

publicRouter.get("/api/placeholder/:w/:h", (req, res) => {
  const w = Math.min(Math.max(Number(req.params.w) || 300, 1), 2000);
  const h = Math.min(Math.max(Number(req.params.h) || 200, 1), 2000);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="100%" height="100%" fill="#e5e7eb"/>
<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${Math.max(12, Math.round(Math.min(w, h) / 8))}" fill="#6b7280">${w} x ${h}</text>
</svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(svg);
});
