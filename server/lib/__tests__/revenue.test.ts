import { describe, it, expect } from "vitest";
import type { SubscriptionEvent } from "@shared/schema";
import {
  addMonthsClamped,
  buildHistory,
  buildMerchantCliffs,
  buildNext30Days,
  buildNow,
  buildResidentCliffs,
  eventsToCsv,
  merchantRenewalDates,
  monthKey,
  monthKeyOffset,
  type MerchantLike,
  type ResidentLike,
} from "../revenue";

const fees = { individual: 25, household: 50, merchantStandardMonthly: 30, merchantInsightMonthly: 75 };
const now = new Date("2026-09-07T12:00:00Z");

function event(partial: Partial<SubscriptionEvent>): SubscriptionEvent {
  return {
    id: "e",
    kind: "resident_membership",
    subjectId: "1",
    subjectName: "Someone",
    plan: "individual",
    action: "started",
    amountGbp: "25.00",
    periodStart: null,
    periodEnd: null,
    source: "dev",
    createdAt: now,
    ...partial,
  };
}

function resident(partial: Partial<ResidentLike>): ResidentLike {
  return { id: 1, name: "A", membershipPlan: "individual", membershipStatus: "active", membershipExpiry: new Date("2027-03-10T00:00:00Z"), membershipRenews: true, householdPrimaryId: null, ...partial };
}

function merchant(partial: Partial<MerchantLike>): MerchantLike {
  return { id: "m1", name: "Shop", status: "approved", planStatus: "standard", planStartedAt: new Date("2026-01-31T10:00:00Z"), planRenewsAt: null, ...partial };
}

describe("month keys", () => {
  it("uses Europe/London for the month boundary", () => {
    // 23:30 UTC on 31 July is 00:30 BST on 1 August.
    expect(monthKey(new Date("2026-07-31T23:30:00Z"))).toBe("2026-08");
    expect(monthKey(new Date("2026-01-31T23:30:00Z"))).toBe("2026-01");
  });

  it("offsets across year ends", () => {
    expect(monthKeyOffset(now, -11)).toBe("2025-10");
    expect(monthKeyOffset(now, 4)).toBe("2027-01");
  });
});

describe("buildHistory", () => {
  it("buckets amounts into the last 12 months, oldest first, with empty months present", () => {
    const events = [
      event({ createdAt: new Date("2026-09-01T09:00:00Z"), amountGbp: "25.00" }),
      event({ createdAt: new Date("2026-09-02T09:00:00Z"), amountGbp: "50.00", plan: "household", action: "renewed" }),
      event({ createdAt: new Date("2026-08-15T09:00:00Z"), kind: "merchant_premium", plan: "premium", amountGbp: "30.00" }),
      event({ createdAt: new Date("2026-08-20T09:00:00Z"), kind: "merchant_premium", plan: "premium", action: "cancelled", amountGbp: "0.00" }),
      event({ createdAt: new Date("2025-09-20T09:00:00Z"), amountGbp: "999.00" }), // outside the window
      event({ createdAt: new Date("2026-06-01T09:00:00Z"), action: "cancelled", amountGbp: "0.00" }),
    ];
    const history = buildHistory(events, now);
    expect(history).toHaveLength(12);
    expect(history[0].month).toBe("2025-10");
    expect(history[11]).toMatchObject({ month: "2026-09", residents: 75, merchants: 0, total: 75, newResidents: 1, renewedResidents: 1 });
    expect(history[10]).toMatchObject({ month: "2026-08", residents: 0, merchants: 30, total: 30, newMerchants: 1, cancelledMerchants: 1 });
    expect(history[8]).toMatchObject({ month: "2026-06", cancelledResidents: 1, total: 0 });
    expect(history.reduce((s, m) => s + m.total, 0)).toBe(105);
  });
});

describe("resident cliffs", () => {
  it("counts expiries per month and values them at current fees", () => {
    const residents = [
      resident({ id: 1, membershipExpiry: new Date("2026-11-05T00:00:00Z") }),
      resident({ id: 2, membershipExpiry: new Date("2026-11-20T00:00:00Z"), membershipPlan: "household", membershipRenews: false }),
      resident({ id: 3, membershipExpiry: new Date("2027-02-01T00:00:00Z") }),
      resident({ id: 4, membershipExpiry: new Date("2026-08-01T00:00:00Z") }), // already expired
      resident({ id: 5, membershipStatus: "cancelled" }),
    ];
    const cliffs = buildResidentCliffs(residents, fees, now);
    expect(cliffs).toHaveLength(12);
    // The household with a scheduled downgrade is still an expiry in November, just flagged.
    expect(cliffs.find((c) => c.month === "2026-11")).toEqual({ month: "2026-11", count: 2, individual: 1, household: 1, amount: 75, notRenewing: 1 });
    expect(cliffs.find((c) => c.month === "2027-02")).toEqual({ month: "2027-02", count: 1, individual: 1, household: 0, amount: 25, notRenewing: 0 });
    expect(cliffs.reduce((s, c) => s + c.count, 0)).toBe(3);
    expect(buildNow(residents, [], fees, now).residents).toMatchObject({ active: 3, notRenewing: 1 });
  });

  it("counts a household as one payer (the primary), never the second adult", () => {
    const residents = [
      resident({ id: 10, membershipPlan: "household", membershipExpiry: new Date("2026-10-01T00:00:00Z") }),
      resident({ id: 11, membershipPlan: "household", membershipExpiry: new Date("2026-10-01T00:00:00Z"), householdPrimaryId: 10 }),
    ];
    const cliffs = buildResidentCliffs(residents, fees, now);
    expect(cliffs.find((c) => c.month === "2026-10")).toMatchObject({ count: 1, household: 1, amount: 50 });
    const current = buildNow(residents, [], fees, now);
    expect(current.residents).toMatchObject({ active: 1, individual: 0, household: 1, expiringIn30Days: 1 });
    expect(current.runRate.monthly).toBeCloseTo(50 / 12, 2);
    expect(buildNext30Days(residents, [], fees, now)).toHaveLength(1);
  });
});

