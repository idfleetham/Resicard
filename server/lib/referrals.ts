import { HUMAN_ALPHABET, randomCode } from "./codes";

// Pure rules for member referrals. No database and no Stripe, so the parts that
// decide whether a referral may be credited can be tested on their own. The
// route and the webhook handler only fetch rows and apply what is decided here.

export const REFERRAL_CODE_LENGTH = 8;

/** One month each, for the referrer and the referred member. */
export const REFERRAL_MONTHS = 1;

/** A referrer earns at most six months in any rolling twelve. */
export const REFERRAL_CAP_MONTHS = 6;
export const REFERRAL_CAP_WINDOW_DAYS = 365;

/** A code no one else holds. Callers retry on collision. */
export function randomReferralCode(): string {
  return randomCode(REFERRAL_CODE_LENGTH, HUMAN_ALPHABET);
}

/** Codes are typed by hand, so they are compared with spaces and case ignored. */
export function normaliseReferralCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** The subset of a users row the referral rules need. */
export interface ReferralParty {
  id: number;
  householdPrimaryId?: number | null;
}

export type ReferralRefusal = "self_referral" | "same_household" | "cap_reached";

/**
 * Two people share a household when one is the other's primary, or both are
 * covered by the same primary. A household already pays once, so referring
 * inside it would be paying yourself.
 */
export function sameHousehold(a: ReferralParty, b: ReferralParty): boolean {
  if (a.householdPrimaryId && a.householdPrimaryId === b.id) return true;
  if (b.householdPrimaryId && b.householdPrimaryId === a.id) return true;
  return Boolean(a.householdPrimaryId) && a.householdPrimaryId === b.householdPrimaryId;
}

/** Months a referrer has already earned in the rolling window ending at `now`. */
export function monthsEarnedInWindow(creditedAt: (Date | string | null)[], now: Date = new Date()): number {
  const cutoff = now.getTime() - REFERRAL_CAP_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return creditedAt.filter((value) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time >= cutoff;
  }).length * REFERRAL_MONTHS;
}

export function capMonthsLeft(creditedAt: (Date | string | null)[], now: Date = new Date()): number {
  return Math.max(0, REFERRAL_CAP_MONTHS - monthsEarnedInWindow(creditedAt, now));
}

export type ReferralDecision = { ok: true } | { ok: false; reason: ReferralRefusal };

/**
 * Whether a code may be attached to a new member at registration. The cap is not
 * checked here: it applies when the month is actually earned, months later, and a
 * referrer who is capped today may not be by the time the friend pays.
 */
export function canAcceptReferral(referrer: ReferralParty, referred: ReferralParty): ReferralDecision {
  if (referrer.id === referred.id) return { ok: false, reason: "self_referral" };
  if (sameHousehold(referrer, referred)) return { ok: false, reason: "same_household" };
  return { ok: true };
}

/** Whether the referrer's month is due when the referred member's first payment lands. */
export function canCreditReferrer(
  referrer: ReferralParty,
  referred: ReferralParty,
  referrerCreditedAt: (Date | string | null)[],
  now: Date = new Date(),
): ReferralDecision {
  const accepted = canAcceptReferral(referrer, referred);
  if (!accepted.ok) return accepted;
  if (capMonthsLeft(referrerCreditedAt, now) < REFERRAL_MONTHS) return { ok: false, reason: "cap_reached" };
  return { ok: true };
}

/** Adds whole months to a date, the same way the membership does. */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * The referred member's month rides on the period their first payment bought, so
 * the expiry stays a function of the invoice rather than of how many times the
 * webhook arrives. A referral credited long before this period started belongs to
 * an earlier payment: year two must not hand out the month again.
 */
export function referredBonusMonths(creditedAt: Date | string | null, periodStart: Date): number {
  if (!creditedAt) return 0;
  const time = new Date(creditedAt).getTime();
  if (!Number.isFinite(time)) return 0;
  return time >= periodStart.getTime() ? REFERRAL_MONTHS : 0;
}

/** The link a member shares: registration with the code already filled in. */
export function referralShareLink(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/register?ref=${encodeURIComponent(code)}`;
}
