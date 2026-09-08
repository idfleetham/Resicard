import { Router } from "express";
import { config } from "../config";
import * as userStore from "../storage/users";
import * as merchantStore from "../storage/merchants";
import * as ledgerStore from "../storage/ledger";
import { authenticate, requireRole } from "../lib/auth";
import { asyncHandler } from "../lib/http";
import { householdFeeGbp } from "../lib/membership";
import { residentSubjectName } from "../lib/ledger";
import { buildRevenueReport, eventsToCsv, monthKeyOffset, type Fees, type MerchantLike, type ResidentLike } from "../lib/revenue";

/** Admin revenue: the current position, ledger history, renewal cliffs and the forecast schedule. */
export const adminRevenueRouter = Router();
adminRevenueRouter.use("/api/admin/revenue", authenticate, requireRole("admin"));

function fees(): Fees {
  return {
    individual: config.residentAnnualFeeGbp,
    household: householdFeeGbp(config.residentAnnualFeeGbp),
    merchantStandardMonthly: config.merchantStandardMonthlyFeeGbp,
    merchantInsightMonthly: config.merchantInsightMonthlyFeeGbp,
  };
}

async function loadSubjects(): Promise<{ residents: ResidentLike[]; merchants: MerchantLike[] }> {
  const [users, merchantRows] = await Promise.all([userStore.listUsers("resident"), merchantStore.listMerchantsForAdmin(undefined)]);
  const residents: ResidentLike[] = users.map((u) => ({
    id: u.id,
    name: residentSubjectName(u),
    membershipPlan: u.membershipPlan,
    membershipStatus: u.membershipStatus,
    membershipExpiry: u.membershipExpiry,
    membershipRenews: u.membershipRenews,
    householdPrimaryId: u.householdPrimaryId,
  }));
  const merchants: MerchantLike[] = merchantRows.map(({ merchant: m }) => ({
    id: m.id,
    name: m.name,
    status: m.status,
    planStatus: m.planStatus,
    planStartedAt: m.planStartedAt,
    planRenewsAt: m.planRenewsAt,
  }));
  return { residents, merchants };
}

adminRevenueRouter.get(
  "/api/admin/revenue",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    // Everything from the first day of the month 11 months ago (Europe/London) covers the 12-month history.
    const since = new Date(`${monthKeyOffset(now, -11)}-01T00:00:00Z`);
    since.setDate(since.getDate() - 1);
    const [events, { residents, merchants }] = await Promise.all([ledgerStore.listSubscriptionEventsSince(since), loadSubjects()]);
    res.json(buildRevenueReport(events, residents, merchants, fees(), now));
  }),
);

function parseLimit(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return 200;
  return Math.min(n, 1000);
}

adminRevenueRouter.get(
  "/api/admin/revenue/events",
  asyncHandler(async (req, res) => {
    const rows = await ledgerStore.listSubscriptionEvents(parseLimit(req.query.limit));
    res.json(rows.map((r) => ({ ...r, amountGbp: Number(r.amountGbp ?? 0) })));
  }),
);

adminRevenueRouter.get(
  "/api/admin/revenue/export.csv",
  asyncHandler(async (req, res) => {
    const rows = await ledgerStore.listSubscriptionEvents(parseLimit(req.query.limit ?? 1000));
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="resicard-revenue-${stamp}.csv"`);
    res.send(eventsToCsv(rows));
  }),
);
