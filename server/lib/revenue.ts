import type { SubscriptionEvent } from "@shared/schema";
import { normalisePlan, planFeeGbp, type PlanStatus } from "./plan";

/**
 * Pure aggregation for the admin revenue screen. Every function takes plain
 * arrays and a clock and returns the shapes documented in docs/API.md
 * ("Revenue (admin)"). No database access, so it is unit tested directly.
 *
 * Month keys are "YYYY-MM" in Europe/London.
 */

export interface Fees {
  individual: number;
  household: number;
  merchantStandardMonthly: number;
  merchantInsightMonthly: number;
}

/** The subset of a users row the revenue maths needs. */
export interface ResidentLike {
  id: number;
  name: string;
  membershipPlan: string | null;
  membershipStatus: string | null;
  membershipExpiry: Date | null;
  /** False once the resident has scheduled a downgrade to Free at expiry. */
  membershipRenews?: boolean | null;
  householdPrimaryId: number | null;
}

/** The subset of a merchants row the revenue maths needs. */
export interface MerchantLike {
  id: string;
  name: string;
  status: string | null;
  planStatus: string | null;
  planStartedAt: Date | null;
  planRenewsAt: Date | null;
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

/** `notRenewing` is the part of `count` that has a downgrade scheduled (still an expiry in the month). */
export interface ResidentCliff { month: string; count: number; individual: number; household: number; amount: number; notRenewing: number }
export interface MerchantCliff { month: string; count: number; amount: number }
export interface UpcomingRenewal {
  kind: "resident_membership" | "merchant_premium";
  subjectId: string;
  name: string;
  plan: "individual" | "household" | "standard" | "insight";
  expiresAt: string;
  amount: number;
}

const LONDON_MONTH = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit" });

/** "YYYY-MM" for a date, in Europe/London. */
export function monthKey(date: Date): string {
  const parts = LONDON_MONTH.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "00";
  return `${year}-${month}`;
}

/** The month key `offset` months after the month containing `from`. */
export function monthKeyOffset(from: Date, offset: number): string {
  const [y, m] = monthKey(from).split("-").map(Number);
  const total = y * 12 + (m - 1) + offset;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** The same day-of-month `months` later, clamped to the last day of the target month (31 Jan + 1 = 28/29 Feb). */
export function addMonthsClamped(from: Date, months: number): Date {
  const day = from.getDate();
  const target = new Date(from);
  target.setDate(1);
  target.setMonth(target.getMonth() + months);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

/** The number of whole months to add to `start` for its first anniversary strictly after `now`. */
export function monthsToNextAnniversary(start: Date, now: Date): number {
  for (let n = 0; n < 600; n++) {
    if (addMonthsClamped(start, n).getTime() > now.getTime()) return n;
  }
  return 600;
}

/** The next monthly anniversary of `start` strictly after `now`. */
export function nextAnniversary(start: Date, now: Date): Date {
  return addMonthsClamped(start, monthsToNextAnniversary(start, now));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toPlan(value: string | null): "individual" | "household" {
  return value === "household" ? "household" : "individual";
}

function notRenewing(r: ResidentLike): boolean {
  return r.membershipRenews === false;
}

function residentFee(plan: "individual" | "household", fees: Fees): number {
  return plan === "household" ? fees.household : fees.individual;
}

/**
 * The residents who pay: active, unexpired, and not the second adult of a household
 * (a household is one payer, the primary).
 */
export function payingResidents(residents: ResidentLike[], now: Date): ResidentLike[] {
  return residents.filter(
    (r) => r.membershipStatus === "active" && !r.householdPrimaryId && r.membershipExpiry !== null && r.membershipExpiry.getTime() > now.getTime(),
  );
}

/** Merchants on a paid tier. Legacy "premium" rows read as Standard, so they still count. */
export function payingMerchants(merchants: MerchantLike[]): MerchantLike[] {
  return merchants.filter((m) => normalisePlan(m.planStatus) !== "free");
}

/** What this merchant pays each month at current fees; the tier decides, not one constant. */
export function merchantMonthlyFee(merchant: MerchantLike, fees: Fees): number {
  return planFeeGbp(merchant.planStatus, { standard: fees.merchantStandardMonthly, insight: fees.merchantInsightMonthly });
}

/** Last 12 months of ledger amounts collected, oldest first, every month present. */
export function buildHistory(events: SubscriptionEvent[], now: Date, months = 12): HistoryMonth[] {
  const byMonth = new Map<string, HistoryMonth>();
  for (let i = months - 1; i >= 0; i--) {
    const month = monthKeyOffset(now, -i);
    byMonth.set(month, { month, residents: 0, merchants: 0, total: 0, newResidents: 0, renewedResidents: 0, cancelledResidents: 0, newMerchants: 0, cancelledMerchants: 0 });
  }
  for (const e of events) {
    if (!e.createdAt) continue;
    const bucket = byMonth.get(monthKey(e.createdAt));
    if (!bucket) continue;
    const amount = Number(e.amountGbp ?? 0) || 0;
    const paid = e.action === "started" || e.action === "renewed";
    if (e.kind === "resident_membership") {
      if (paid) bucket.residents = round2(bucket.residents + amount);
      if (e.action === "started") bucket.newResidents++;
      if (e.action === "renewed") bucket.renewedResidents++;
      if (e.action === "cancelled" || e.action === "lapsed") bucket.cancelledResidents++;
    } else {
      if (paid) bucket.merchants = round2(bucket.merchants + amount);
      if (e.action === "started") bucket.newMerchants++;
      if (e.action === "cancelled" || e.action === "lapsed") bucket.cancelledMerchants++;
    }
    bucket.total = round2(bucket.residents + bucket.merchants);
  }
  return Array.from(byMonth.values());
}

/** Memberships expiring in each of the next `months` months (amount = renewal value at current fees). */
export function buildResidentCliffs(residents: ResidentLike[], fees: Fees, now: Date, months = 12): ResidentCliff[] {
  const byMonth = new Map<string, ResidentCliff>();
  for (let i = 0; i < months; i++) {
    const month = monthKeyOffset(now, i);
    byMonth.set(month, { month, count: 0, individual: 0, household: 0, amount: 0, notRenewing: 0 });
  }
  for (const r of payingResidents(residents, now)) {
    const bucket = byMonth.get(monthKey(r.membershipExpiry as Date));
    if (!bucket) continue;
    const plan = toPlan(r.membershipPlan);
    bucket.count++;
    bucket[plan]++;
    if (notRenewing(r)) bucket.notRenewing++;
    bucket.amount = round2(bucket.amount + residentFee(plan, fees));
  }
  return Array.from(byMonth.values());
}

/**
 * A paying merchant's renewal dates from now: planRenewsAt (then its monthly
 * anniversaries) or the monthly anniversary of planStartedAt. Each date is derived
 * from the original anchor so a 31st clamps per month rather than drifting.
 */
export function merchantRenewalDates(merchant: MerchantLike, now: Date, months: number): Date[] {
  const anchor = merchant.planRenewsAt ?? merchant.planStartedAt ?? now;
  const start = monthsToNextAnniversary(anchor, now);
  const dates: Date[] = [];
  const horizon = monthKeyOffset(now, months - 1);
  for (let n = start; n < start + months + 1; n++) {
    const d = addMonthsClamped(anchor, n);
    if (monthKey(d) > horizon) break;
    dates.push(d);
  }
  return dates;
}

/** Paid plans due to renew in each of the next `months` months, valued at each merchant's own fee. */
export function buildMerchantCliffs(merchants: MerchantLike[], fees: Fees, now: Date, months = 12): MerchantCliff[] {
  const byMonth = new Map<string, MerchantCliff>();
  for (let i = 0; i < months; i++) {
    const month = monthKeyOffset(now, i);
    byMonth.set(month, { month, count: 0, amount: 0 });
  }
  for (const m of payingMerchants(merchants)) {
    const fee = merchantMonthlyFee(m, fees);
    for (const d of merchantRenewalDates(m, now, months)) {
      const bucket = byMonth.get(monthKey(d));
      if (!bucket) continue;
      bucket.count++;
      bucket.amount = round2(bucket.amount + fee);
    }
  }
  return Array.from(byMonth.values());
}

/** Everything due to renew within 30 days, soonest first. */
export function buildNext30Days(residents: ResidentLike[], merchants: MerchantLike[], fees: Fees, now: Date): UpcomingRenewal[] {
  const limit = now.getTime() + 30 * 24 * 60 * 60 * 1000;
  const out: UpcomingRenewal[] = [];
  for (const r of payingResidents(residents, now)) {
    const expiry = r.membershipExpiry as Date;
    if (expiry.getTime() > limit) continue;
    const plan = toPlan(r.membershipPlan);
    out.push({ kind: "resident_membership", subjectId: String(r.id), name: r.name, plan, expiresAt: expiry.toISOString(), amount: residentFee(plan, fees) });
  }
  for (const m of payingMerchants(merchants)) {
    const next = merchantRenewalDates(m, now, 2)[0];
    if (!next || next.getTime() > limit) continue;
    const plan = normalisePlan(m.planStatus) as Exclude<PlanStatus, "free">;
    out.push({ kind: "merchant_premium", subjectId: m.id, name: m.name, plan, expiresAt: next.toISOString(), amount: merchantMonthlyFee(m, fees) });
  }
  return out.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

export function buildNow(residents: ResidentLike[], merchants: MerchantLike[], fees: Fees, now: Date) {
  const paying = payingResidents(residents, now);
  const individual = paying.filter((r) => toPlan(r.membershipPlan) === "individual").length;
  const household = paying.length - individual;
  const cancelled = residents.filter((r) => r.membershipStatus === "cancelled" && !r.householdPrimaryId).length;
  const notRenewingCount = paying.filter(notRenewing).length;
  const expiringIn30Days = buildNext30Days(residents, [], fees, now).length;
  const payingMerchantRows = payingMerchants(merchants);
  const standard = payingMerchantRows.filter((m) => normalisePlan(m.planStatus) === "standard").length;
  const insight = payingMerchantRows.length - standard;
  const approved = merchants.filter((m) => m.status === "approved").length;
  const free = merchants.filter((m) => m.status === "approved" && normalisePlan(m.planStatus) === "free").length;
  const merchantMonthly = payingMerchantRows.reduce((sum, m) => sum + merchantMonthlyFee(m, fees), 0);
  const monthly = round2(merchantMonthly + (individual * fees.individual + household * fees.household) / 12);
  return {
    residents: { active: paying.length, individual, household, cancelled, notRenewing: notRenewingCount, expiringIn30Days },
    merchants: { paying: payingMerchantRows.length, standard, insight, free, approved },
    runRate: { monthly, annual: round2(monthly * 12) },
  };
}

export function buildSchedule(residents: ResidentLike[], merchants: MerchantLike[], fees: Fees, now: Date) {
  const cliffs = buildResidentCliffs(residents, fees, now, 24);
  const current = buildNow(residents, merchants, fees, now);
  return {
    residentExpiries: cliffs.map((c) => ({ month: c.month, individual: c.individual, household: c.household })),
    payingMerchants: current.merchants.paying,
    // The forecast values future merchants at one price, so it uses the average of what is paid today.
    merchantAverageMonthly: current.merchants.paying > 0 ? round2(payingMerchants(merchants).reduce((s, m) => s + merchantMonthlyFee(m, fees), 0) / current.merchants.paying) : fees.merchantStandardMonthly,
    activeIndividual: current.residents.individual,
    activeHousehold: current.residents.household,
  };
}

export function buildRevenueReport(events: SubscriptionEvent[], residents: ResidentLike[], merchants: MerchantLike[], fees: Fees, now: Date) {
  return {
    fees,
    now: buildNow(residents, merchants, fees, now),
    history: buildHistory(events, now),
    cliffs: {
      residents: buildResidentCliffs(residents, fees, now),
      merchants: buildMerchantCliffs(merchants, fees, now),
      next30Days: buildNext30Days(residents, merchants, fees, now),
    },
    schedule: buildSchedule(residents, merchants, fees, now),
  };
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** kind,subject,plan,action,amount,period_start,period_end,source,created_at */
export function eventsToCsv(events: SubscriptionEvent[]): string {
  const lines = ["kind,subject,plan,action,amount,period_start,period_end,source,created_at"];
  for (const e of events) {
    lines.push(
      [e.kind, e.subjectName ?? e.subjectId, e.plan, e.action, e.amountGbp, e.periodStart, e.periodEnd, e.source, e.createdAt].map(csvCell).join(","),
    );
  }
  return lines.join("\n") + "\n";
}
