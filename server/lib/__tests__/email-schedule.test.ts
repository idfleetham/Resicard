import { describe, it, expect } from "vitest";
import {
  daysBetween,
  dueEmails,
  reminderDedupeKey,
  reminderWindow,
  startOfDay,
  type MembershipSnapshot,
} from "../email-schedule";

const today = new Date("2026-09-08T09:30:00Z");
const inDays = (n: number) => new Date(Date.UTC(2026, 8, 8 + n, 12, 0, 0));

const paidMember = (over: Partial<MembershipSnapshot> = {}): MembershipSnapshot => ({
  userId: 1,
  email: "resident@example.com",
  firstName: "Ailsa",
  status: "active",
  expiry: inDays(30),
  renews: true,
  hasPaid: true,
  ...over,
});

const kinds = (rows: MembershipSnapshot[]) => dueEmails(rows, today).map((d) => d.kind);

describe("day arithmetic", () => {
  it("counts calendar days, not 24-hour blocks", () => {
    expect(daysBetween("2026-09-08T23:00:00Z", "2026-09-09T01:00:00Z")).toBe(1);
    expect(daysBetween(today, inDays(7))).toBe(7);
    expect(daysBetween(today, inDays(-1))).toBe(-1);
    expect(startOfDay(today).toISOString()).toBe("2026-09-08T00:00:00.000Z");
  });

  it("loads only the expiries that could matter today", () => {
    const window = reminderWindow(today);
    expect(window.from.toISOString().slice(0, 10)).toBe("2026-08-31");
    expect(window.to.toISOString().slice(0, 10)).toBe("2026-10-09");
  });
});

describe("renewal reminders", () => {
  it("sends the thirty day notice inside the thirty day band", () => {
    expect(kinds([paidMember({ expiry: inDays(30) })])).toEqual(["renewal_30"]);
    expect(kinds([paidMember({ expiry: inDays(12) })])).toEqual(["renewal_30"]);
  });

  it("sends the seven day notice inside the seven day band, and only that one", () => {
    expect(kinds([paidMember({ expiry: inDays(7) })])).toEqual(["renewal_7"]);
    expect(kinds([paidMember({ expiry: inDays(1) })])).toEqual(["renewal_7"]);
    expect(kinds([paidMember({ expiry: inDays(0) })])).toEqual(["renewal_7"]);
  });

  it("says nothing more than a month out", () => {
    expect(kinds([paidMember({ expiry: inDays(31) })])).toEqual([]);
  });

  it("says nothing about renewing when renewal is switched off", () => {
    expect(kinds([paidMember({ expiry: inDays(7), renews: false })])).toEqual([]);
  });

  it("says nothing for a membership that is not active", () => {
    expect(kinds([paidMember({ status: "cancelled" })])).toEqual([]);
  });
});

describe("trial and lapse", () => {
  it("warns a week before the first charge, not about a renewal", () => {
    expect(kinds([paidMember({ hasPaid: false, expiry: inDays(7) })])).toEqual(["trial_ending"]);
    expect(kinds([paidMember({ hasPaid: false, expiry: inDays(2) })])).toEqual(["trial_ending"]);
    expect(kinds([paidMember({ hasPaid: false, expiry: inDays(30) })])).toEqual([]);
  });

  it("tells someone the day after their membership ran out", () => {
    expect(kinds([paidMember({ expiry: inDays(-1), status: "inactive" })])).toEqual(["membership_lapsed"]);
    expect(kinds([paidMember({ expiry: inDays(-1), hasPaid: false })])).toEqual(["membership_lapsed"]);
  });

  it("catches up for a week after an expiry but no longer", () => {
    expect(kinds([paidMember({ expiry: inDays(-7), status: "inactive" })])).toEqual(["membership_lapsed"]);
    expect(kinds([paidMember({ expiry: inDays(-8), status: "inactive" })])).toEqual([]);
  });
});

describe("who is left out", () => {
  it("skips the second adult of a household, who is never billed", () => {
    expect(kinds([paidMember({ householdPrimaryId: 9 })])).toEqual([]);
  });

  it("skips a member with no email and a membership that never started", () => {
    expect(kinds([paidMember({ email: null })])).toEqual([]);
    expect(kinds([paidMember({ expiry: null })])).toEqual([]);
  });
});

describe("dedupe keys", () => {
  it("name the member and the period, so a reminder cannot repeat inside one period", () => {
    const [due] = dueEmails([paidMember({ expiry: inDays(7) })], today);
    expect(due.dedupeKey).toBe("renewal_7:1:2026-09-15");
    expect(dueEmails([paidMember({ expiry: inDays(7) })], new Date("2026-09-09T23:00:00Z"))[0].dedupeKey).toBe(due.dedupeKey);
  });

  it("change with the period, so next year's reminder is a different message", () => {
    expect(reminderDedupeKey("renewal_30", 4, "2027-01-02T00:00:00Z")).toBe("renewal_30:4:2027-01-02");
    expect(reminderDedupeKey("renewal_30", 4, "2028-01-02T00:00:00Z")).not.toBe("renewal_30:4:2027-01-02");
  });

  it("differ per member and per kind", () => {
    expect(reminderDedupeKey("renewal_7", 1, "2027-01-02Z")).not.toBe(reminderDedupeKey("renewal_30", 1, "2027-01-02Z"));
    expect(reminderDedupeKey("renewal_7", 1, "2027-01-02Z")).not.toBe(reminderDedupeKey("renewal_7", 2, "2027-01-02Z"));
  });
});
