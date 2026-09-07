import { describe, it, expect } from "vitest";
import { effectiveMembership, householdFeeGbp, planFeeGbp, isMembershipCurrent, randomHouseholdCode, HOUSEHOLD_CODE_LENGTH } from "../membership";
import { CODE_ALPHABET } from "../codes";

const future = new Date("2027-01-01T00:00:00Z");
const past = new Date("2025-01-01T00:00:00Z");

describe("effectiveMembership", () => {
  it("uses the user's own membership when they have no primary", () => {
    const result = effectiveMembership({ membershipPlan: "individual", membershipStatus: "active", membershipExpiry: future }, null);
    expect(result).toEqual({ plan: "individual", status: "active", expiry: future, inherited: false });
  });

  it("inherits from the primary when the primary is on a household plan", () => {
    const user = { membershipStatus: "inactive", membershipExpiry: null, householdPrimaryId: 7 };
    const primary = { membershipPlan: "household", membershipStatus: "active", membershipExpiry: future };
    expect(effectiveMembership(user, primary)).toEqual({ plan: "household", status: "active", expiry: future, inherited: true });
  });

  it("inherits a cancelled primary status too", () => {
    const user = { membershipStatus: "active", membershipExpiry: future, householdPrimaryId: 7 };
    const primary = { membershipPlan: "household", membershipStatus: "cancelled", membershipExpiry: future };
    expect(effectiveMembership(user, primary).status).toBe("cancelled");
    expect(effectiveMembership(user, primary).inherited).toBe(true);
  });

  it("falls back to the user's own membership when the primary is not on household", () => {
    const user = { membershipPlan: "individual", membershipStatus: "inactive", membershipExpiry: null, householdPrimaryId: 7 };
    const primary = { membershipPlan: "individual", membershipStatus: "active", membershipExpiry: future };
    expect(effectiveMembership(user, primary)).toEqual({ plan: "individual", status: "inactive", expiry: null, inherited: false });
  });

  it("falls back to the user's own membership when the primary row is missing", () => {
    const user = { membershipStatus: "active", membershipExpiry: future, householdPrimaryId: 7 };
    expect(effectiveMembership(user, null).inherited).toBe(false);
    expect(effectiveMembership(user, null).status).toBe("active");
  });

  it("normalises unknown statuses to inactive and accepts ISO strings", () => {
    const result = effectiveMembership({ membershipStatus: "weird", membershipExpiry: "2027-01-01T00:00:00Z" }, null);
    expect(result.status).toBe("inactive");
    expect(result.expiry?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("isMembershipCurrent", () => {
  const now = new Date("2026-07-10T12:00:00Z");
  it("requires active status and a future expiry", () => {
    expect(isMembershipCurrent({ plan: "individual", status: "active", expiry: future, inherited: false }, now)).toBe(true);
    expect(isMembershipCurrent({ plan: "individual", status: "active", expiry: past, inherited: false }, now)).toBe(false);
    expect(isMembershipCurrent({ plan: "individual", status: "cancelled", expiry: future, inherited: false }, now)).toBe(false);
    expect(isMembershipCurrent({ plan: "individual", status: "active", expiry: null, inherited: false }, now)).toBe(false);
  });
});

describe("fees", () => {
  it("charges exactly twice the base for a household", () => {
    expect(householdFeeGbp(25)).toBe(50);
    expect(householdFeeGbp(19.5)).toBe(39);
    expect(planFeeGbp("individual", 25)).toBe(25);
    expect(planFeeGbp("household", 25)).toBe(50);
  });
});

describe("randomHouseholdCode", () => {
  it("is 8 characters from the scan-code alphabet", () => {
    for (let i = 0; i < 20; i++) {
      const code = randomHouseholdCode();
      expect(code).toHaveLength(HOUSEHOLD_CODE_LENGTH);
      for (const ch of code) expect(CODE_ALPHABET).toContain(ch);
    }
  });
});
