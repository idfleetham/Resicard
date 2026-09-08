import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { log } from "../vite";
import { emailService } from "../email";
import { sendOnce } from "./mailer";
import { hasEverPaid } from "./ledger";
import { dueEmails, reminderWindow, type DueEmail, type MembershipSnapshot } from "./email-schedule";
import * as loyaltyStore from "../storage/loyalty";
import { expiryKeyDate, expiryState, warningDue } from "./points-expiry";
import { dedupeKeys } from "./mailer";
import { config } from "../config";

// The daily job. It reads the memberships whose expiry falls anywhere near a
// threshold, asks email-schedule.ts what each one is due, and sends what has not
// been sent. Nothing here decides thresholds; nothing there touches a database.

export interface DailyJobSummary {
  ranAt: string;
  considered: number;
  sent: Record<string, number>;
  alreadySent: number;
  failed: number;
  /** Balances cleared because the resident had not been in for the outlet's window. */
  pointsExpired: number;
  /** Points cleared in total, across those balances. */
  pointsExpiredTotal: number;
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
  const summary: DailyJobSummary = {
    ranAt: today.toISOString(), considered: memberships.length, sent: {}, alreadySent: 0, failed: 0,
    pointsExpired: 0, pointsExpiredTotal: 0,
  };

  for (const item of due) {
    const outcome = await sendOnce(item.userId, item.kind, item.dedupeKey, () => send(item));
    if (outcome === "sent") summary.sent[item.kind] = (summary.sent[item.kind] ?? 0) + 1;
    else if (outcome === "duplicate") summary.alreadySent += 1;
    else summary.failed += 1;
  }

  await expirePoints(summary, today);

  const total = Object.values(summary.sent).reduce((a, b) => a + b, 0);
  log(
    `daily: ${memberships.length} memberships, ${total} sent, ${summary.alreadySent} already sent, ` +
      `${summary.failed} failed, ${summary.pointsExpired} balances expired (${summary.pointsExpiredTotal} points)`,
    "jobs",
  );
  return summary;
}

/**
 * Clears points at outlets whose programme expires them, and warns the residents
 * approaching that date.
 *
 * The clearing writes an `adjust` event for the amount removed, so the balance and
 * the event history still agree and a merchant asking "where did their points go"
 * has an answer. That event is negative, so it does not count towards tier status
 * and cannot promote anyone by being written.
 *
 * Runs after the membership emails and swallows its own failures: a loyalty
 * balance is not worth failing a job that also sends renewal reminders.
 */
async function expirePoints(summary: DailyJobSummary, today: Date): Promise<void> {
  let rows: Awaited<ReturnType<typeof loyaltyStore.listBalancesWithExpiry>>;
  try {
    rows = await loyaltyStore.listBalancesWithExpiry();
  } catch (err) {
    log(`daily: could not read loyalty balances: ${(err as Error).message}`, "jobs");
    return;
  }

  for (const row of rows) {
    const points = row.points ?? 0;
    const lastActivityAt = row.lastActivityAt ? new Date(row.lastActivityAt) : null;
    const state = expiryState({ lastActivityAt, expiryDays: row.expiryDays, points }, today);

    if (state.expired) {
      try {
        await db.transaction(async (tx) => {
          await loyaltyStore.updateBalance(row.balanceId, { points: 0 }, tx);
          await loyaltyStore.createEvent(
            {
              merchantId: row.merchantId,
              userId: row.userId,
              programId: row.programId,
              type: "adjust",
              amount: -points,
              metadata: { reason: "expired", lastActivityAt: lastActivityAt?.toISOString() ?? null },
            },
            tx,
          );
        });
        summary.pointsExpired += 1;
        summary.pointsExpiredTotal += points;
      } catch (err) {
        log(`daily: could not expire balance ${row.balanceId}: ${(err as Error).message}`, "jobs");
      }
      continue;
    }

    if (state.expiresAt && warningDue(state, config.pointsExpiryWarnDays)) {
      const key = dedupeKeys.pointsExpiring(row.merchantId, row.userId, expiryKeyDate(state.expiresAt));
      const outcome = await sendOnce(row.userId, "points_expiring", key, () =>
        emailService.sendPointsExpiring(row.email, row.merchantName, points, state.expiresAt!, row.firstName),
      );
      if (outcome === "sent") summary.sent.points_expiring = (summary.sent.points_expiring ?? 0) + 1;
      else if (outcome === "duplicate") summary.alreadySent += 1;
      else summary.failed += 1;
    }
  }
}