describe("merchant renewals", () => {
  it("clamps the anniversary of a 31st to the end of shorter months", () => {
    const jan31 = new Date(2026, 0, 31, 10, 0, 0);
    expect(addMonthsClamped(jan31, 1).getDate()).toBe(28);
    expect(addMonthsClamped(jan31, 1).getMonth()).toBe(1);
    expect(addMonthsClamped(jan31, 2).getDate()).toBe(31);
    expect(addMonthsClamped(jan31, 3).getDate()).toBe(30);
  });

  it("uses the monthly anniversary of planStartedAt when planRenewsAt is null", () => {
    const started = new Date(2026, 0, 31, 10, 0, 0);
    const dates = merchantRenewalDates(merchant({ planStartedAt: started }), now, 12);
    expect(dates[0].getMonth()).toBe(8); // September
    expect(dates[0].getDate()).toBe(30);
    expect(dates[1].getDate()).toBe(31); // October
    expect(dates[2].getDate()).toBe(30); // November
    expect(dates).toHaveLength(12);
    const cliffs = buildMerchantCliffs([merchant({ planStartedAt: started })], fees, now);
    expect(cliffs.every((c) => c.count === 1 && c.amount === 30)).toBe(true);
  });

  it("uses planRenewsAt when it is set and in the future", () => {
    const renews = new Date("2026-09-20T00:00:00Z");
    const list = buildNext30Days([], [merchant({ planRenewsAt: renews })], fees, now);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "merchant_premium", plan: "standard", amount: 30, expiresAt: renews.toISOString() });
  });

  it("values each renewal at its own tier, and reads a legacy premium row as Standard", () => {
    const renews = new Date("2026-09-20T00:00:00Z");
    const rows = [
      merchant({ id: "m1", planStatus: "standard", planRenewsAt: renews }),
      merchant({ id: "m2", planStatus: "insight", planRenewsAt: renews }),
      merchant({ id: "m3", planStatus: "premium", planRenewsAt: renews }),
    ];
    expect(buildMerchantCliffs(rows, fees, now).find((c) => c.month === "2026-09")).toMatchObject({ count: 3, amount: 135 });
    const list = buildNext30Days([], rows, fees, now);
    expect(list.map((r) => [r.plan, r.amount])).toEqual([["standard", 30], ["insight", 75], ["standard", 30]]);
  });

  it("ignores free merchants", () => {
    expect(buildMerchantCliffs([merchant({ planStatus: "free" })], fees, now).every((c) => c.count === 0)).toBe(true);
    expect(buildMerchantCliffs([merchant({ planStatus: null })], fees, now).every((c) => c.count === 0)).toBe(true);
  });

  it("counts each tier and adds the right fee to the run rate", () => {
    const rows = [
      merchant({ id: "m1", planStatus: "standard" }),
      merchant({ id: "m2", planStatus: "insight" }),
      merchant({ id: "m3", planStatus: "premium" }),
      merchant({ id: "m4", planStatus: "free" }),
    ];
    const current = buildNow([], rows, fees, now);
    expect(current.merchants).toEqual({ paying: 3, standard: 2, insight: 1, free: 1, approved: 4 });
    expect(current.runRate.monthly).toBe(135);
    expect(current.runRate.annual).toBe(1620);
  });
});

describe("csv", () => {
  it("writes the documented columns and escapes commas", () => {
    const csv = eventsToCsv([event({ subjectName: "Fish, Chips", createdAt: new Date("2026-09-01T09:00:00Z") })]);
    const [header, row] = csv.trim().split("\n");
    expect(header).toBe("kind,subject,plan,action,amount,period_start,period_end,source,created_at");
    expect(row).toBe('resident_membership,"Fish, Chips",individual,started,25.00,,,dev,2026-09-01T09:00:00.000Z');
  });
});
