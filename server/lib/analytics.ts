import { monthKey, monthKeyOffset } from "./revenue";

/**
 * Pure shaping for the merchant analytics screen. Every function takes plain
 * arrays and returns the shapes documented in docs/API.md ("Merchant analytics").
 * No database access, so it is unit tested directly.
 *
 * All bucketing (weeks, days of the week, hours) is done in Europe/London so a
 * redemption at 00:30 BST lands on the day the bar staff would call it. Month
 * keys reuse `monthKey`/`monthKeyOffset` from revenue.ts rather than repeating
 * the timezone handling.
 */

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAYS)[number];

/** The subset of a redemptions row the analytics maths needs. */
export interface RedemptionLike {
  redeemedAt: Date | null;
  userId: number;
  offerId: string;
  basketAmount: string | number | null;
}

/** The subset of an offers row needed to name and headline an offer. */
export interface OfferLike {
  id: string;
  title: string;
  type: string | null;
  percentOff: number | null;
  fixedPrice: string | number | null;
  shortPromo: string | null;
}

export interface WeekBucket { weekStart: string; redemptions: number; newResidents: number }
export interface DayBucket { day: DayKey; redemptions: number }
export interface HourBucket { hour: number; redemptions: number }
export interface OfferBucket { offerId: string; title: string; headline: string; redemptions: number; share: number }

const LONDON = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

export interface LondonParts { year: number; month: number; day: number; hour: number }

/** Calendar year/month/day/hour of an instant, as seen in Europe/London. */
export function londonParts(date: Date): LondonParts {
  const parts = LONDON.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24 };
}

/** A London calendar date as a UTC-anchored Date, so day arithmetic is DST-free. */
function londonCivil(date: Date): Date {
  const { year, month, day } = londonParts(date);
  return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(civil: Date): string {
  return civil.toISOString().slice(0, 10);
}

/** "mon".."sun" for an instant, in Europe/London. */
export function dayKey(date: Date): DayKey {
  return DAYS[(londonCivil(date).getUTCDay() + 6) % 7];
}

/** 0..23 for an instant, in Europe/London. */
export function hourOf(date: Date): number {
  return londonParts(date).hour;
}

/** "YYYY-MM-DD" of the Monday starting the London week that contains `date`. */
export function weekStart(date: Date): string {
  const civil = londonCivil(date);
  civil.setUTCDate(civil.getUTCDate() - ((civil.getUTCDay() + 6) % 7));
  return isoDate(civil);
}

/** The `count` week starts ending with the week containing `end`, oldest first. */
export function weekStartsEndingAt(end: Date, count: number): string[] {
  const last = new Date(`${weekStart(end)}T00:00:00.000Z`);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(last);
    d.setUTCDate(d.getUTCDate() - i * 7);
    out.push(isoDate(d));
  }
  return out;
}

/** The middle value, averaging the two middles for an even count. 0 for an empty list. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 100) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function amount(value: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Rows with a timestamp inside [from, to), oldest-agnostic. */
export function inWindow<T extends { redeemedAt: Date | null }>(rows: T[], from: Date, to: Date): T[] {
  return rows.filter((r) => r.redeemedAt !== null && r.redeemedAt.getTime() >= from.getTime() && r.redeemedAt.getTime() < to.getTime());
}

/** Each resident's earliest redemption at this outlet, from the rows given. */
export function firstSeenByUser(rows: RedemptionLike[]): Map<number, Date> {
  const first = new Map<number, Date>();
  for (const r of rows) {
    if (!r.redeemedAt) continue;
    const current = first.get(r.userId);
    if (!current || r.redeemedAt.getTime() < current.getTime()) first.set(r.userId, r.redeemedAt);
  }
  return first;
}

/** 13 weeks of redemptions, with the residents whose first visit fell in that week. */
export function buildByWeek(rows: RedemptionLike[], firstSeen: Map<number, Date>, to: Date, weeks = 13): WeekBucket[] {
  const buckets = new Map<string, WeekBucket>();
  for (const key of weekStartsEndingAt(to, weeks)) buckets.set(key, { weekStart: key, redemptions: 0, newResidents: 0 });
  for (const r of rows) {
    if (!r.redeemedAt) continue;
    const bucket = buckets.get(weekStart(r.redeemedAt));
    if (!bucket) continue;
    bucket.redemptions++;
    const first = firstSeen.get(r.userId);
    if (first && first.getTime() === r.redeemedAt.getTime()) bucket.newResidents++;
  }
  return Array.from(buckets.values());
}

/** Redemptions by day of the week, Monday first, every day present. */
export function buildByDay(rows: RedemptionLike[]): DayBucket[] {
  const counts = new Map<DayKey, number>(DAYS.map((d) => [d, 0]));
  for (const r of rows) {
    if (!r.redeemedAt) continue;
    counts.set(dayKey(r.redeemedAt), (counts.get(dayKey(r.redeemedAt)) ?? 0) + 1);
  }
  return DAYS.map((day) => ({ day, redemptions: counts.get(day) ?? 0 }));
}

