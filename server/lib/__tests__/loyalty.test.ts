import { describe, it, expect } from "vitest";
import { resolveStatus, canClaim, weekStart, monthStart, isTierBenefit } from "../loyalty";

const tiers = [
  { id: "regular", name: "Regular", thresholdPoints: 0, sortOrder: 0 },
  { id: "silver", name: "Silver", thresholdPoints: 50, sortOrder: 1 },
  { id: "gold", name: "Gold", thresholdPoints: 100, sortOrder: 2 },
];

// A UTC instant that is the given London local time. July is BST (UTC+1); January is GMT.
const summer = (day: number, hh: number, mm = 0) => new Date(Date.UTC(2026, 6, day, hh - 1, mm));
const winter = (day: number, hh: number, mm = 0) => new Date(Date.UTC(2026, 0, day, hh, mm));

describe("resolveStatus", () => {
  it("picks the highest tier at or below the status points and the next one up", () => {
    expect(resolveStatus(tiers, 0)).toMatchObject({ tier: { id: "regular" }, nextTier: { id: "silver" } });
    expect(resolveStatus(tiers, 49)).toMatchObject({ tier: { id: "regular" }, nextTier: { id: "silver" } });
    expect(resolveStatus(tiers, 50)).toMatchObject({ tier: { id: "silver" }, nextTier: { id: "gold" } });
    expect(resolveStatus(tiers, 325)).toMatchObject({ tier: { id: "gold" }, nextTier: null });
  });

  it("has no tier below the lowest threshold and none without tiers", () => {
    expect(resolveStatus([tiers[1], tiers[2]], 10)).toMatchObject({ tier: null, nextTier: { id: "silver" } });
    expect(resolveStatus([], 500)).toEqual({ tier: null, nextTier: null });
  });

  it("does not depend on the order of the tiers", () => {
    expect(resolveStatus([...tiers].reverse(), 75).tier?.id).toBe("silver");
  });
});

describe("canClaim entitlement", () => {
  const goldOnly = { tierId: "gold", claimRule: "unlimited" as const };
  const silverUp = { tierId: "silver", claimRule: "unlimited" as const };
  const everyone = { tierId: null, claimRule: "unlimited" as const };

  it("allows the reward's tier and any higher tier", () => {
    expect(canClaim(silverUp, tiers[1], tiers, null).ok).toBe(true);
    expect(canClaim(silverUp, tiers[2], tiers, null).ok).toBe(true);
    expect(canClaim(goldOnly, tiers[2], tiers, null).ok).toBe(true);
  });

  it("blocks lower tiers and residents with no tier", () => {
    const lower = canClaim(goldOnly, tiers[1], tiers, null);
    expect(lower.ok).toBe(false);
    expect(lower.entitled).toBe(false);
    expect(canClaim(goldOnly, tiers[0], tiers, null).ok).toBe(false);
    expect(canClaim(silverUp, null, tiers, null).ok).toBe(false);
  });

  it("blocks a reward whose tier no longer exists", () => {
    expect(canClaim({ tierId: "platinum", claimRule: "unlimited" }, tiers[2], tiers, null).ok).toBe(false);
  });

  it("lets anyone claim a reward with no tier", () => {
    expect(canClaim(everyone, null, tiers, null).ok).toBe(true);
    expect(canClaim(everyone, tiers[0], tiers, null).ok).toBe(true);
  });

  it("orders tiers with equal thresholds by sortOrder", () => {
    const tied = [
      { id: "a", thresholdPoints: 100, sortOrder: 0 },
      { id: "b", thresholdPoints: 100, sortOrder: 1 },
    ];
    expect(canClaim({ tierId: "b", claimRule: "unlimited" }, tied[0], tied, null).ok).toBe(false);
    expect(canClaim({ tierId: "a", claimRule: "unlimited" }, tied[1], tied, null).ok).toBe(true);
  });
});

describe("canClaim rules", () => {
  const gold = tiers[2];

  it("once: a single claim ever", () => {
    const reward = { tierId: "gold", claimRule: "once" as const };
    expect(canClaim(reward, gold, tiers, null, summer(10, 12)).ok).toBe(true);
    const again = canClaim(reward, gold, tiers, summer(1, 12), summer(10, 12));
    expect(again).toMatchObject({ ok: false, reason: "Already claimed", nextClaimAt: null, entitled: true });
  });

  it("unlimited: always", () => {
    expect(canClaim({ tierId: null, claimRule: "unlimited" }, gold, tiers, summer(10, 11, 59), summer(10, 12)).ok).toBe(true);
  });

  it("weekly: one per Monday-to-Sunday week in London", () => {
    const reward = { tierId: "gold", claimRule: "weekly" as const };
    // 2026-07-05 is a Sunday, 2026-07-06 a Monday.
    const sunday = summer(5, 23, 30);
    const monday = summer(6, 0, 30);
    expect(canClaim(reward, gold, tiers, sunday, sunday).ok).toBe(false);
    const blocked = canClaim(reward, gold, tiers, summer(1, 9), sunday);
    expect(blocked.reason).toBe("Already claimed this week");
    // Next Monday 00:00 BST.
    expect(blocked.nextClaimAt?.toISOString()).toBe("2026-07-05T23:00:00.000Z");
    expect(canClaim(reward, gold, tiers, sunday, monday).ok).toBe(true);
  });

  it("weekly: week boundary is midnight London, not UTC", () => {
    const reward = { tierId: null, claimRule: "weekly" as const };
    // 23:30 UTC on Sunday 5 July is 00:30 BST on Monday 6 July: a new week.
    const lateSundayUtc = new Date(Date.UTC(2026, 6, 5, 23, 30));
    expect(weekStart(lateSundayUtc).toISOString()).toBe("2026-07-05T23:00:00.000Z");
    expect(canClaim(reward, null, tiers, summer(5, 12), lateSundayUtc).ok).toBe(true);
  });

  it("monthly: one per calendar month", () => {
    const reward = { tierId: null, claimRule: "monthly" as const };
    const lastOfJuly = summer(31, 22);
    const firstOfAug = new Date(Date.UTC(2026, 7, 1, 8));
    expect(canClaim(reward, null, tiers, summer(2, 10), lastOfJuly)).toMatchObject({
      ok: false,
      reason: "Already claimed this month",
    });
    expect(canClaim(reward, null, tiers, summer(2, 10), lastOfJuly).nextClaimAt?.toISOString()).toBe("2026-07-31T23:00:00.000Z");
    expect(canClaim(reward, null, tiers, lastOfJuly, firstOfAug).ok).toBe(true);
  });

  it("monthly: January in GMT", () => {
    const reward = { tierId: null, claimRule: "monthly" as const };
    expect(monthStart(winter(15, 12)).toISOString()).toBe("2026-01-01T00:00:00.000Z");
    const check = canClaim(reward, null, tiers, winter(3, 9), winter(15, 12));
    expect(check.ok).toBe(false);
    expect(check.nextClaimAt?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(canClaim(reward, null, tiers, new Date(Date.UTC(2025, 11, 31, 23, 59)), winter(1, 0, 1)).ok).toBe(true);
  });
});

describe("isTierBenefit", () => {
  it("is a tier-limited reward that costs nothing", () => {
    expect(isTierBenefit({ tierId: "gold", costPoints: 0 })).toBe(true);
    expect(isTierBenefit({ tierId: "gold", costPoints: null })).toBe(true);
    expect(isTierBenefit({ tierId: "gold", costPoints: 50 })).toBe(false);
    expect(isTierBenefit({ tierId: null, costPoints: 0 })).toBe(false);
  });
});
