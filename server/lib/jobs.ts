import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { log } from "../vite";
import { emailService } from "../email";
import { sendOnce } from "./mailer";
import { hasEverPaid } from "./ledger";
import { dueEmails, reminderWindow, type DueEmail, type MembershipSnapshot } from "./email-schedule";

// The daily job. It reads the memberships whose expiry falls anywhere near a
// threshold, asks email-schedule.ts what each one is due, and sends what has not
// been sent. Nothing here decides thresholds; nothing there touches a database.

export interface DailyJobSummary {
  ranAt: string;
  considered: number;
  sent: Record<string, number>;
  alreadySent: number;
  failed: number;
}

async function loadMemberships(today: Date): Promise<MembershipSnapshot[]> {
  const window = reminderWindow(today);
  const rows = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, "resident"),
        isNotNull(users.membershipExpiry),
        gte(users.membershipExpiry, window.from),
        lte(users.membershipExpiry, window.to),
      ),
    );
  return Promise.all(
    rows.map(async (u) => ({
      userId: u.id,
      email: u.email,
      firstName: u.firstName,
      status: u.membershipStatus,
      expiry: u.membershipExpiry,
      renews: u.membershipRenews,
      householdPrimaryId: u.householdPrimaryId,
      // A member who has never been charged is on the free trial, so the expiry
      // in front of them is the first charge rather than a renewal.
      hasPaid: await hasEverPaid("resident_membership", String(u.id)),
    })),
  );
}

function send(due: DueEmail): Promise<void> {
  switch (due.kind) {
    case "trial_ending":
      return emailService.sendTrialEnding(due.email, due.expiry, due.firstName);
    case "renewal_30":
      return emailService.sendRenewalReminder(due.email, 30, due.expiry, due.firstName);
    case "renewal_7":
      return emailService.sendRenewalReminder(due.email, 7, due.expiry, due.firstName);
    case "membership_lapsed":
      return emailService.sendMembershipLapsed(due.email, due.expiry, due.firstName);
  }
}

/**
 * Idempotent: safe to run many times a day. Every message is written to
 * `email_log` under a key naming the membership period, so a second run finds the
 * key taken and sends nothing.
 */
export async function runDailyJobs(today: Date = new Date()): Promise<DailyJobSummary> {
  const memberships = await loadMemberships(today);
  const due = dueEmails(memberships, today);
  const summary: DailyJobSummary = { ranAt: today.toISOString(), considered: memberships.length, sent: {}, alreadySent: 0, failed: 0 };

  for (const item of due) {
    const outcome = await sendOnce(item.userId, item.kind, item.dedupeKey, () => send(item));
    if (outcome === "sent") summary.sent[item.kind] = (summary.sent[item.kind] ?? 0) + 1;
    else if (outcome === "duplicate") summary.alreadySent += 1;
    else summary.failed += 1;
  }

  const total = Object.values(summary.sent).reduce((a, b) => a + b, 0);
  log(`daily: ${memberships.length} memberships, ${total} sent, ${summary.alreadySent} already sent, ${summary.failed} failed`, "jobs");
  return summary;
}
