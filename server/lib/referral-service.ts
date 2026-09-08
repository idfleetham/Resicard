import { db } from "../db";
import { log } from "../vite";
import * as userStore from "../storage/users";
import * as referralStore from "../storage/referrals";
import type { DbClient } from "../storage/types";
import type { Referral, User } from "@shared/schema";
import {
  addMonths,
  canAcceptReferral,
  canCreditReferrer,
  normaliseReferralCode,
  randomReferralCode,
  REFERRAL_MONTHS,
  referredBonusMonths,
} from "./referrals";

// The database side of referrals. Every rule it applies comes from ./referrals.ts;
// this file only reads rows, writes rows and keeps the crediting in one transaction.

/** The member's code, generated the first time it is asked for. Retries on collision. */
export async function ensureReferralCode(user: User): Promise<string> {
  if (user.referralCode) return user.referralCode;
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomReferralCode();
    if (await referralStore.getUserByReferralCode(code)) continue;
    const updated = await userStore.updateUser(user.id, { referralCode: code });
    if (updated?.referralCode) return updated.referralCode;
  }
  throw new Error("Could not generate a unique referral code");
}

/**
 * Records the code a new member typed at registration. Silent about everything:
 * an unknown code, their own code or someone in their household all end the same
 * way, with no referral and a sign-up that carried on regardless.
 */
export async function attachReferralAtRegistration(referred: User, rawCode: string | undefined | null): Promise<void> {
  const code = normaliseReferralCode(rawCode ?? "");
  if (!code) return;
  try {
    const referrer = await referralStore.getUserByReferralCode(code);
    if (!referrer || referrer.role !== "resident") return;
    if (!canAcceptReferral(referrer, referred).ok) return;
    await referralStore.createReferral({ referrerId: referrer.id, referredId: referred.id, code });
  } catch (err) {
    // A referral is never worth failing a registration over.
    log(`Referral code ${code} could not be attached to user ${referred.id}: ${(err as Error).message}`, "referrals");
  }
}

export interface ReferralCredit {
  /** Months to add to the referred member's period, on top of what the invoice paid for. */
  referredMonths: number;
  /** True when the referrer's own expiry was extended by this payment. */
  referrerCredited: boolean;
}

/**
 * Called from the Stripe `invoice.paid` handler when a membership payment lands.
 * The claim (pending to credited) and the referrer's extra month happen in one
 * transaction and in one statement, so a webhook Stripe sends twice credits once.
 *
 * The referred member's month is returned rather than written: their expiry is set
 * from the invoice period, so the caller folds the month into that figure and the
 * result stays the same however many times the same invoice arrives.
 */
export async function creditReferralOnFirstPayment(referredId: number, periodStart: Date, now: Date = new Date()): Promise<ReferralCredit> {
  try {
    return await db.transaction(async (tx) => {
      const claimed = await referralStore.claimPendingReferral(referredId, now, tx);
      const referrerCredited = claimed ? await creditReferrer(claimed, referredId, now, tx) : false;
      const referral = claimed ?? (await referralStore.getReferralForReferred(referredId, tx));
      const credited = referral?.status === "credited" ? referral.creditedAt : null;
      return { referredMonths: referredBonusMonths(credited, periodStart), referrerCredited };
    });
  } catch (err) {
    // A referral must never cost someone the membership they have just paid for.
    log(`Referral crediting failed for user ${referredId}: ${(err as Error).message}`, "referrals");
    return { referredMonths: 0, referrerCredited: false };
  }
}

/** Extends the referrer's own membership, unless they are capped or no longer eligible. */
async function creditReferrer(referral: Referral, referredId: number, now: Date, tx: DbClient): Promise<boolean> {
  const referrer = await userStore.getUserById(referral.referrerId, tx);
  const referred = await userStore.getUserById(referredId, tx);
  if (!referrer || !referred) return false;
  const earned = (await referralStore.listReferralsByReferrer(referrer.id, tx))
    .filter((r) => r.id !== referral.id && r.status === "credited")
    .map((r) => r.creditedAt);
  if (!canCreditReferrer(referrer, referred, earned, now).ok) return false;
  // From the current expiry when there is one in the future, so a month is added
  // rather than a live membership being shortened to a month from today. A referrer
  // whose own membership has lapsed is switched back on for the month, otherwise
  // the reward would be a date in a column and nothing they can use.
  const current = referrer.membershipExpiry && referrer.membershipExpiry > now;
  const base = current ? referrer.membershipExpiry! : now;
  await userStore.updateUser(
    referrer.id,
    { membershipExpiry: addMonths(base, REFERRAL_MONTHS), ...(referrer.membershipStatus === "active" ? {} : { membershipStatus: "active" as const }) },
    tx,
  );
  return true;
}
