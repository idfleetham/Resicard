import { and, desc, eq, gte, sql, count } from "drizzle-orm";
import { db } from "../db";
import {
  loyaltyPrograms,
  loyaltyTiers,
  loyaltyRewards,
  loyaltyBalances,
  loyaltyEvents,
  merchants,
  users,
  type LoyaltyProgram,
  type LoyaltyTier,
  type LoyaltyReward,
  type LoyaltyBalance,
  type LoyaltyEvent,
} from "@shared/schema";
import type { DbClient } from "./types";

type ProgramInsert = typeof loyaltyPrograms.$inferInsert;
type TierInsert = typeof loyaltyTiers.$inferInsert;
type RewardInsert = typeof loyaltyRewards.$inferInsert;
type EventInsert = typeof loyaltyEvents.$inferInsert;

// Programmes

export async function getProgramByMerchant(merchantId: string, client: DbClient = db): Promise<LoyaltyProgram | undefined> {
  const [row] = await client.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.merchantId, merchantId)).limit(1);
  return row;
}

export async function getProgramById(id: number, client: DbClient = db): Promise<LoyaltyProgram | undefined> {
  const [row] = await client.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, id)).limit(1);
  return row;
}

export async function createProgram(values: ProgramInsert, client: DbClient = db): Promise<LoyaltyProgram> {
  const [row] = await client.insert(loyaltyPrograms).values(values).returning();
  return row;
}

export async function updateProgram(id: number, values: Partial<ProgramInsert>, client: DbClient = db): Promise<LoyaltyProgram | undefined> {
  const [row] = await client.update(loyaltyPrograms).set(values).where(eq(loyaltyPrograms.id, id)).returning();
  return row;
}

// Tiers

export async function listTiers(programId: number, client: DbClient = db): Promise<LoyaltyTier[]> {
  return client
    .select()
    .from(loyaltyTiers)
    .where(eq(loyaltyTiers.programId, programId))
    .orderBy(loyaltyTiers.thresholdPoints, loyaltyTiers.sortOrder);
}

export async function getTier(id: string, programId: number, client: DbClient = db): Promise<LoyaltyTier | undefined> {
  const [row] = await client
    .select()
    .from(loyaltyTiers)
    .where(and(eq(loyaltyTiers.id, id), eq(loyaltyTiers.programId, programId)))
    .limit(1);
  return row;
}

export async function getTierById(id: string, client: DbClient = db): Promise<LoyaltyTier | undefined> {
  const [row] = await client.select().from(loyaltyTiers).where(eq(loyaltyTiers.id, id)).limit(1);
  return row;
}

export async function createTier(values: TierInsert, client: DbClient = db): Promise<LoyaltyTier> {
  const [row] = await client.insert(loyaltyTiers).values(values).returning();
  return row;
}

export async function updateTier(id: string, values: Partial<TierInsert>, client: DbClient = db): Promise<LoyaltyTier | undefined> {
  const [row] = await client.update(loyaltyTiers).set(values).where(eq(loyaltyTiers.id, id)).returning();
  return row;
}

export async function deleteTier(id: string, client: DbClient = db): Promise<void> {
  await client.update(loyaltyBalances).set({ tierId: null }).where(eq(loyaltyBalances.tierId, id));
  await client.delete(loyaltyTiers).where(eq(loyaltyTiers.id, id));
}

// Rewards

export async function listRewards(programId: number, activeOnly = false, client: DbClient = db): Promise<LoyaltyReward[]> {
  const condition = activeOnly
    ? and(eq(loyaltyRewards.programId, programId), eq(loyaltyRewards.active, true))
    : eq(loyaltyRewards.programId, programId);
  return client.select().from(loyaltyRewards).where(condition).orderBy(loyaltyRewards.createdAt);
}

export async function getReward(id: string, programId: number, client: DbClient = db): Promise<LoyaltyReward | undefined> {
  const [row] = await client
    .select()
    .from(loyaltyRewards)
    .where(and(eq(loyaltyRewards.id, id), eq(loyaltyRewards.programId, programId)))
    .limit(1);
  return row;
}

export async function createReward(values: RewardInsert, client: DbClient = db): Promise<LoyaltyReward> {
  const [row] = await client.insert(loyaltyRewards).values(values).returning();
  return row;
}

export async function updateReward(id: string, values: Partial<RewardInsert>, client: DbClient = db): Promise<LoyaltyReward | undefined> {
  const [row] = await client.update(loyaltyRewards).set(values).where(eq(loyaltyRewards.id, id)).returning();
  return row;
}

export async function deleteReward(id: string, client: DbClient = db): Promise<void> {
  await client.delete(loyaltyRewards).where(eq(loyaltyRewards.id, id));
}

// Balances

export async function getBalance(merchantId: string, userId: number, client: DbClient = db): Promise<LoyaltyBalance | undefined> {
  const [row] = await client
    .select()
    .from(loyaltyBalances)
    .where(and(eq(loyaltyBalances.merchantId, merchantId), eq(loyaltyBalances.userId, userId)))
    .limit(1);
  return row;
}

