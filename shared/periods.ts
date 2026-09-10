/**
 * The observation period for merchant analytics.
 *
 * Everything used to be a fixed ninety days against the ninety before. A
 * publican thinks in quarters and in "how was August", so the period is now
 * chosen, and it defaults to this quarter against the last one.
 *
 * The comparison window is the interesting part. Two different rules, because
 * the honest comparison differs:
 *
 * - A **period to date** (this quarter, this month, this year) is compared with
 *   the same number of elapsed days from the start of the previous one. Six
 *   weeks into a quarter you are measured against the first six weeks of the
 *   last quarter, not against all thirteen of its weeks, which would make every
 *   quarter look like a collapse until the last day of it.
 * - A **complete period** (last quarter, a rolling 90 days, a custom range) is
 *   compared with the equally long window immediately before it.
 *
 * All arithmetic is UTC, matching the rest of the reporting.
 */

export const PERIOD_KEYS = [
  "quarter",
  "last-quarter",
  "month",
  "last-month",
  "30d",
  "90d",
  "year",
  "custom",
] as const;

export type PeriodKey = (typeof PERIOD_KEYS)[number];

export const DEFAULT_PERIOD: PeriodKey = "quarter";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  quarter: "This quarter",
  "last-quarter": "Last quarter",
  month: "This month",
  "last-month": "Last month",
  "30d": "30 days",
  "90d": "90 days",
  year: "This year",
  custom: "Custom",
};

export interface ResolvedPeriod {
  from: Date;
  to: Date;
  /** The equivalent earlier window everything is compared against. */
  compareFrom: Date;
  compareTo: Date;
  /** How the comparison should be described, e.g. "the same days last quarter". */
  compareLabel: string;
}

const DAY_MS = 86_400_000;

export function isPeriodKey(value: string | null | undefined): value is PeriodKey {
  return PERIOD_KEYS.includes((value ?? "") as PeriodKey);
}

function startOfQuarter(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1));
}

function addMonths(d: Date, months: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
}

/** A period that runs from a start to now, measured against the same span of the previous one. */
function toDate(start: Date, previousStart: Date, now: Date, compareLabel: string): ResolvedPeriod {
  const elapsed = Math.max(DAY_MS, now.getTime() - start.getTime());
  return {
    from: start,
    to: now,
    compareFrom: previousStart,
    compareTo: new Date(previousStart.getTime() + elapsed),
    compareLabel,
  };
}

/** A finished rolling window, measured against the equally long window before it. */
function completed(from: Date, to: Date, compareLabel: string): ResolvedPeriod {
  const span = Math.max(DAY_MS, to.getTime() - from.getTime());
  return { from, to, compareFrom: new Date(from.getTime() - span), compareTo: from, compareLabel };
}

/**
 * A finished calendar period against the calendar period before it.
 *
 * Not the same as subtracting its length: Q2 is 91 days and Q1 is 90, so
 * "91 days before 1 April" lands on 31 December and quietly counts a day of the
 * old year into the comparison. Quarters are compared as quarters.
 */
function calendarBefore(from: Date, to: Date, months: number, compareLabel: string): ResolvedPeriod {
  return { from, to, compareFrom: addMonths(from, -months), compareTo: from, compareLabel };
}

export function resolvePeriod(
  key: PeriodKey,
  now: Date,
  custom?: { from?: Date | null; to?: Date | null },
): ResolvedPeriod {
  switch (key) {
    case "quarter": {
      const start = startOfQuarter(now);
      return toDate(start, addMonths(start, -3), now, "the same days last quarter");
    }
    case "last-quarter": {
      const thisStart = startOfQuarter(now);
      return calendarBefore(addMonths(thisStart, -3), thisStart, 3, "the quarter before");
    }
    case "month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return toDate(start, addMonths(start, -1), now, "the same days last month");
    }
    case "last-month": {
      const thisStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return calendarBefore(addMonths(thisStart, -1), thisStart, 1, "the month before");
    }
    case "year": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      return toDate(start, new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)), now, "the same days last year");
    }
    case "30d":
      return completed(new Date(now.getTime() - 30 * DAY_MS), now, "the 30 days before");
    case "90d":
      return completed(new Date(now.getTime() - 90 * DAY_MS), now, "the 90 days before");
    case "custom": {
      const to = custom?.to ?? now;
      const from = custom?.from ?? new Date(to.getTime() - 30 * DAY_MS);
      // A backwards range is the user's slip, not a reason to return nothing.
      const [a, b] = from <= to ? [from, to] : [to, from];
      return completed(a, b, "the same length of time before");
    }
  }
}

/** Whole days in the period, at least one, for describing it and sizing the weekly chart. */
export function periodDays(period: ResolvedPeriod): number {
  return Math.max(1, Math.round((period.to.getTime() - period.from.getTime()) / DAY_MS));
}

/** Week columns for the period: never fewer than 4 to plot, never more than 26 to read. */
export function periodWeeks(period: ResolvedPeriod): number {
  return Math.min(26, Math.max(4, Math.ceil(periodDays(period) / 7)));
}