/** Redemptions by hour, 0..23, every hour present. */
export function buildByHour(rows: RedemptionLike[]): HourBucket[] {
  const counts = new Array<number>(24).fill(0);
  for (const r of rows) {
    if (!r.redeemedAt) continue;
    counts[hourOf(r.redeemedAt)]++;
  }
  return counts.map((redemptions, hour) => ({ hour, redemptions }));
}

/** A short "20% off"-style label for an offer, matching the resident-facing wording. */
export function offerHeadline(offer: OfferLike): string {
  const price = amount(offer.fixedPrice);
  const pounds = price === null ? null : `£${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
  switch (offer.type) {
    case "percentage_discount":
      return offer.percentOff ? `${offer.percentOff}% off` : "Discount";
    case "fixed_amount_discount":
      return pounds ? `${pounds} off` : "Money off";
    case "fixed_price":
    case "set_menu":
      return pounds ?? (offer.type === "set_menu" ? "Set menu" : "Fixed price");
    case "bogo":
      return "2 for 1";
    case "free_item_with_purchase":
      return "Free item";
    case "off_peak":
      return offer.percentOff ? `${offer.percentOff}% off off-peak` : "Off-peak offer";
    case "loyalty_reward":
      return "Loyalty reward";
    default:
      return offer.shortPromo ?? "Offer";
  }
}

/** Offers ranked by redemptions in the window, with each one's share of the total. */
export function buildByOffer(rows: RedemptionLike[], offers: OfferLike[]): OfferBucket[] {
  const byId = new Map(offers.map((o) => [o.id, o]));
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.offerId, (counts.get(r.offerId) ?? 0) + 1);
  const total = rows.length;
  return Array.from(counts.entries())
    .map(([offerId, redemptions]) => {
      const offer = byId.get(offerId);
      return {
        offerId,
        title: offer?.title ?? "Removed offer",
        headline: offer ? offerHeadline(offer) : "Offer",
        redemptions,
        share: total === 0 ? 0 : Math.round((redemptions / total) * 1000) / 1000,
      };
    })
    .sort((a, b) => b.redemptions - a.redemptions || a.title.localeCompare(b.title));
}

export interface Headline {
  redemptions: number;
  redemptionsPrevious: number;
  residents: number;
  newResidents: number;
  returningShare: number;
  favourites: number;
  averageBasket: number | null;
}

/**
 * The headline tiles. A redemption is "returning" when that resident had an
 * earlier redemption at this outlet, so a resident's very first visit is new and
 * every later one is returning.
 */
export function buildHeadline(
  windowRows: RedemptionLike[],
  previousRows: RedemptionLike[],
  firstSeen: Map<number, Date>,
  favourites: number,
  from: Date,
): Headline {
  const residents = new Set(windowRows.map((r) => r.userId));
  let returning = 0;
  let basketTotal = 0;
  let basketCount = 0;
  for (const r of windowRows) {
    if (!r.redeemedAt) continue;
    const first = firstSeen.get(r.userId);
    if (first && first.getTime() < r.redeemedAt.getTime()) returning++;
    const basket = amount(r.basketAmount);
    if (basket !== null) {
      basketTotal += basket;
      basketCount++;
    }
  }
  let newResidents = 0;
  residents.forEach((userId) => {
    const first = firstSeen.get(userId);
    if (first && first.getTime() >= from.getTime()) newResidents++;
  });
  return {
    redemptions: windowRows.length,
    redemptionsPrevious: previousRows.length,
    residents: residents.size,
    newResidents,
    returningShare: windowRows.length === 0 ? 0 : Math.round((returning / windowRows.length) * 1000) / 1000,
    favourites,
    averageBasket: basketCount === 0 ? null : round2(basketTotal / basketCount),
  };
}

/** Town-wide busiest days as shares of all town redemptions, busiest first. */
export function buildBusiestDays(counts: { day: DayKey; redemptions: number }[]): { day: DayKey; share: number }[] {
  const total = counts.reduce((sum, c) => sum + c.redemptions, 0);
  return counts
    .map((c) => ({ day: c.day, share: total === 0 ? 0 : Math.round((c.redemptions / total) * 1000) / 1000 }))
    .sort((a, b) => b.share - a.share || DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
}

/** 12 months of town-wide active members, oldest first, every month present. */
export function buildMemberGrowth(rows: { month: string; members: number }[], now: Date, months = 12): { month: string; members: number }[] {
  const byMonth = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) byMonth.set(monthKeyOffset(now, -i), 0);
  for (const row of rows) {
    if (byMonth.has(row.month)) byMonth.set(row.month, row.members);
  }
  return Array.from(byMonth.entries()).map(([month, members]) => ({ month, members }));
}

/** The month key for an instant, in Europe/London. Re-exported so callers need one import. */
export { monthKey };
