import { randomInt } from "crypto";

// Pure functions implementing the redeem rules in docs/API.md. No database access here.

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export interface TimeSlot {
  start: string; // "HH:MM"
  end: string; // "HH:MM"; an end before the start means the slot crosses midnight
}

export interface BlackoutRange {
  name: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // inclusive
}

/** The subset of an offer row the scheduling rules need. */
export interface SchedulableOffer {
  active?: boolean | null;
  archived?: boolean | null;
  validFrom?: string | null;
  validTo?: string | null;
  daysOfWeek?: string[] | null;
  timeSlots?: Record<string, TimeSlot[]> | null;
  blackoutDates?: BlackoutRange[] | null;
}

export interface LocalDateTime {
  date: string; // "YYYY-MM-DD"
  day: DayKey;
  minutes: number; // minutes since local midnight
}

/** Breaks an instant into the local calendar date, weekday and minutes in the given time zone. */
export function toLocalDateTime(now: Date, tz = "Europe/London"): LocalDateTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour")) % 24; // some runtimes format midnight as "24"
  const weekday = get("weekday").slice(0, 3).toLowerCase() as DayKey;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    day: weekday,
    minutes: hour * 60 + Number(get("minute")),
  };
}

/** Shifts a "YYYY-MM-DD" string by whole days (calendar arithmetic, no time zone involved). */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

function previousDay(day: DayKey): DayKey {
  const index = DAY_KEYS.indexOf(day);
  return DAY_KEYS[(index + 6) % 7];
}

export function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 24 || m > 59) return null;
  return h * 60 + m;
}

function slotsFor(timeSlots: Record<string, TimeSlot[]> | null | undefined, day: DayKey): TimeSlot[] {
  if (!timeSlots) return [];
  const slots = timeSlots[day];
  return Array.isArray(slots) ? slots : [];
}

/**
 * True when the current time falls within one of the day's slots. A slot whose end is
 * before its start (for example 22:00-02:00) runs into the next day, so the previous
 * day's slots are also checked for the early-morning part.
 */
export function isWithinTimeSlots(
  timeSlots: Record<string, TimeSlot[]> | null | undefined,
  day: DayKey,
  minutes: number,
): boolean {
  const today = slotsFor(timeSlots, day);
  for (const slot of today) {
    const start = parseTime(slot.start);
    const end = parseTime(slot.end);
    if (start === null || end === null) continue;
    if (start < end) {
      if (minutes >= start && minutes < end) return true;
    } else if (start === end) {
      return true; // a 24-hour slot
    } else if (minutes >= start) {
      return true; // the evening part of an overnight slot
    }
  }
  const yesterday = slotsFor(timeSlots, previousDay(day));
  for (const slot of yesterday) {
    const start = parseTime(slot.start);
    const end = parseTime(slot.end);
    if (start === null || end === null) continue;
    if (start > end && minutes < end) return true; // the morning part of an overnight slot
  }
  return false;
}

function hasAnySlot(timeSlots: Record<string, TimeSlot[]> | null | undefined, day: DayKey): boolean {
  return slotsFor(timeSlots, day).length > 0 || slotsFor(timeSlots, previousDay(day)).some((s) => {
    const start = parseTime(s.start);
    const end = parseTime(s.end);
    return start !== null && end !== null && start > end;
  });
}

export function isBlackedOut(blackoutDates: BlackoutRange[] | null | undefined, date: string): boolean {
  if (!blackoutDates) return false;
  return blackoutDates.some((range) => {
    if (!range.startDate) return false;
    const end = range.endDate || range.startDate;
    return date >= range.startDate && date <= end;
  });
}

/**
 * Rule 3: active, not archived, within validFrom/validTo, on an allowed weekday, within
 * a time slot (when the day has any), and not in a blackout range. Dates are compared in
 * the merchant's local time zone (Europe/London by default).
 *
 * Time slots restrict only the days they list; a day with no slots is unrestricted.
 */
export function isOfferLiveNow(offer: SchedulableOffer, now: Date = new Date(), tz = "Europe/London"): boolean {
  if (offer.active === false || offer.archived === true) return false;
  const local = toLocalDateTime(now, tz);

  if (offer.validFrom && local.date < offer.validFrom) return false;
  if (offer.validTo && local.date > offer.validTo) return false;

  const days = (offer.daysOfWeek ?? []).map((d) => d.toLowerCase().slice(0, 3));
  if (days.length > 0 && !days.includes(local.day)) {
    // Allow the early-morning tail of an overnight slot that started on an allowed day.
    const startedYesterday =
      days.includes(previousDay(local.day)) &&
      slotsFor(offer.timeSlots, previousDay(local.day)).some((s) => {
        const start = parseTime(s.start);
        const end = parseTime(s.end);
        return start !== null && end !== null && start > end && local.minutes < end;
      });
    if (!startedYesterday) return false;
  }

  if (hasAnySlot(offer.timeSlots, local.day) && !isWithinTimeSlots(offer.timeSlots, local.day, local.minutes)) {
    return false;
  }

  if (isBlackedOut(offer.blackoutDates, local.date)) return false;
  return true;
}

