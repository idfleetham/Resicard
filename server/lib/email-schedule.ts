// Which member is due which reminder, given a list of memberships and a date.
// No database and no email provider, so the thresholds can be tested on their own.
//
// Every rule here is a band rather than an exact day ("thirty days or fewer, but
// more than seven"), because a job that only fires on the exact day silently
// misses everyone whenever a run is skipped. Repeats are not a risk: the dedupe
// key names the membership period, so a reminder for a period can only ever be
// sent once however often the job runs.

export type ReminderKind = "trial_ending" | "renewal_30" | "renewal_7" | "membership_lapsed";

/** Seven days before the first charge, which for a trial is the expiry date. */
export const TRIAL_ENDING_DAYS = 7;

/** The two renewal thresholds, in days before the membership expiry. */
export const RENEWAL_REMINDER_DAYS = [30, 7] as const;

/** How long after an expiry the lapsed message may still go out, so a skipped run catches up. */
export const LAPSED_GRACE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The subset of a membership the reminder rules need. */
export interface MembershipSnapshot {
  userId: number;
  email: string | null;
  firstName?: string | null;
  status: string | null;
  expiry: Date | string | null;
  renews?: boolean | null;
  /** True once the member has actually been charged. Someone who has not is on the trial. */
  hasPaid: boolean;
  /** Set on the second adult of a household: they are covered by the primary and never billed. */
  householdPrimaryId?: number | null;
}

export interface DueEmail {
  userId: number;
  email: string;
  firstName: string | null;
  kind: ReminderKind;
  /** The end of the membership period the message is about. */
  expiry: Date;
  dedupeKey: string;
}

/** Midnight UTC on the day the given moment falls in. Calendar days, not 24-hour blocks. */
export function startOfDay(value: Date | string): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Whole days from `from` to `to`; positive when `to` is later. */
export function daysBetween(from: Date | string, to: Date | string): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function isoDay(value: Date | string): string {
  return startOfDay(value).toISOString().slice(0, 10);
}

/**
 * The key that makes a reminder unrepeatable: the kind, the member and the
 * membership period it is about. A renewal moves the expiry, so the next period
 * gets its own key and its own reminders.
 */
export function reminderDedupeKey(kind: ReminderKind, userId: number, expiry: Date | string): string {
  return `${kind}:${userId}:${isoDay(expiry)}`;
}

/** The expiry range worth loading for a given day, so the job reads a handful of rows. */
export function reminderWindow(today: Date): { from: Date; to: Date } {
  const start = startOfDay(today);
  return {
    from: new Date(start.getTime() - (LAPSED_GRACE_DAYS + 1) * DAY_MS),
    to: new Date(start.getTime() + (RENEWAL_REMINDER_DAYS[0] + 1) * DAY_MS),
  };
}

function reminderFor(row: MembershipSnapshot, today: Date): ReminderKind | null {
  if (!row.expiry) return null;
  const days = daysBetween(today, row.expiry);

  // The day after expiry, and for a week after in case a run was missed.
  if (days < 0) return days >= -LAPSED_GRACE_DAYS ? "membership_lapsed" : null;

  // Everything below is about a membership that is still running.
  if (row.status !== "active") return null;
  // A trial's expiry is the day of the first charge, so the trial notice replaces
  // the renewal one: telling someone their membership renews before they have paid
  // for it once would be the wrong message.
  if (!row.hasPaid) return days <= TRIAL_ENDING_DAYS ? "trial_ending" : null;
  // Renewal is switched off, so there is nothing coming to warn them about. They
  // still get the lapsed message on the day after.
  if (row.renews === false) return null;
  if (days <= RENEWAL_REMINDER_DAYS[1]) return "renewal_7";
  if (days <= RENEWAL_REMINDER_DAYS[0]) return "renewal_30";
  return null;
}

/** Every reminder due today, at most one per member. */
export function dueEmails(rows: MembershipSnapshot[], today: Date): DueEmail[] {
  const due: DueEmail[] = [];
  for (const row of rows) {
    // The second adult of a household is covered by the primary and pays nothing,
    // so billing reminders would be about someone else's money.
    if (row.householdPrimaryId) continue;
    if (!row.email) continue;
    const kind = reminderFor(row, today);
    if (!kind || !row.expiry) continue;
    due.push({
      userId: row.userId,
      email: row.email,
      firstName: row.firstName ?? null,
      kind,
      expiry: new Date(row.expiry),
      dedupeKey: reminderDedupeKey(kind, row.userId, row.expiry),
    });
  }
  return due;
}
