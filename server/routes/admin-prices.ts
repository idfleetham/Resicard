import { Router } from "express";
import * as priceChangeStore from "../storage/price-changes";
import { authenticate, requireRole } from "../lib/auth";
import { asyncHandler } from "../lib/http";
import { percentMove } from "../lib/price-changes";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_DAYS = 180;
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

/**
 * Admin price change audit: what merchants changed on the figures behind their
 * offers. A record, read by a person, not a rule that acts on anything.
 */
export const adminPricesRouter = Router();
adminPricesRouter.use("/api/admin/price-changes", authenticate, requireRole("admin"));

function positiveInt(value: unknown, fallback: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

adminPricesRouter.get(
  "/api/admin/price-changes",
  asyncHandler(async (req, res) => {
    const days = positiveInt(req.query.days, DEFAULT_DAYS, 3650);
    const limit = positiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const merchantId = typeof req.query.merchantId === "string" && UUID_RE.test(req.query.merchantId) ? req.query.merchantId : undefined;
    const flaggedOnly = req.query.flaggedOnly === "true";
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // The summary covers the whole window whether or not the table is filtered,
    // so turning the toggle off does not change what the lines above it say.
    const [rows, summary] = await Promise.all([
      priceChangeStore.listPriceChanges({ since, merchantId, flaggedOnly }, limit),
      priceChangeStore.summarisePriceChanges({ since, merchantId }),
    ]);

    res.json({
      items: rows.map((r) => ({
        id: r.id,
        changedAt: r.changedAt,
        field: r.field,
        oldValue: r.oldValue,
        newValue: r.newValue,
        direction: r.direction,
        inflatesSaving: r.inflatesSaving,
        percentMove: percentMove(r.oldValue, r.newValue),
        offer: { id: r.offerId, title: r.offerTitle, type: r.offerType },
        merchant: { id: r.merchantId, name: r.merchantName },
        changedBy: r.changedById === null ? null : { id: r.changedById, username: r.changedByUsername },
      })),
      summary: {
        merchants: summary.map((m) => ({
          merchantId: m.merchantId,
          name: m.name,
          flaggedChanges: m.flaggedChanges,
          largestMovePercent: m.largestMovePercent ?? null,
        })),
      },
    });
  }),
);
