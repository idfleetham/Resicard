/** Shapes returned by GET /api/admin/revenue and /api/admin/revenue/events (see docs/API.md). */

export interface RevenueFees {
  individual: number;
  household: number;
  merchantPremiumMonthly: number;
}

export interface HistoryMonth {
  month: string;
  residents: number;
  merchants: number;
  total: number;
  newResidents: number;
  renewedResidents: number;
  cancelledResidents: number;
  newMerchants: number;
  cancelledMerchants: number;
}

export interface ResidentCliff { month: string; count: number; individual: number; household: number; amount: number; notRenewing: number }
export interface MerchantCliff { month: string; count: number; amount: number }

export interface UpcomingRenewal {
  kind: "resident_membership" | "merchant_premium";
  subjectId: string;
  name: string;
  plan: "individual" | "household" | "premium";
  expiresAt: string;
  amount: number;
}

export interface RevenueReport {
  fees: RevenueFees;
  now: {
    residents: { active: number; individual: number; household: number; cancelled: number; notRenewing: number; expiringIn30Days: number };
    merchants: { premium: number; free: number; approved: number };
    runRate: { monthly: number; annual: number };
  };
  history: HistoryMonth[];
  cliffs: { residents: ResidentCliff[]; merchants: MerchantCliff[]; next30Days: UpcomingRenewal[] };
  schedule: {
    residentExpiries: { month: string; individual: number; household: number }[];
    premiumMerchants: number;
    activeIndividual: number;
    activeHousehold: number;
  };
}

export interface LedgerEvent {
  id: string;
  kind: "resident_membership" | "merchant_premium";
  subjectId: string;
  subjectName: string | null;
  plan: string | null;
  action: "started" | "renewed" | "cancelled" | "lapsed";
  amountGbp: number;
  periodStart: string | null;
  periodEnd: string | null;
  source: "stripe" | "dev" | "admin" | "backfill" | null;
  createdAt: string;
}

/** £1,234 with no pence unless they are non-zero. */
export function pounds(value: number | string | null | undefined): string {
  const n = Number(value ?? 0) || 0;
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(n);
}

/** "Sep 2026" from "2026-09". */
export function monthLabel(month: string, withYear = true): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("en-GB", { month: "short", year: withYear ? "numeric" : undefined, timeZone: "UTC" });
}
