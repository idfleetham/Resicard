import { db } from "../db";
import { log } from "../vite";
import { emailService } from "../email";
import * as emailLogStore from "../storage/email-log";
import type { EmailKind } from "@shared/schema";

// One way in for every message we send. The email_log row and the send happen in
// the same transaction: the row is written first, so a second attempt with the
// same dedupe key is refused by the unique index and never reaches the provider,
// and if the provider then fails the row rolls back and the message can be retried.

const UNIQUE_VIOLATION = "23505";

/**
 * Drizzle wraps the driver's error, so the Postgres code sits on `cause` rather
 * than on the error itself. Checking only the top level made every repeat run of
 * the daily job report its skipped messages as failures: nothing was sent twice,
 * because the insert still rolled the transaction back, but the summary said six
 * failures every morning, which is how a real failure gets ignored.
 */
function isDuplicate(err: unknown): boolean {
  for (let e: unknown = err, depth = 0; e && depth < 5; e = (e as { cause?: unknown }).cause, depth++) {
    if (typeof e === "object" && (e as { code?: string }).code === UNIQUE_VIOLATION) return true;
  }
  return false;
}

export type SendOutcome = "sent" | "duplicate" | "failed";

/**
 * Sends a message at most once for the given key. Never throws: an email that
 * cannot be sent must not break the request or the job that asked for it.
 */
export async function sendOnce(
  userId: number,
  kind: EmailKind,
  dedupeKey: string,
  send: () => Promise<void>,
): Promise<SendOutcome> {
  try {
    await db.transaction(async (tx) => {
      await emailLogStore.insertEmailLog({ userId, kind, dedupeKey }, tx);
      await send();
    });
    return "sent";
  } catch (err) {
    if (isDuplicate(err)) return "duplicate";
    log(`Email ${kind} for user ${userId} failed: ${(err as Error).message}`, "email");
    return "failed";
  }
}

/** Every dedupe key in one place, so the shape of a key is never invented twice. */
export const dedupeKeys = {
  /** Keyed on the token, so every reset request can send and none can send twice. */
  passwordReset: (tokenHash: string) => `password_reset:${tokenHash.slice(0, 32)}`,
  welcome: (userId: number) => `welcome:${userId}`,
  postcardPosted: (postcardId: string) => `postcard_posted:${postcardId}`,
  verified: (userId: number) => `verified:${userId}`,
  merchantApproved: (merchantId: string) => `merchant_approved:${merchantId}`,
  /**
   * Keyed on the expiry date rather than the balance, so a resident who comes
   * back in and pushes the date out is warned again next time they go quiet,
   * and one who does nothing is not told every morning until it happens.
   */
  pointsExpiring: (merchantId: string, userId: number, expiryDate: string) =>
    `points_expiring:${merchantId}:${userId}:${expiryDate}`,
};

