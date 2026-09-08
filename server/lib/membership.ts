import { randomCode, HUMAN_ALPHABET } from "./codes";

// Pure helpers for resident membership plans (individual and household). No database access.

export type MembershipPlan = "individual" | "household";
export type MembershipStatus = "inactive" | "active" | "cancelled";

/** The subset of a users row the membership rules need. */
export interface MembershipLike {
  membershipPlan?: string | null;
  membershipStatus?: string | null;
  membershipExpiry?: Date | string | null;
  membershipRenews?: boolean | null;
  householdPrimaryId?: number | null;
}

export interface EffectiveMembership {
  plan: MembershipPlan;
  status: MembershipStatus;
  expiry: Date | null;
  /** False once a downgrade to Free at the end of the paid period is scheduled. */
  renews: boolean;
  /** The expiry when a downgrade is scheduled and the membership is still active; otherwise null. */
  endsAt: Date | null;
  /** True when the status and expiry come from the household primary. */
  inherited: boolean;
}

export type MembershipTier = "free" | "premium";

export const HOUSEHOLD_CODE_LENGTH = 8;

function toStatus(value: string | null | undefined): MembershipStatus {
  return value === "active" || value === "cancelled" ? value : "inactive";
}

function toExpiry(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPlan(value: string | null | undefined): MembershipPlan {
  return value === "household" ? "household" : "individual";
}

function fromRow(row: MembershipLike, plan: MembershipPlan, inherited: boolean, now: Date): EffectiveMembership {
  const renews = row.membershipRenews !== false;
  const expiry = toExpiry(row.membershipExpiry);
  let status = toStatus(row.membershipStatus);
  // A scheduled downgrade ends at expiry even if nothing has flipped the status column yet.
  if (status === "active" && !renews && (expiry === null || expiry.getTime() <= now.getTime())) status = "inactive";
  const endsAt = status === "active" && !renews ? expiry : null;
  return { plan, status, expiry, renews, endsAt, inherited };
}

/**
 * A user with a householdPrimaryId inherits the primary's status, expiry and renews flag
 * while the primary is on a household plan; otherwise the user's own membership applies.
 */
export function effectiveMembership(user: MembershipLike, primary: MembershipLike | null, now: Date = new Date()): EffectiveMembership {
  const covered = Boolean(user.householdPrimaryId) && primary !== null && toPlan(primary.membershipPlan) === "household";
  if (covered && primary) return fromRow(primary, "household", true, now);
  return fromRow(user, toPlan(user.membershipPlan), false, now);
}

/** Premium = an active, unexpired membership; everything else is Free. */
export function membershipTier(membership: EffectiveMembership, now: Date = new Date()): MembershipTier {
  return isMembershipCurrent(membership, now) ? "premium" : "free";
}

/** True when the membership is active and has not expired. */
export function isMembershipCurrent(membership: EffectiveMembership, now: Date = new Date()): boolean {
  return membership.status === "active" && membership.expiry !== null && membership.expiry.getTime() > now.getTime();
}

/** A household (two adults) costs exactly twice the individual fee. */
export function householdFeeGbp(base: number): number {
  return base * 2;
}

export function planFeeGbp(plan: MembershipPlan, base: number): number {
  return plan === "household" ? householdFeeGbp(base) : base;
}

/** 8 characters from the same alphabet as merchant scan codes. */
export function randomHouseholdCode(): string {
  return randomCode(HOUSEHOLD_CODE_LENGTH, HUMAN_ALPHABET);
}
