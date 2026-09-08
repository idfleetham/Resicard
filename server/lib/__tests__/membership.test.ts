import { describe, it, expect } from "vitest";
import { effectiveMembership, householdFeeGbp, planFeeGbp, isMembershipCurrent, membershipTier, randomHouseholdCode, HOUSEHOLD_CODE_LENGTH } from "../membership";
import { CODE_ALPHABET } from "../codes";

const future = new Date("2027-01-01T00:00:00Z");
const past = new Date("2025-01-01T00:00:00Z");

describe("effectiveMembership", () => {
  it("uses the user's own membership when they have no primary", () => {
    const result = effectiveMembership({ membershipPlan: "individual", membershipStatus: "active", membershipExpiry: future }, null);
    expect(result).toEqual({ plan: "individual", status: "active", expiry: future, renews: true, endsAt: null, inherited: false });
  });

  it("inherits from the primary when the primary is on a household plan", () => {
    const user = { membershipStatus: "inactive", membershipExpiry: null, householdPrimaryId: 7 };
    const primary = { membershipPlan: "household", membershipStatus: "active", membershipExpiry: future };
    expect(effectiveMembership(user, primary)).toEqual({ plan: "household", status: "active", expiry: future, renews: true, endsAt: null, inherited: true });
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
    expect(effectiveMembership(user, primary)).toEqual({ plan: "individual", status: "inactive", expiry: null, renews: true, endsAt: null, inherited: false });
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

describe("scheduled downgrades", () => {
  const now = new Date("2026-07-10T12:00:00Z");
  const base = { plan: "individual" as const, inherited: false };

  it("reports renews false and endsAt while the paid period runs", () => {
    const result = effectiveMembership({ membershipStatus: "active", membershipExpiry: future, membershipRenews: false }, null, now);
    expect(result).toMatchObject({ status: "active", renews: false, endsAt: future });
    expect(membershipTier(result, now)).toBe("premium");
  });

  it("is inactive and Free once the expiry has passed, even if the status column still says active", () => {
    const result = effectiveMembership({ membershipStatus: "active", membershipExpiry: past, membershipRenews: false }, null, now);
    expect(result).toMatchObject({ status: "inactive", renews: false, endsAt: null });
    expect(membershipTier(result, now)).toBe("free");
  });

  it("a household member inherits the primary's renews flag", () => {
    const user = { membershipStatus: "inactive", membershipRenews: true, householdPrimaryId: 7 };
    const primary = { membershipPlan: "household", membershipStatus: "active", membershipExpiry: future, membershipRenews: false };
    expect(effectiveMembership(user, primary, now)).toMatchObject({ plan: "household", renews: false, endsAt: future, inherited: true });
  });

  it("everything but an active, unexpired membership is Free", () => {
    expect(membershipTier({ ...base, status: "cancelled", expiry: future, renews: true, endsAt: null }, now)).toBe("free");
    expect(membershipTier({ ...base, status: "inactive", expiry: null, renews: true, endsAt: null }, now)).toBe("free");
    expect(membershipTier({ ...base, status: "active", expiry: past, renews: true, endsAt: null }, now)).toBe("free");
  });
});

describe("isMembershipCurrent", () => {
  const now = new Date("2026-07-10T12:00:00Z");
  const base = { plan: "individual" as const, renews: true, endsAt: null, inherited: false };
  it("requires active status and a future expiry", () => {
    expect(isMembershipCurrent({ ...base, status: "active", expiry: future }, now)).toBe(true);
    expect(isMembershipCurrent({ ...base, status: "active", expiry: past }, now)).toBe(false);
    expect(isMembershipCurrent({ ...base, status: "cancelled", expiry: future }, now)).toBe(false);
    expect(isMembershipCurrent({ ...base, status: "active", expiry: null }, now)).toBe(false);
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
