import { describe, it, expect } from "vitest";
import { PERIOD_KEYS, isPeriodKey, periodDays, periodWeeks, resolvePeriod } from "@shared/periods";

/*
  The comparison window is the part that can quietly mislead a merchant, so it is
  the part worth pinning down. Six weeks into a quarter, comparing against a full
  previous quarter would report a collapse every time.
*/

// A Wednesday six weeks into Q3.
const AUG_12 = new Date("2026-08-12T10:00:00.000Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("resolvePeriod", () => {
  it("defaults the quarter to the quarter that is running", () => {
    const p = resolvePeriod("quarter", AUG_12);
    expect(iso(p.from)).toBe("2026-07-01");
    expect(iso(p.to)).toBe("2026-08-12");
  });

  it("compares a part-finished quarter with the same elapsed days of the last one", () => {
    const p = resolvePeriod("quarter", AUG_12);
    expect(iso(p.compareFrom)).toBe("2026-04-01");
    // 1 July to 12 August is 42 days, so the comparison ends 42 days after 1 April.
    expect(iso(p.compareTo)).toBe("2026-05-13");
    expect(p.compareTo.getTime() - p.compareFrom.getTime()).toBe(p.to.getTime() - p.from.getTime());
  });

  it("takes last quarter whole, against the quarter before it", () => {
    const p = resolvePeriod("last-quarter", AUG_12);
    expect(iso(p.from)).toBe("2026-04-01");
    expect(iso(p.to)).toBe("2026-07-01");
    expect(iso(p.compareFrom)).toBe("2026-01-01");
  });

  it("handles the quarter that crosses the year", () => {
    const p = resolvePeriod("last-quarter", new Date("2026-02-10T00:00:00.000Z"));
    expect(iso(p.from)).toBe("2025-10-01");
    expect(iso(p.to)).toBe("2026-01-01");
  });

  it("compares a part-finished month with the same days of the month before", () => {
    const p = resolvePeriod("month", AUG_12);
    expect(iso(p.from)).toBe("2026-08-01");
    expect(iso(p.compareFrom)).toBe("2026-07-01");
    expect(p.compareTo.getTime() - p.compareFrom.getTime()).toBe(p.to.getTime() - p.from.getTime());
  });

  it("takes last month whole", () => {
    const p = resolvePeriod("last-month", AUG_12);
    expect(iso(p.from)).toBe("2026-07-01");
    expect(iso(p.to)).toBe("2026-08-01");
  });

  it("makes a rolling window exactly as long as it says", () => {
    for (const [key, days] of [["30d", 30], ["90d", 90]] as const) {
      expect(periodDays(resolvePeriod(key, AUG_12))).toBe(days);
    }
  });

  it("puts a rolling window's comparison immediately before it", () => {
    const p = resolvePeriod("90d", AUG_12);
    expect(p.compareTo.getTime()).toBe(p.from.getTime());
    expect(p.from.getTime() - p.compareFrom.getTime()).toBe(p.to.getTime() - p.from.getTime());
  });

  it("uses the custom range it is given", () => {
    const p = resolvePeriod("custom", AUG_12, {
      from: new Date("2026-05-01T00:00:00.000Z"),
      to: new Date("2026-05-31T00:00:00.000Z"),
    });
    expect(iso(p.from)).toBe("2026-05-01");
    expect(iso(p.to)).toBe("2026-05-31");
    expect(iso(p.compareFrom)).toBe("2026-04-01");
  });

  it("straightens out a custom range entered backwards rather than returning nothing", () => {
    const p = resolvePeriod("custom", AUG_12, {
      from: new Date("2026-05-31T00:00:00.000Z"),
      to: new Date("2026-05-01T00:00:00.000Z"),
    });
    expect(iso(p.from)).toBe("2026-05-01");
    expect(iso(p.to)).toBe("2026-05-31");
  });

  /*
    Calendar periods are the exception on purpose: Q1 is 90 days and Q2 is 91, and
    a merchant comparing quarters wants whole quarters, not 91 days that reach
    back into December.
  */
  it("matches the comparison window to the period length, except for calendar periods", () => {
    for (const key of PERIOD_KEYS) {
      if (key === "last-quarter" || key === "last-month") continue;
      const p = resolvePeriod(key, AUG_12);
      expect(p.compareTo.getTime() - p.compareFrom.getTime(), key).toBe(p.to.getTime() - p.from.getTime());
    }
  });

  it("compares a calendar period with the whole calendar period before it", () => {
    const q = resolvePeriod("last-quarter", AUG_12);
    expect(iso(q.compareFrom)).toBe("2026-01-01");
    expect(iso(q.compareTo)).toBe("2026-04-01");
    const m = resolvePeriod("last-month", AUG_12);
    expect(iso(m.compareFrom)).toBe("2026-06-01");
    expect(iso(m.compareTo)).toBe("2026-07-01");
  });

  it("never produces a period that ends before it starts", () => {
    for (const key of PERIOD_KEYS) {
      const p = resolvePeriod(key, AUG_12);
      expect(p.to.getTime(), key).toBeGreaterThan(p.from.getTime());
      expect(p.compareTo.getTime(), key).toBeGreaterThan(p.compareFrom.getTime());
    }
  });

  it("always compares against a window that ends no later than the period starts", () => {
    for (const key of PERIOD_KEYS) {
      const p = resolvePeriod(key, AUG_12);
      expect(p.compareTo.getTime(), key).toBeLessThanOrEqual(p.from.getTime());
    }
  });

  it("keeps the weekly chart between four and twenty-six columns", () => {
    for (const key of PERIOD_KEYS) {
      const weeks = periodWeeks(resolvePeriod(key, AUG_12));
      expect(weeks, key).toBeGreaterThanOrEqual(4);
      expect(weeks, key).toBeLessThanOrEqual(26);
    }
  });

  it("works on the first day of a quarter without collapsing to nothing", () => {
    const p = resolvePeriod("quarter", new Date("2026-07-01T00:30:00.000Z"));
    expect(periodDays(p)).toBeGreaterThanOrEqual(1);
    expect(p.compareTo.getTime()).toBeGreaterThan(p.compareFrom.getTime());
  });
});

describe("isPeriodKey", () => {
  it("accepts every key the app offers", () => {
    for (const key of PERIOD_KEYS) expect(isPeriodKey(key)).toBe(true);
  });

  it("rejects anything else, so a hand-typed query string cannot change the window", () => {
    for (const value of ["", "  ", "forever", "1=1", null, undefined]) {
      expect(isPeriodKey(value as string | null)).toBe(false);
    }
  });
});