export interface LimitableOffer {
  maxPerDay?: number | null;
  maxPerWeek?: number | null;
  maxLifetime?: number | null;
  globalUsageLimit?: number | null;
  usageCount?: number | null;
}

/** Redemption counts from the `redemptions` table. */
export interface RedemptionCounts {
  today: number; // this resident, this offer, today
  thisWeek: number; // this resident, this offer, last 7 days
  lifetime: number; // this resident, this offer, ever
  total: number; // all residents, this offer, ever
}

export interface LimitCheck {
  ok: boolean;
  reason: string | null;
}

/** Rule 4: per-resident and global usage limits. A null or zero limit means no limit. */
export function checkResidentLimits(offer: LimitableOffer, counts: RedemptionCounts): LimitCheck {
  const limited = (limit: number | null | undefined) => typeof limit === "number" && limit > 0;
  if (limited(offer.globalUsageLimit) && counts.total >= (offer.globalUsageLimit as number)) {
    return { ok: false, reason: "This offer has reached its usage limit" };
  }
  if (limited(offer.maxLifetime) && counts.lifetime >= (offer.maxLifetime as number)) {
    return { ok: false, reason: "You have already used this offer the maximum number of times" };
  }
  if (limited(offer.maxPerWeek) && counts.thisWeek >= (offer.maxPerWeek as number)) {
    return { ok: false, reason: "You have already used this offer the maximum number of times this week" };
  }
  if (limited(offer.maxPerDay) && counts.today >= (offer.maxPerDay as number)) {
    return { ok: false, reason: "You have already used this offer today" };
  }
  return { ok: true, reason: null };
}

/** Uppercase letters and digits without the easily confused 0, O, 1 and I. */
export const REDEMPTION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REDEMPTION_CODE_LENGTH = 6;

export function generateRedemptionCode(): string {
  let code = "";
  for (let i = 0; i < REDEMPTION_CODE_LENGTH; i++) {
    code += REDEMPTION_CODE_ALPHABET[randomInt(REDEMPTION_CODE_ALPHABET.length)];
  }
  return code;
}

export interface PointsProgram {
  pointsPerCurrency?: number | null;
  pointsPerRedemption?: number | null;
  minBasketEarn?: string | number | null;
}

/**
 * Rule 6: basketAmount * pointsPerCurrency when a basket amount is given, otherwise
 * pointsPerRedemption; then the tier multiplier, rounded down. A basket below
 * minBasketEarn earns nothing.
 */
export function pointsForRedemption(
  program: PointsProgram,
  tierMultiplier: number | string | null | undefined,
  basketAmount: number | null | undefined,
): number {
  const multiplier = Number(tierMultiplier ?? 1) || 1;
  let base: number;
  if (typeof basketAmount === "number" && basketAmount > 0) {
    const minBasket = Number(program.minBasketEarn ?? 0) || 0;
    if (basketAmount < minBasket) return 0;
    base = basketAmount * (program.pointsPerCurrency ?? 0);
  } else {
    base = program.pointsPerRedemption ?? 0;
  }
  return Math.max(0, Math.floor(base * multiplier));
}

export interface TierLike {
  id: string;
  thresholdPoints: number;
}

/** Highest tier whose threshold is at or below the points balance, or null. */
export function resolveTier<T extends TierLike>(tiers: T[], points: number): T | null {
  let best: T | null = null;
  for (const tier of tiers) {
    if (tier.thresholdPoints <= points && (!best || tier.thresholdPoints > best.thresholdPoints)) {
      best = tier;
    }
  }
  return best;
}

/** Lowest tier whose threshold is above the points balance, or null. */
export function nextTier<T extends TierLike>(tiers: T[], points: number): T | null {
  let best: T | null = null;
  for (const tier of tiers) {
    if (tier.thresholdPoints > points && (!best || tier.thresholdPoints < best.thresholdPoints)) {
      best = tier;
    }
  }
  return best;
}

export interface ResidentLike {
  role?: string | null;
  isResidencyVerified?: boolean | null;
}

/** The membership that applies to the resident (their own, or the household primary's). */
export interface MembershipSnapshot {
  status?: string | null;
  expiry?: Date | string | null;
}

/**
 * Rule 1: reasons the resident cannot redeem right now (empty when they can). The
 * membership is the effective one from `effectiveMembership()` in lib/membership.ts.
 */
export function residentRedeemReasons(user: ResidentLike, membership: MembershipSnapshot, now: Date = new Date()): string[] {
  const reasons: string[] = [];
  if (user.role && user.role !== "resident") reasons.push("Only residents can redeem offers");
  if (!user.isResidencyVerified) reasons.push("Residency not yet verified");
  const expiry = membership.expiry ? new Date(membership.expiry) : null;
  if (membership.status !== "active") {
    reasons.push("Membership needed to redeem offers");
  } else if (!expiry || expiry.getTime() <= now.getTime()) {
    reasons.push("Membership has expired");
  }
  return reasons;
}

export interface MerchantLike {
  status?: string | null;
}

/** Rule 2: reasons the merchant cannot accept redemptions (empty when it can). Plan does not matter. */
export function merchantRedeemReasons(merchant: MerchantLike): string[] {
  const reasons: string[] = [];
  if (merchant.status !== "approved") reasons.push("This outlet has not been approved yet");
  return reasons;
}
