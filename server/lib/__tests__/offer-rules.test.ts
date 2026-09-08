import { describe, it, expect } from "vitest";
import {
  isOfferLiveNow,
  checkResidentLimits,
  generateRedemptionCode,
  pointsForRedemption,
  resolveTier,
  nextTier,
  toLocalDateTime,
  residentRedeemReasons,
  merchantRedeemReasons,
  REDEMPTION_CODE_ALPHABET,
} from "../offer-rules";

// Helper: a UTC instant that is the given London local time.
// July is BST (UTC+1); January is GMT (UTC+0).
const londonSummer = (day: number, hh: number, mm: number) => new Date(Date.UTC(2026, 6, day, hh - 1, mm));
const londonWinter = (day: number, hh: number, mm: number) => new Date(Date.UTC(2026, 0, day, hh, mm));

describe("toLocalDateTime", () => {
  it("uses the Europe/London wall clock", () => {
    // 2026-07-10 is a Friday. 23:30 UTC on 10 July is 00:30 BST on Saturday 11 July.
    const local = toLocalDateTime(new Date(Date.UTC(2026, 6, 10, 23, 30)));
    expect(local.date).toBe("2026-07-11");
    expect(local.day).toBe("sat");
    expect(local.minutes).toBe(30);
  });

  it("handles midnight", () => {
    const local = toLocalDateTime(londonWinter(5, 0, 0));
    expect(local.minutes).toBe(0);
    expect(local.date).toBe("2026-01-05");
  });
});

describe("isOfferLiveNow", () => {
  it("is live with no restrictions", () => {
    expect(isOfferLiveNow({}, londonSummer(10, 12, 0))).toBe(true);
  });

  it("is not live when inactive or archived", () => {
    expect(isOfferLiveNow({ active: false }, londonSummer(10, 12, 0))).toBe(false);
    expect(isOfferLiveNow({ archived: true }, londonSummer(10, 12, 0))).toBe(false);
  });

  it("respects validFrom and validTo inclusively", () => {
    const offer = { validFrom: "2026-07-10", validTo: "2026-07-12" };
    expect(isOfferLiveNow(offer, londonSummer(9, 23, 59))).toBe(false);
    expect(isOfferLiveNow(offer, londonSummer(10, 0, 0))).toBe(true);
    expect(isOfferLiveNow(offer, londonSummer(12, 23, 59))).toBe(true);
    expect(isOfferLiveNow(offer, londonSummer(13, 0, 0))).toBe(false);
  });

  it("respects daysOfWeek", () => {
    const offer = { daysOfWeek: ["mon", "tue", "wed"] };
    expect(isOfferLiveNow(offer, londonSummer(6, 12, 0))).toBe(true); // Monday 6 July
    expect(isOfferLiveNow(offer, londonSummer(10, 12, 0))).toBe(false); // Friday
    expect(isOfferLiveNow({ daysOfWeek: ["Friday"] }, londonSummer(10, 12, 0))).toBe(true);
  });

  it("restricts to time slots on the listed days only", () => {
    const offer = { timeSlots: { fri: [{ start: "14:00", end: "17:00" }] } };
    expect(isOfferLiveNow(offer, londonSummer(10, 13, 59))).toBe(false);
    expect(isOfferLiveNow(offer, londonSummer(10, 14, 0))).toBe(true);
    expect(isOfferLiveNow(offer, londonSummer(10, 16, 59))).toBe(true);
    expect(isOfferLiveNow(offer, londonSummer(10, 17, 0))).toBe(false);
    // Thursday has no slots, so it is unrestricted.
    expect(isOfferLiveNow(offer, londonSummer(9, 3, 0))).toBe(true);
  });

  it("handles time slots crossing midnight", () => {
    const offer = { timeSlots: { fri: [{ start: "22:00", end: "02:00" }], sat: [{ start: "12:00", end: "14:00" }] } };
    expect(isOfferLiveNow(offer, londonSummer(10, 21, 59))).toBe(false); // Friday before start
    expect(isOfferLiveNow(offer, londonSummer(10, 23, 30))).toBe(true); // Friday evening
    expect(isOfferLiveNow(offer, londonSummer(11, 1, 30))).toBe(true); // Saturday early morning, from Friday's slot
    expect(isOfferLiveNow(offer, londonSummer(11, 2, 0))).toBe(false); // Saturday after the overnight slot ends
    expect(isOfferLiveNow(offer, londonSummer(11, 13, 0))).toBe(true); // Saturday's own slot
    expect(isOfferLiveNow(offer, londonSummer(11, 15, 0))).toBe(false);
  });

  it("allows the overnight tail of a slot on an allowed day into a day that is not listed", () => {
    const offer = { daysOfWeek: ["fri"], timeSlots: { fri: [{ start: "22:00", end: "02:00" }] } };
    expect(isOfferLiveNow(offer, londonSummer(11, 1, 0))).toBe(true); // Saturday 01:00
    expect(isOfferLiveNow(offer, londonSummer(11, 12, 0))).toBe(false);
  });

  it("respects blackout dates inclusively", () => {
    const offer = { blackoutDates: [{ name: "Open week", startDate: "2026-07-10", endDate: "2026-07-12" }] };
    expect(isOfferLiveNow(offer, londonSummer(9, 12, 0))).toBe(true);
    expect(isOfferLiveNow(offer, londonSummer(10, 0, 30))).toBe(false);
    expect(isOfferLiveNow(offer, londonSummer(12, 23, 30))).toBe(false);
    expect(isOfferLiveNow(offer, londonSummer(13, 0, 30))).toBe(true);
  });

  it("uses the local date for blackout checks near midnight", () => {
    const offer = { blackoutDates: [{ name: "Hogmanay", startDate: "2026-01-01", endDate: "2026-01-01" }] };
    // 23:30 UTC on 31 Dec is 23:30 GMT: not yet blacked out.
    expect(isOfferLiveNow(offer, new Date(Date.UTC(2025, 11, 31, 23, 30)))).toBe(true);
    expect(isOfferLiveNow(offer, new Date(Date.UTC(2026, 0, 1, 0, 30)))).toBe(false);
  });
});

