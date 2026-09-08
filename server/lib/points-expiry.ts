/**
 * When a points balance lapses, and when to warn about it.
 *
 * `loyalty_programs.expiry_days` has existed since the first schema and the
 * merchant settings form has always offered it as "Points expire after (days)".
 * Nothing ever enforced it. A merchant could set 365, believe their liability was
 * bounded, and it never was. This is what makes that field true.
 *
 * **The clock runs from the resident's last activity at that outlet, not from
 * when each point was earned.** Per-point ageing is the obvious reading of
 * "points expire after 365 days" and it is the wrong rule here: it means a
 * regular watches their balance fall every month, in a scheme whose entire
 * purpose is rewarding regulars. Expiring on inactivity costs an active customer
 * nothing, ever, and still clears the balance of someone who has gone. It also
 * fits on the card in one line: points last as long as you keep using the card.
 *
 * Activity is any loyalty event, earning or spending. Someone who came in and
 * claimed a reward is plainly still a customer.
 *
 * Pure: no database, no clock of its own. Both are passed in.
 */

/** Below this, expiry stops being a tidy-up and becomes a way to avoid honouring points. */
export const MIN_EXPIRY_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ExpiryInput {
  /** The most recent loyalty event for this resident at this outlet. Null if there has never been one. */
  lastActivityAt: Date | null;
  /** `loyalty_programs.expiry_days`. Null or 0 means points never expire. */
  expiryDays: number | null;
  /** The spendable balance. A zero balance has nothing to expire and nothing to warn about. */
  points: number;
}

export interface ExpiryState {
  /** When the balance lapses if nothing else happens. Null when expiry is off. */
  expiresAt: Date | null;
  /** True when it has already lapsed and should be cleared. */
  expired: boolean;
  /** Whole days remaining, floored at 0. Null when expiry is off. */
  daysLeft: number | null;
}

/** Whether this programme expires points at all, and after how long. */
export function effectiveExpiryDays(expiryDays: number | null | undefined): number | null {
  if (expiryDays === null || expiryDays === undefined) return null;
  if (expiryDays <= 0) return null;
  // A programme configured below the floor is treated as the floor rather than
  // rejected: the value may predate the floor, and silently expiring points
  // sooner than the rules allow is the one outcome worth ruling out.
  return Math.max(expiryDays, MIN_EXPIRY_DAYS);
}

export function expiryState(input: ExpiryInput, now: Date): ExpiryState {
  const days = effectiveExpiryDays(input.expiryDays);
  if (days === null || input.points <= 0 || !input.lastActivityAt) {
    return { expiresAt: null, expired: false, daysLeft: null };
  }
  const expiresAt = new Date(input.lastActivityAt.getTime() + days * DAY_MS);
  const remaining = expiresAt.getTime() - now.getTime();
  return {
    expiresAt,
    expired: remaining <= 0,
    daysLeft: Math.max(0, Math.ceil(remaining / DAY_MS)),
  };
}

/**
 * Whether a warning is due now.
 *
 * One warning per balance, sent when the remaining days first fall inside the
 * window. The daily job dedupes on the expiry date itself, so a resident who
 * comes back in and pushes the date out gets a fresh warning next time round,
 * and one who does nothing is not told again every morning.
 */
export function warningDue(state: ExpiryState, warnWithinDays: number): boolean {
  if (state.expiresAt === null || state.expired) return false;
  return state.daysLeft !== null && state.daysLeft <= warnWithinDays;
}

/** The dedupe key's date part: the expiry this warning is about, as yyyy-mm-dd. */
export function expiryKeyDate(expiresAt: Date): string {
  return expiresAt.toISOString().slice(0, 10);
}
