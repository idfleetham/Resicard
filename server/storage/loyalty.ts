import { and, desc, eq, gte, inArray, lte, sql, count, type SQL } from "drizzle-orm";
import { db } from "../db";
import {
  loyaltyPrograms,
  loyaltyTiers,
  loyaltyRewards,
  loyaltyBalances,
  loyaltyEvents,
  rewardClaims,
  merchants,
  users,
  type LoyaltyProgram,
  type LoyaltyTier,
  type LoyaltyReward,
  type LoyaltyBalance,
  type LoyaltyEvent,
  type RewardClaim,
} from "@shared/schema";
import type { DbClient } from "./types";

type ProgramInsert = typeof loyaltyPrograms.$inferInsert;
type TierInsert = typeof loyaltyTiers.$inferInsert;
type RewardInsert = typeof loyaltyRewards.$inferInsert;
type EventInsert = typeof loyaltyEvents.$inferInsert;
type RewardClaimInsert = typeof rewardClaims.$inferInsert;

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

/** Tier names for a set of tier ids, keyed by id. One query for many outlets. */
export async function listTierNamesByIds(ids: string[], client: DbClient = db): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await client
    .select({ id: loyaltyTiers.id, name: loyaltyTiers.name })
    .from(loyaltyTiers)
    .where(inArray(loyaltyTiers.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** Tier name and flat discount by tier id, for callers that show both without loading the whole tier. */
export async function listTierSummariesByIds(
  ids: string[],
  client: DbClient = db,
): Promise<Map<string, { name: string; discountPercent: number | null }>> {
  if (ids.length === 0) return new Map();
  const rows = await client
    .select({ id: loyaltyTiers.id, name: loyaltyTiers.name, discountPercent: loyaltyTiers.discountPercent })
    .from(loyaltyTiers)
    .where(inArray(loyaltyTiers.id, ids));
  return new Map(rows.map((r) => [r.id, { name: r.name, discountPercent: r.discountPercent ?? null }]));
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

export async function getRewardById(id: string, client: DbClient = db): Promise<LoyaltyReward | undefined> {
  const [row] = await client.select().from(loyaltyRewards).where(eq(loyaltyRewards.id, id)).limit(1);
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

// Reward claims

export async function createRewardClaim(values: RewardClaimInsert, client: DbClient = db): Promise<RewardClaim> {
  const [row] = await client.insert(rewardClaims).values(values).returning();
  return row;
}

export async function getRewardClaimById(id: string, client: DbClient = db): Promise<RewardClaim | undefined> {
  const [row] = await client.select().from(rewardClaims).where(eq(rewardClaims.id, id)).limit(1);
  return row;
}

export async function getRewardClaimByCode(code: string, client: DbClient = db): Promise<RewardClaim | undefined> {
  const [row] = await client.select().from(rewardClaims).where(eq(rewardClaims.code, code.toUpperCase())).limit(1);
  return row;
}

/** When the resident last claimed each reward at this merchant, keyed by reward id. */
export async function lastClaimAtByReward(merchantId: string, userId: number, client: DbClient = db): Promise<Map<string, Date>> {
  const rows = await client
    .select({ rewardId: rewardClaims.rewardId, latest: sql<Date>`max(${rewardClaims.claimedAt})` })
    .from(rewardClaims)
    .where(and(eq(rewardClaims.merchantId, merchantId), eq(rewardClaims.userId, userId)))
    .groupBy(rewardClaims.rewardId);
  return new Map(rows.map((r) => [r.rewardId, new Date(r.latest)]));
}

/** When the resident last claimed one reward, or null. */
export async function lastClaimAt(rewardId: string, userId: number, client: DbClient = db): Promise<Date | null> {
  const [row] = await client
    .select({ claimedAt: rewardClaims.claimedAt })
    .from(rewardClaims)
    .where(and(eq(rewardClaims.rewardId, rewardId), eq(rewardClaims.userId, userId)))
    .orderBy(desc(rewardClaims.claimedAt))
    .limit(1);
  return row?.claimedAt ?? null;
}

/** Merchant's reward claims, newest first, with the reward name and the resident's id and username. */
export async function listRewardClaimsForMerchant(
  merchantId: string,
  range: { from?: Date; to?: Date },
  client: DbClient = db,
) {
  const conditions: SQL[] = [eq(rewardClaims.merchantId, merchantId)];
  if (range.from) conditions.push(gte(rewardClaims.claimedAt, range.from));
  if (range.to) conditions.push(lte(rewardClaims.claimedAt, range.to));
  return client
    .select({
      id: rewardClaims.id,
      code: rewardClaims.code,
      claimedAt: rewardClaims.claimedAt,
      pointsSpent: rewardClaims.pointsSpent,
      stampsSpent: rewardClaims.stampsSpent,
      rewardId: rewardClaims.rewardId,
      rewardName: loyaltyRewards.name,
      userId: rewardClaims.userId,
      username: users.username,
    })
    .from(rewardClaims)
    .innerJoin(loyaltyRewards, eq(loyaltyRewards.id, rewardClaims.rewardId))
    .innerJoin(users, eq(users.id, rewardClaims.userId))
    .where(and(...conditions))
    .orderBy(desc(rewardClaims.claimedAt));
}

/** Reward claim counts for the merchant's redemptions summary. */
export async function countRewardClaimsForMerchant(merchantId: string, client: DbClient = db) {
  const [row] = await client
    .select({
      allTime: sql<number>`count(*)::int`,
      thisMonth: sql<number>`count(*) filter (where ${rewardClaims.claimedAt} >= date_trunc('month', now() at time zone 'Europe/London') at time zone 'Europe/London')::int`,
    })
    .from(rewardClaims)
    .where(eq(rewardClaims.merchantId, merchantId));
  return row ?? { allTime: 0, thisMonth: 0 };
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

/** Balances for a merchant with the resident's username. Tier comes from status points, not the row. */
export async function listBalancesForMerchant(merchantId: string, client: DbClient = db) {
  return client
    .select({
      balance: loyaltyBalances,
      username: users.username,
    })
    .from(loyaltyBalances)
    .innerJoin(users, eq(users.id, loyaltyBalances.userId))
    .where(eq(loyaltyBalances.merchantId, merchantId))
    .orderBy(desc(loyaltyBalances.points));
}

/** A resident's balances across merchants, with merchant and programme details. */
export async function listBalancesForUser(userId: number, client: DbClient = db) {
  return client
    .select({
      balance: loyaltyBalances,
      merchant: { id: merchants.id, name: merchants.name, logoUrl: merchants.logoUrl },
      program: loyaltyPrograms,
    })
    .from(loyaltyBalances)
    .innerJoin(merchants, eq(merchants.id, loyaltyBalances.merchantId))
    .innerJoin(loyaltyPrograms, eq(loyaltyPrograms.merchantId, merchants.id))
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

/** A resident's loyalty events across merchants, newest first, with merchant details. */
export async function listEventsForUser(userId: number, limit: number, client: DbClient = db) {
  return client
    .select({ event: loyaltyEvents, merchant: { id: merchants.id, name: merchants.name, logoUrl: merchants.logoUrl } })
    .from(loyaltyEvents)
    .innerJoin(merchants, eq(merchants.id, loyaltyEvents.merchantId))
    .where(eq(loyaltyEvents.userId, userId))
    .orderBy(desc(loyaltyEvents.createdAt))
    .limit(limit);
}

/** Newest event time per merchant for one resident, used to order the resident's balances. */
export async function latestEventAtByMerchant(userId: number, client: DbClient = db): Promise<Map<string, Date>> {
  const rows = await client
    .select({ merchantId: loyaltyEvents.merchantId, latest: sql<Date>`max(${loyaltyEvents.createdAt})` })
    .from(loyaltyEvents)
    .where(eq(loyaltyEvents.userId, userId))
    .groupBy(loyaltyEvents.merchantId);
  return new Map(rows.map((r) => [r.merchantId, new Date(r.latest)]));
}

/** Condition for events that count towards tier status: positive earn_points and adjust amounts. */
function statusEventCondition(since: Date): SQL {
  return sql`${loyaltyEvents.type} in ('earn_points', 'adjust') and ${loyaltyEvents.amount} > 0 and ${loyaltyEvents.createdAt} >= ${since}`;
}

/** Points earned by one resident at one merchant since a given time (tier status points). */
export async function sumStatusPoints(merchantId: string, userId: number, since: Date, client: DbClient = db): Promise<number> {
  const [row] = await client
    .select({ total: sql<number>`coalesce(sum(${loyaltyEvents.amount}), 0)::int` })
    .from(loyaltyEvents)
    .where(and(eq(loyaltyEvents.merchantId, merchantId), eq(loyaltyEvents.userId, userId), statusEventCondition(since)));
  return row?.total ?? 0;
}

/** Status points per resident at one merchant since a given time, keyed by user id. */
export async function sumStatusPointsByUser(merchantId: string, since: Date, client: DbClient = db): Promise<Map<number, number>> {
  const rows = await client
    .select({ userId: loyaltyEvents.userId, total: sql<number>`coalesce(sum(${loyaltyEvents.amount}), 0)::int` })
    .from(loyaltyEvents)
    .where(and(eq(loyaltyEvents.merchantId, merchantId), statusEventCondition(since)))
    .groupBy(loyaltyEvents.userId);
  return new Map(rows.map((r) => [r.userId, r.total]));
}

/** The resident's first loyalty event at this merchant, or null. */
export async function earliestEventAt(merchantId: string, userId: number, client: DbClient = db): Promise<Date | null> {
  const [row] = await client
    .select({ earliest: sql<Date | null>`min(${loyaltyEvents.createdAt})` })
    .from(loyaltyEvents)
    .where(and(eq(loyaltyEvents.merchantId, merchantId), eq(loyaltyEvents.userId, userId)));
  return row?.earliest ? new Date(row.earliest) : null;
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