export async function createBalance(
  values: { merchantId: string; userId: number; points?: number; stamps?: number; tierId?: string | null },
  client: DbClient = db,
): Promise<LoyaltyBalance> {
  const [row] = await client.insert(loyaltyBalances).values(values).returning();
  return row;
}

export async function updateBalance(
  id: string,
  values: { points?: number; stamps?: number; tierId?: string | null },
  client: DbClient = db,
): Promise<LoyaltyBalance | undefined> {
  const [row] = await client
    .update(loyaltyBalances)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(loyaltyBalances.id, id))
    .returning();
  return row;
}

/** Balances for a merchant with the resident's username and tier name. */
export async function listBalancesForMerchant(merchantId: string, client: DbClient = db) {
  return client
    .select({
      balance: loyaltyBalances,
      username: users.username,
      tierName: loyaltyTiers.name,
    })
    .from(loyaltyBalances)
    .innerJoin(users, eq(users.id, loyaltyBalances.userId))
    .leftJoin(loyaltyTiers, eq(loyaltyTiers.id, loyaltyBalances.tierId))
    .where(eq(loyaltyBalances.merchantId, merchantId))
    .orderBy(desc(loyaltyBalances.points));
}

/** A resident's balances across merchants, with merchant and tier details. */
export async function listBalancesForUser(userId: number, client: DbClient = db) {
  return client
    .select({
      balance: loyaltyBalances,
      merchant: { id: merchants.id, name: merchants.name, logoUrl: merchants.logoUrl },
      program: loyaltyPrograms,
      tier: loyaltyTiers,
    })
    .from(loyaltyBalances)
    .innerJoin(merchants, eq(merchants.id, loyaltyBalances.merchantId))
    .innerJoin(loyaltyPrograms, eq(loyaltyPrograms.merchantId, merchants.id))
    .leftJoin(loyaltyTiers, eq(loyaltyTiers.id, loyaltyBalances.tierId))
    .where(eq(loyaltyBalances.userId, userId))
    .orderBy(desc(loyaltyBalances.updatedAt));
}

export async function countBalances(merchantId: string, client: DbClient = db): Promise<number> {
  const [row] = await client.select({ value: count() }).from(loyaltyBalances).where(eq(loyaltyBalances.merchantId, merchantId));
  return row?.value ?? 0;
}

// Events

export async function createEvent(values: EventInsert, client: DbClient = db): Promise<LoyaltyEvent> {
  const [row] = await client.insert(loyaltyEvents).values(values).returning();
  return row;
}

export async function listEventsForMerchant(merchantId: string, limit: number, client: DbClient = db) {
  return client
    .select({ event: loyaltyEvents, username: users.username })
    .from(loyaltyEvents)
    .innerJoin(users, eq(users.id, loyaltyEvents.userId))
    .where(eq(loyaltyEvents.merchantId, merchantId))
    .orderBy(desc(loyaltyEvents.createdAt))
    .limit(limit);
}

/** Earn events for one resident at one merchant since a given time, newest first. */
export async function listRecentEarnEvents(merchantId: string, userId: number, since: Date, client: DbClient = db) {
  return client
    .select()
    .from(loyaltyEvents)
    .where(
      and(
        eq(loyaltyEvents.merchantId, merchantId),
        eq(loyaltyEvents.userId, userId),
        eq(loyaltyEvents.type, "earn_points"),
        gte(loyaltyEvents.createdAt, since),
      ),
    )
    .orderBy(desc(loyaltyEvents.createdAt));
}

export async function analyticsForMerchant(merchantId: string, client: DbClient = db) {
  const [row] = await client
    .select({
      activeMembers30d: sql<number>`count(distinct ${loyaltyEvents.userId}) filter (where ${loyaltyEvents.createdAt} >= now() - interval '30 days')::int`,
      pointsIssued30d: sql<number>`coalesce(sum(${loyaltyEvents.amount}) filter (where ${loyaltyEvents.type} = 'earn_points' and ${loyaltyEvents.createdAt} >= now() - interval '30 days'), 0)::int`,
      rewardsRedeemed30d: sql<number>`count(*) filter (where ${loyaltyEvents.type} = 'redeem_reward' and ${loyaltyEvents.createdAt} >= now() - interval '30 days')::int`,
    })
    .from(loyaltyEvents)
    .where(eq(loyaltyEvents.merchantId, merchantId));
  return row ?? { activeMembers30d: 0, pointsIssued30d: 0, rewardsRedeemed30d: 0 };
}

export async function pointsIssuedByWeek(merchantId: string, weeks: number, client: DbClient = db) {
  return client
    .select({
      weekStart: sql<string>`to_char(date_trunc('week', ${loyaltyEvents.createdAt} at time zone 'Europe/London'), 'YYYY-MM-DD')`,
      pointsIssued: sql<number>`coalesce(sum(${loyaltyEvents.amount}), 0)::int`,
    })
    .from(loyaltyEvents)
    .where(
      and(
        eq(loyaltyEvents.merchantId, merchantId),
        eq(loyaltyEvents.type, "earn_points"),
        gte(loyaltyEvents.createdAt, sql`now() - (${weeks} * interval '7 days')`),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);
}
