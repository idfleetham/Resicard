import { describe, it, expect } from "vitest";
import {
  MIN_EXPIRY_DAYS,
  effectiveExpiryDays,
  expiryKeyDate,
  expiryState,
  warningDue,
} from "../points-expiry";

const day = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-09-08T12:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * day);

describe("effectiveExpiryDays", () => {
  it("treats null, undefined and zero as never expiring", () => {
    expect(effectiveExpiryDays(null)).toBeNull();
    expect(effectiveExpiryDays(undefined)).toBeNull();
    expect(effectiveExpiryDays(0)).toBeNull();
    expect(effectiveExpiryDays(-30)).toBeNull();
  });

  it("passes a sensible setting through", () => {
    expect(effectiveExpiryDays(365)).toBe(365);
    expect(effectiveExpiryDays(730)).toBe(730);
  });

  it("raises anything under the floor to the floor rather than honouring it", () => {
    expect(effectiveExpiryDays(30)).toBe(MIN_EXPIRY_DAYS);
    expect(effectiveExpiryDays(89)).toBe(MIN_EXPIRY_DAYS);
    expect(effectiveExpiryDays(90)).toBe(90);
  });
});

describe("expiryState", () => {
  it("is off when the programme does not expire points", () => {
    const s = expiryState({ lastActivityAt: ago(900), expiryDays: null, points: 400 }, NOW);
    expect(s).toEqual({ expiresAt: null, expired: false, daysLeft: null });
  });

  it("has nothing to expire when the balance is empty", () => {
    const s = expiryState({ lastActivityAt: ago(900), expiryDays: 365, points: 0 }, NOW);
    expect(s.expiresAt).toBeNull();
    expect(s.expired).toBe(false);
  });

  it("counts from the last visit, not from when points were earned", () => {
    const s = expiryState({ lastActivityAt: ago(10), expiryDays: 365, points: 1200 }, NOW);
    expect(s.expired).toBe(false);
    expect(s.daysLeft).toBe(355);
  });

  it("expires a balance untouched for longer than the window", () => {
    const s = expiryState({ lastActivityAt: ago(366), expiryDays: 365, points: 1200 }, NOW);
    expect(s.expired).toBe(true);
    expect(s.daysLeft).toBe(0);
  });

  it("does not expire on the very last day", () => {
    const s = expiryState({ lastActivityAt: ago(364), expiryDays: 365, points: 1200 }, NOW);
    expect(s.expired).toBe(false);
  });

  it("a regular never loses anything, however long they have been a member", () => {
    // Ten years a member, in last week: the balance is safe.
    const s = expiryState({ lastActivityAt: ago(3), expiryDays: 365, points: 25000 }, NOW);
    expect(s.expired).toBe(false);
    expect(s.daysLeft).toBe(362);
  });

  it("treats a resident who has never earned as having nothing to lose", () => {
    const s = expiryState({ lastActivityAt: null, expiryDays: 365, points: 0 }, NOW);
    expect(s.expiresAt).toBeNull();
  });
});

describe("warningDue", () => {
  const state = (daysSinceVisit: number) =>
    expiryState({ lastActivityAt: ago(daysSinceVisit), expiryDays: 365, points: 500 }, NOW);

  it("is not due while there is plenty of time", () => {
    expect(warningDue(state(100), 30)).toBe(false);
  });

  it("is due once inside the window", () => {
    expect(warningDue(state(340), 30)).toBe(true);
    expect(warningDue(state(364), 30)).toBe(true);
  });

  it("is not due after it has already gone", () => {
    expect(warningDue(state(400), 30)).toBe(false);
  });

  it("is never due when expiry is off", () => {
    const off = expiryState({ lastActivityAt: ago(900), expiryDays: null, points: 500 }, NOW);
    expect(warningDue(off, 30)).toBe(false);
  });
});

describe("expiryKeyDate", () => {
  it("is the expiry day, so a fresh visit earns a fresh warning", () => {
    const first = expiryState({ lastActivityAt: ago(340), expiryDays: 365, points: 500 }, NOW);
    const afterAVisit = expiryState({ lastActivityAt: ago(1), expiryDays: 365, points: 500 }, NOW);
    expect(expiryKeyDate(first.expiresAt!)).not.toBe(expiryKeyDate(afterAVisit.expiresAt!));
    expect(expiryKeyDate(new Date("2027-03-14T09:00:00Z"))).toBe("2027-03-14");
  });
});
