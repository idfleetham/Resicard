/**
 * Estimating what a resident saved on a redemption.
 *
 * The figure is deliberately a floor, not a best guess. Where we have a real
 * bill we use it; where we only have a merchant's indicative figure we use that
 * and mark the result as an estimate; where we have neither we record nothing
 * rather than inventing a number. A resident who works out that the headline is
 * padded stops believing the rest of the app, so understating is the safe error.
 *
 * The result is written onto the redemption row at redemption time, so a
 * merchant editing an offer months later cannot rewrite anyone's history.
 *
 * Pure: no database access, no clock.
 */

import type { OfferType } from "@shared/schema";

/** The offer fields the estimate needs. Numerics may arrive as strings from Drizzle. */
export interface SavingOffer {
  type: OfferType | null;
  percentOff: number | null;
  fixedPrice: string | number | null;
  originalValue: string | number | null;
  typicalSpend: string | number | null;
  itemValue: string | number | null;
  maxDiscount: string | number | null;
}

export interface SavingEstimate {
  /** Pounds saved, rounded to the penny, or null when nothing could be derived. */
  amount: number | null;
  /** True when the figure rests on an indicative amount rather than a real bill. */
  estimated: boolean;
}

const NOTHING: SavingEstimate = { amount: null, estimated: true };

function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pennies(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * What the resident saved on one redemption.
 *
 * `basketAmount` is the real bill when staff keyed one in at the till. When it
 * is present a percentage saving is exact rather than estimated.
 */
export function estimateSaving(offer: SavingOffer, basketAmount: number | null = null): SavingEstimate {
  const bill = num(basketAmount);
  const cap = num(offer.maxDiscount);

  const capped = (amount: number, estimated: boolean): SavingEstimate => {
    let value = amount;
    if (cap !== null) value = Math.min(value, cap);
    // Never claim to have saved more than the bill itself.
    if (bill !== null) value = Math.min(value, bill);
    return value > 0 ? { amount: pennies(value), estimated } : NOTHING;
  };

  switch (offer.type) {
    case "percentage_discount":
    case "off_peak": {
      const percent = offer.percentOff;
      if (!percent || percent <= 0) return NOTHING;
      const base = bill ?? num(offer.typicalSpend);
      if (base === null) return NOTHING;
      return capped((base * percent) / 100, bill === null);
    }

    case "fixed_amount_discount": {
      // "Amount off" is stored in fixedPrice, and is the saving itself.
      const off = num(offer.fixedPrice);
      return off === null ? NOTHING : capped(off, false);
    }

    case "fixed_price":
    case "set_menu": {
      const price = num(offer.fixedPrice);
      const usual = num(offer.originalValue);
      if (price === null || usual === null || usual <= price) return NOTHING;
      return capped(usual - price, false);
    }

    case "bogo": {
      // Two for one: the second item is free, so the saving is one item.
      const item = num(offer.itemValue);
      return item === null ? NOTHING : capped(item, true);
    }

    case "free_item_with_purchase":
    case "loyalty_reward": {
      const item = num(offer.itemValue);
      return item === null ? NOTHING : capped(item, true);
    }

    default:
      return NOTHING;
  }
}

/** True when this offer type needs an indicative figure before it can be counted. */
export function needsIndicativeValue(type: OfferType | null): "typicalSpend" | "itemValue" | null {
  switch (type) {
    case "percentage_discount":
    case "off_peak":
      return "typicalSpend";
    case "bogo":
    case "free_item_with_purchase":
    case "loyalty_reward":
      return "itemValue";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Aggregation for the resident's savings panel
// ---------------------------------------------------------------------------

export interface SavedRow {
  savedAmount: number | null;
  savedEstimated: boolean;
  redeemedAt: Date | null;
}

export interface MonthPoint {
  /** "2026-03" */
  month: string;
  amount: number;
  count: number;
}

export interface SavingsSummary {
  /** Total pounds saved across every redemption that had a figure. */
  total: number;
  /** Redemptions counted towards the total. */
  counted: number;
  /** Redemptions with no figure at all, so the total is a floor. */
  uncounted: number;
  /** How much of the total rests on indicative figures rather than real bills. */
  estimatedPortion: number;
  /** Oldest month first, one entry per calendar month with no gaps. */
  months: MonthPoint[];
  /** Mean per active month, counting the first month with a saving onwards. */
  averageMonthly: number;
  /** ISO date of the first counted redemption, or null. */
  firstAt: string | null;
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function addMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/**
 * Rolls redemption rows up into a total and a month-by-month series.
 *
 * Months with no redemptions are filled with zero so the chart shows the quiet
 * months honestly instead of closing the gap.
 */
export function summariseSavings(rows: SavedRow[], now: Date = new Date()): SavingsSummary {
  const counted = rows.filter((r) => r.savedAmount !== null && r.savedAmount > 0 && r.redeemedAt !== null);
  const uncounted = rows.length - counted.length;

  if (counted.length === 0) {
    return { total: 0, counted: 0, uncounted, estimatedPortion: 0, months: [], averageMonthly: 0, firstAt: null };
  }

  let total = 0;
  let estimatedPortion = 0;
  const byMonth = new Map<string, { amount: number; count: number }>();
  let first = counted[0].redeemedAt as Date;

  for (const row of counted) {
    const at = row.redeemedAt as Date;
    const amount = row.savedAmount as number;
    total += amount;
    if (row.savedEstimated) estimatedPortion += amount;
    if (at.getTime() < first.getTime()) first = at;
    const key = monthKey(at);
    const bucket = byMonth.get(key) ?? { amount: 0, count: 0 };
    bucket.amount += amount;
    bucket.count += 1;
    byMonth.set(key, bucket);
  }

  const months: MonthPoint[] = [];
  const last = monthKey(now);
  let key = monthKey(first);
  // Guard against a clock that puts "now" before the first redemption.
  const limit = 600;
  for (let i = 0; i < limit; i++) {
    const bucket = byMonth.get(key);
    months.push({ month: key, amount: pennies(bucket?.amount ?? 0), count: bucket?.count ?? 0 });
    if (key === last) break;
    key = addMonth(key);
  }

  return {
    total: pennies(total),
    counted: counted.length,
    uncounted,
    estimatedPortion: pennies(estimatedPortion),
    months,
    averageMonthly: pennies(total / months.length),
    firstAt: first.toISOString(),
  };
}
