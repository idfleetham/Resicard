import { and, count, desc, eq, gt, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { users, passwordResetTokens, type User, type InsertUser, type UserRole } from "@shared/schema";
import type { DbClient } from "./types";

export async function getUserById(id: number, client: DbClient = db): Promise<User | undefined> {
  const [row] = await client.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export async function getUserByEmail(email: string, client: DbClient = db): Promise<User | undefined> {
  const [row] = await client
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return row;
}

export async function getUserByUsername(username: string, client: DbClient = db): Promise<User | undefined> {
  const [row] = await client
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = ${username.trim().toLowerCase()}`)
    .limit(1);
  return row;
}

export async function getUserByStripeSubscription(subscriptionId: string, client: DbClient = db): Promise<User | undefined> {
  const [row] = await client.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId)).limit(1);
  return row;
}

export async function getUserByHouseholdCode(code: string, client: DbClient = db): Promise<User | undefined> {
  const [row] = await client.select().from(users).where(eq(users.householdCode, code)).limit(1);
  return row;
}

/** The second adult of a household (the user whose householdPrimaryId is the primary), if any. */
export async function getHouseholdMember(primaryId: number, client: DbClient = db): Promise<User | undefined> {
  const [row] = await client.select().from(users).where(eq(users.householdPrimaryId, primaryId)).orderBy(users.id).limit(1);
  return row;
}

/** Every user covered by this primary's household. */
export async function listHouseholdMembers(primaryId: number, client: DbClient = db): Promise<User[]> {
  return client.select().from(users).where(eq(users.householdPrimaryId, primaryId)).orderBy(users.id);
}

/** The primary this user is covered by, when they have one. */
export async function getHouseholdPrimary(user: User, client: DbClient = db): Promise<User | null> {
  if (!user.householdPrimaryId) return null;
  return (await getUserById(user.householdPrimaryId, client)) ?? null;
}

export async function createUser(values: InsertUser, client: DbClient = db): Promise<User> {
  const [row] = await client.insert(users).values(values).returning();
  return row;
}

export async function updateUser(id: number, values: Partial<InsertUser>, client: DbClient = db): Promise<User | undefined> {
  const [row] = await client.update(users).set(values).where(eq(users.id, id)).returning();
  return row;
}

export async function deleteUser(id: number, client: DbClient = db): Promise<void> {
  await client.delete(users).where(eq(users.id, id));
}

export async function listUsers(role?: UserRole, client: DbClient = db): Promise<User[]> {
  const query = client.select().from(users).orderBy(desc(users.createdAt));
  if (role) return query.where(eq(users.role, role));
  return query;
}

export async function listUsersByMerchant(merchantId: string, client: DbClient = db): Promise<User[]> {
  return client.select().from(users).where(eq(users.merchantId, merchantId)).orderBy(users.id);
}

export async function listPendingDocuments(client: DbClient = db): Promise<User[]> {
  return client
    .select()
    .from(users)
    .where(and(eq(users.role, "resident"), eq(users.documentStatus, "pending")))
    .orderBy(users.documentSubmittedAt);
}

export async function countUsersWhere(condition: SQL | undefined, client: DbClient = db): Promise<number> {
  const [row] = await client.select({ value: count() }).from(users).where(condition);
  return row?.value ?? 0;
}

// Password reset tokens

export async function revokePasswordResetTokens(userId: number, client: DbClient = db): Promise<void> {
  await client
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
}

export async function insertPasswordResetToken(
  values: { userId: number; tokenHash: string; expiresAt: Date; requestIp?: string | null; userAgent?: string | null },
  client: DbClient = db,
): Promise<void> {
  await client.insert(passwordResetTokens).values(values);
}

export async function findLivePasswordResetToken(tokenHash: string, client: DbClient = db) {
  const [row] = await client
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);
  return row;
}

export async function markPasswordResetTokenUsed(id: string, client: DbClient = db): Promise<void> {
  await client.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
}
