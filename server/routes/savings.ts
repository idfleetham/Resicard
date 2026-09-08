import { Router } from "express";
import * as redemptionStore from "../storage/redemptions";
import * as ledgerStore from "../storage/ledger";
import { authenticate, requireRole, currentUser } from "../lib/auth";
import { asyncHandler, toNumber } from "../lib/http";
import { summariseSavings, type SavedRow } from "../lib/savings";

const TOP_LIMIT = 3;

export const savingsRouter = Router();

/**
 * What this resident has saved: a total, a month-by-month series for the chart,
 * and what they have paid in membership so the two can be set against each other.
 *
 * Every figure here is a floor. Redemptions with nothing to estimate from are
 * counted in `uncounted` and contribute nothing to the total.
 */
savingsRouter.get(
  "/api/savings/mine",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const userId = currentUser(req).id;
    const [rows, top, paid] = await Promise.all([
      redemptionStore.listSavingsForUser(userId),
      redemptionStore.listTopSavingsForUser(userId, TOP_LIMIT),
      ledgerStore.sumPaidForSubject("resident_membership", String(userId)),
    ]);

    const parsed: SavedRow[] = rows.map((r) => ({
      savedAmount: r.savedAmount === null ? null : toNumber(r.savedAmount),
      savedEstimated: r.savedEstimated !== false,
      redeemedAt: r.redeemedAt,
    }));

    const summary = summariseSavings(parsed);

    res.json({
      currency: "GBP",
      ...summary,
      membershipPaid: Math.round(paid * 100) / 100,
      // Positive once the savings have covered what they have paid.
      aheadBy: Math.round((summary.total - paid) * 100) / 100,
      top: top
        .filter((t) => t.savedAmount !== null)
        .map((t) => ({
          id: t.id,
          amount: toNumber(t.savedAmount),
          at: t.redeemedAt,
          offerTitle: t.offerTitle,
          merchantId: t.merchantId,
          merchantName: t.merchantName,
        })),
    });
  }),
);
