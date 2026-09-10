import type { PeriodKey } from "@shared/periods";

/** The shape of GET /api/merchant/analytics, exactly as documented in docs/API.md. */

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface AnalyticsHeadline {
  redemptions: number;
  redemptionsPrevious: number;
  residents: number;
  newResidents: number;
  /** 0..1 of redemptions from residents seen before. */
  returningShare: number;
  favourites: number;
  /** Null where staff never entered a bill total. */
  averageBasket: number | null;
}

export interface WeekPoint { weekStart: string; redemptions: number; newResidents: number }
export interface DayPoint { day: DayKey; redemptions: number }
export interface HourPoint { hour: number; redemptions: number }
export interface OfferPoint { offerId: string; title: string; headline: string; redemptions: number; share: number }
export interface TierPoint { name: string; color: string; members: number }

export interface LoyaltyBlockData {
  members: number;
  activeMembers30d: number;
  pointsIssued30d: number;
  rewardsClaimed30d: number;
  tiers: TierPoint[];
}

export interface TownBlockData {
  categoryLabel: string;
  outletsInCategory: number;
  yourRedemptions30d: number;
  medianRedemptions30d: number;
  busiestDays: { day: DayKey; share: number }[];
  memberGrowth: { month: string; members: number }[];
}

export interface AnalyticsRange {
  from: string;
  to: string;
  period: PeriodKey;
  /** Whole days in the window, for the copy that used to say "90 days". */
  days: number;
  /** How to describe what this is measured against, e.g. "the same days last quarter". */
  compareLabel: string;
}

export interface AnalyticsData {
  range: AnalyticsRange;
  headline: AnalyticsHeadline;
  byWeek: WeekPoint[];
  byDay: DayPoint[];
  byHour: HourPoint[];
  byOffer: OfferPoint[];
  loyalty: LoyaltyBlockData | null;
  town: TownBlockData | null;
}

/**
 * House chart colours.
 *
 * Sea (#0F3B47) is the brand's ink and it stayed the fill for every chart, which
 * is why a page of them read as a wall of near-black: sea has almost no chroma,
 * so nine charts in it look like nine grey blocks. Sea is now text only, and the
 * data wears these three, which are the brand's own hues taken up to a strength
 * that survives being printed as a 6px bar.
 *
 * Assigned in this fixed order and never cycled. Checked with the palette
 * validator against a white card: all three clear the chroma floor and 3:1
 * against the surface, the worst colour-blind pair separates at ΔE 16 (tritan)
 * and the worst normal-vision pair at ΔE 18.6. Do not substitute by eye — rerun
 * the validator.
 */
export const SERIES_1 = "#0E9AA7";
export const SERIES_2 = "#E4572E";
export const SERIES_3 = "#A32A5E";

/** Ink and furniture. Sea is for text and never for a fill. */
export const SEA = "#0F3B47";
export const SAND = "#E6D9BF";
export const SAND_EDGE = "#D3C09B";
export const LINE = "#E6E9E8";
export const SLATE = "#5C6F75";
export const FOAM = "#F2F5F4";

/**
 * A bar's width as a share of its track, with a little headroom so the biggest
 * value never reaches the end. A bar that fills its track reads as "100%", which
 * is wrong when it is the largest of several parts, and doubly wrong when the
 * number printed beside it says 75%.
 */
export const BAR_HEADROOM = 0.92;

export function barWidth(value: number, scale: number): string {
  if (scale <= 0) return "0%";
  return `${Math.min(100, Math.max(2, (value / scale) * 100 * BAR_HEADROOM))}%`;
}

/** Recharts axis tick styling, shared so every chart reads as one system. */
export const AXIS_TICK = { fontSize: 12, fill: SLATE } as const;

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function hourLabel(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
}

export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, (m || 1) - 1, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
}

export function weekLabel(weekStart: string): string {
  return new Date(`${weekStart}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}

/**
 * A y axis with no name reads as a count of whatever the x axis is showing: a
 * merchant seeing 107 above "Sun" reasonably asks how there were 107 Sundays.
 */
export function yAxisLabel(value: string) {
  return {
    value,
    angle: -90,
    position: "insideLeft" as const,
    offset: 22,
    style: { fill: "#5C6F75", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textAnchor: "middle" as const },
  };
}

/** "90 days", "this quarter so far" — the window in words, for chart notes. */
export function windowLabel(range: { days: number }): string {
  if (range.days === 1) return "day";
  if (range.days % 7 === 0 && range.days <= 91) return `${range.days / 7} weeks`;
  return `${range.days} days`;
}
