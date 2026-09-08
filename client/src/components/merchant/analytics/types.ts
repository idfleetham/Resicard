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

/**
 * Aggregate demographics of the residents who redeemed in the window. Null when
 * there were too few of them; a "not shown" row stands for every band too thin to
 * report on its own, so no figure here can be traced back to a person.
 */
export interface DemographicsData {
  ageBands: { band: string; share: number }[];
  sex: { value: string; share: number }[];
}

export interface TownBlockData {
  categoryLabel: string;
  outletsInCategory: number;
  yourRedemptions30d: number;
  medianRedemptions30d: number;
  busiestDays: { day: DayKey; share: number }[];
  memberGrowth: { month: string; members: number }[];
}

export interface AnalyticsData {
  range: { from: string; to: string };
  headline: AnalyticsHeadline;
  byWeek: WeekPoint[];
  byDay: DayPoint[];
  byHour: HourPoint[];
  byOffer: OfferPoint[];
  loyalty: LoyaltyBlockData | null;
  demographics: DemographicsData | null;
  town: TownBlockData | null;
}

/** House chart colours, from the brand tokens. Sea leads, sand is the second series. */
export const SEA = "#0F3B47";
export const SAND = "#E6D9BF";
export const SAND_EDGE = "#D3C09B";
export const LINE = "#E6E9E8";
export const SLATE = "#5C6F75";
export const FOAM = "#F2F5F4";

/** Recharts axis tick styling, shared so every chart reads as one system. */
export const AXIS_TICK = { fontSize: 12, fill: SLATE } as const;

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

/** The server's stand-in for every group too small to report, and how it reads on screen. */
export const NOT_SHOWN = "not shown";
export const NOT_SHOWN_LABEL = "Not shown";

/** The label for a stored demographic value. */
export const SEX_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
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
