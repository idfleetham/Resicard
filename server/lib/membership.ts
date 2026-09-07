import { randomCode, HUMAN_ALPHABET } from "./codes";

// Pure helpers for resident membership plans (individual and household). No database access.

export type MembershipPlan = "individual" | "household";
export type MembershipStatus = "inactive" | "active" | "cancelled";

/** The subset of a users row the membership rules need. */
export interface MembershipLike {
  membershipPlan?: string | null;
  membershipStatus?: string | null;
  membershipExpiry?: Date | string | null;
  householdPrimaryId?: number | null;
}

export interface EffectiveMembership {
  plan: MembershipPlan;
  status: MembershipStatus;
  expiry: Date | null;
  /** True when the status and expiry come from the household primary. */
  inherited: boolean;
}

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

/**
 * A user with a householdPrimaryId inherits the primary's status and expiry while the
 * primary is on a household plan; otherwise the user's own membership applies.
 */
export function effectiveMembership(user: MembershipLike, primary: MembershipLike | null): EffectiveMembership {
  const covered = Boolean(user.householdPrimaryId) && primary !== null && toPlan(primary.membershipPlan) === "household";
  if (covered && primary) {
    return { plan: "household", status: toStatus(primary.membershipStatus), expiry: toExpiry(primary.membershipExpiry), inherited: true };
  }
  return { plan: toPlan(user.membershipPlan), status: toStatus(user.membershipStatus), expiry: toExpiry(user.membershipExpiry), inherited: false };
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