describe("checkResidentLimits", () => {
  const zero = { today: 0, thisWeek: 0, lifetime: 0, total: 0 };

  it("passes with no limits", () => {
    expect(checkResidentLimits({}, { today: 5, thisWeek: 20, lifetime: 100, total: 1000 }).ok).toBe(true);
    expect(checkResidentLimits({ maxPerDay: 0, maxLifetime: null }, { ...zero, today: 3 }).ok).toBe(true);
  });

  it("enforces maxPerDay", () => {
    expect(checkResidentLimits({ maxPerDay: 1 }, zero).ok).toBe(true);
    const result = checkResidentLimits({ maxPerDay: 1 }, { ...zero, today: 1 });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/today/);
  });

  it("enforces maxPerWeek and maxLifetime", () => {
    expect(checkResidentLimits({ maxPerWeek: 2 }, { ...zero, thisWeek: 2 }).ok).toBe(false);
    expect(checkResidentLimits({ maxPerWeek: 2 }, { ...zero, thisWeek: 1 }).ok).toBe(true);
    expect(checkResidentLimits({ maxLifetime: 3 }, { ...zero, lifetime: 3 }).ok).toBe(false);
  });

  it("enforces the global usage limit", () => {
    expect(checkResidentLimits({ globalUsageLimit: 100 }, { ...zero, total: 100 }).ok).toBe(false);
    expect(checkResidentLimits({ globalUsageLimit: 100 }, { ...zero, total: 99 }).ok).toBe(true);
  });
});

describe("generateRedemptionCode", () => {
  it("produces 6 characters from the confusion-free alphabet", () => {
    expect(REDEMPTION_CODE_ALPHABET).not.toMatch(/[0O1I]/);
    for (let i = 0; i < 500; i++) {
      const code = generateRedemptionCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it("is not constant", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateRedemptionCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("pointsForRedemption", () => {
  const program = { pointsPerCurrency: 10, pointsPerRedemption: 15, minBasketEarn: "5.00" };

  it("uses the basket amount when given", () => {
    expect(pointsForRedemption(program, 1, 12.5)).toBe(125);
  });

  it("falls back to pointsPerRedemption without a basket", () => {
    expect(pointsForRedemption(program, 1, null)).toBe(15);
    expect(pointsForRedemption(program, "1.00", undefined)).toBe(15);
  });

  it("applies the tier multiplier and rounds down", () => {
    expect(pointsForRedemption(program, "1.50", 10)).toBe(150);
    expect(pointsForRedemption(program, 1.25, null)).toBe(18);
  });

  it("awards nothing below the minimum basket", () => {
    expect(pointsForRedemption(program, 1, 4.99)).toBe(0);
  });
});

describe("tiers", () => {
  const tiers = [
    { id: "gold", thresholdPoints: 1000 },
    { id: "bronze", thresholdPoints: 0 },
    { id: "silver", thresholdPoints: 500 },
  ];

  it("resolves the highest tier at or below the balance", () => {
    expect(resolveTier(tiers, 0)?.id).toBe("bronze");
    expect(resolveTier(tiers, 499)?.id).toBe("bronze");
    expect(resolveTier(tiers, 500)?.id).toBe("silver");
    expect(resolveTier(tiers, 5000)?.id).toBe("gold");
    expect(resolveTier([], 5000)).toBeNull();
    expect(resolveTier([{ id: "a", thresholdPoints: 10 }], 5)).toBeNull();
  });

  it("finds the next tier", () => {
    expect(nextTier(tiers, 0)?.id).toBe("silver");
    expect(nextTier(tiers, 600)?.id).toBe("gold");
    expect(nextTier(tiers, 1000)).toBeNull();
  });
});

describe("redeem eligibility reasons", () => {
  it("lists what is missing for a resident", () => {
    const now = new Date("2026-07-10T12:00:00Z");
    expect(residentRedeemReasons({ role: "resident", isResidencyVerified: false }, { status: "inactive", expiry: null }, now)).toEqual([
      "Residency not yet verified",
      "Premium membership needed to redeem offers",
    ]);
    expect(
      residentRedeemReasons({ role: "resident", isResidencyVerified: true }, { status: "active", expiry: new Date("2026-01-01") }, now),
    ).toEqual(["Membership has expired"]);
    expect(
      residentRedeemReasons({ role: "resident", isResidencyVerified: true }, { status: "active", expiry: new Date("2027-01-01") }, now),
    ).toEqual([]);
  });

  it("uses the effective membership, not the user's own columns", () => {
    const now = new Date("2026-07-10T12:00:00Z");
    // A household member whose own row is inactive but whose primary is active.
    const user = { role: "resident", isResidencyVerified: true, membershipStatus: "inactive" };
    expect(residentRedeemReasons(user, { status: "active", expiry: new Date("2027-01-01") }, now)).toEqual([]);
  });

  it("blocks unapproved merchants only; the plan does not matter", () => {
    expect(merchantRedeemReasons({ status: "approved", planStatus: "free" })).toEqual([]);
    expect(merchantRedeemReasons({ status: "approved", planStatus: "premium" })).toEqual([]);
    expect(merchantRedeemReasons({ status: "pending", planStatus: "premium" })).toEqual(["This outlet has not been approved yet"]);
  });
});
