import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { referrals, users, type Referral, type User } from "@shared/schema";
import type { DbClient } from "./types";

export async function getUserByReferralCode(code: string, client: DbClient = db): Promise<User | undefined> {
  const [row] = await client
    .select()
    .from(users)
    .where(sql`upper(${users.referralCode}) = ${code.trim().toUpperCase()}`)
    .limit(1);
  return row;
}

export async function createReferral(
  values: { referrerId: number; referredId: number; code: string },
  client: DbClient = db,
): Promise<Referral> {
  const [row] = await client.insert(referrals).values(values).returning();
  return row;
}

export async function getReferralForReferred(referredId: number, client: DbClient = db): Promise<Referral | undefined> {
  const [row] = await client.select().from(referrals).where(eq(referrals.referredId, referredId)).limit(1);
  return row;
}

export async function listReferralsByReferrer(referrerId: number, client: DbClient = db): Promise<Referral[]> {
  return client.select().from(referrals).where(eq(referrals.referrerId, referrerId)).orderBy(referrals.createdAt);
}

/**
 * Moves a referral from pending to credited and hands back the row, or nothing
 * when it was already credited. One statement, so two webhooks racing on the same
 * invoice cannot both win it: whoever gets the row first is the only one who pays out.
 */
export async function claimPendingReferral(referredId: number, at: Date, client: DbClient = db): Promise<Referral | undefined> {
  const [row] = await client
    .update(referrals)
    .set({ status: "credited", creditedAt: at })
    .where(and(eq(referrals.referredId, referredId), eq(referrals.status, "pending")))
    .returning();
  return row;
}
