import { and, count, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { redemptions, offers, merchants, users, type Redemption } from "@shared/schema";
import type { DbClient } from "./types";
import type { RedemptionCounts } from "../lib/offer-rules";

type RedemptionInsert = typeof redemptions.$inferInsert;

export async function createRedemption(values: RedemptionInsert, client: DbClient = db): Promise<Redemption> {
  const [row] = await client.insert(redemptions).values(values).returning();
  return row;
}

export async function getRedemptionById(id: string, client: DbClient = db): Promise<Redemption | undefined> {
  const [row] = await client.select().from(redemptions).where(eq(redemptions.id, id)).limit(1);
  return row;
}

export async function getRedemptionByCode(code: string, client: DbClient = db): Promise<Redemption | undefined> {
  const [row] = await client.select().from(redemptions).where(eq(redemptions.code, code.toUpperCase())).limit(1);
  return row;
}

/**
 * Counts used by the per-resident limit rules. "Today" and "this week" use the
 * merchant's local day in Europe/London; the week is the last seven days.
 */
export async function countRedemptionsForLimits(
  offerId: string,
  userId: number,
  client: DbClient = db,
): Promise<RedemptionCounts> {
  const [row] = await client
    .select({
      today: sql<number>`count(*) filter (where ${redemptions.userId} = ${userId} and (${redemptions.redeemedAt} at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date)::int`,
      thisWeek: sql<number>`count(*) filter (where ${redemptions.userId} = ${userId} and ${redemptions.redeemedAt} >= now() - interval '7 days')::int`,
      lifetime: sql<number>`count(*) filter (where ${redemptions.userId} = ${userId})::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(redemptions)
    .where(eq(redemptions.offerId, offerId));
  return row ?? { today: 0, thisWeek: 0, lifetime: 0, total: 0 };
}

/** Resident's redemptions, newest first, with offer title and merchant name. */
export async function listRedemptionsForUser(userId: number, client: DbClient = db) {
  return client
    .select({
      id: redemptions.id,
      code: redemptions.code,
      redeemedAt: redemptions.redeemedAt,
      basketAmount: redemptions.basketAmount,
      pointsAwarded: redemptions.pointsAwarded,
      savedAmount: redemptions.savedAmount,
      savedEstimated: redemptions.savedEstimated,
      offerId: redemptions.offerId,
      offerTitle: offers.title,
      offerType: offers.type,
      merchantId: redemptions.merchantId,
      merchantName: merchants.name,
      merchantLogoUrl: merchants.logoUrl,
    })
    .from(redemptions)
    .innerJoin(offers, eq(offers.id, redemptions.offerId))
    .innerJoin(merchants, eq(merchants.id, redemptions.merchantId))
    .where(eq(redemptions.userId, userId))
    .orderBy(desc(redemptions.redeemedAt));
}

/** Every saving figure recorded for a resident, oldest to newest, for the savings panel. */
export async function listSavingsForUser(userId: number, client: DbClient = db) {
  return client
    .select({
      savedAmount: redemptions.savedAmount,
      savedEstimated: redemptions.savedEstimated,
      redeemedAt: redemptions.redeemedAt,
    })
    .from(redemptions)
    .where(eq(redemptions.userId, userId))
    .orderBy(redemptions.redeemedAt);
}

/** The resident's biggest single savings, with where they happened. */
export async function listTopSavingsForUser(userId: number, limit: number, client: DbClient = db) {
  return client
    .select({
      id: redemptions.id,
      savedAmount: redemptions.savedAmount,
      redeemedAt: redemptions.redeemedAt,
      offerTitle: offers.title,
      merchantId: merchants.id,
      merchantName: merchants.name,
    })
    .from(redemptions)
    .innerJoin(offers, eq(offers.id, redemptions.offerId))
    .innerJoin(merchants, eq(merchants.id, redemptions.merchantId))
    .where(and(eq(redemptions.userId, userId), sql`${redemptions.savedAmount} is not null`))
    .orderBy(desc(redemptions.savedAmount))
    .limit(limit);
}

/** Merchant's redemptions, newest first, with the resident's id and username (aliased by the caller). */
export async function listRedemptionsForMerchant(
  merchantId: string,
  range: { from?: Date; to?: Date },
  client: DbClient = db,
) {
  const conditions: SQL[] = [eq(redemptions.merchantId, merchantId)];
  if (range.from) conditions.push(gte(redemptions.redeemedAt, range.from));
  if (range.to) conditions.push(lte(redemptions.redeemedAt, range.to));
  return client
    .select({
      id: redemptions.id,
      code: redemptions.code,
      redeemedAt: redemptions.redeemedAt,
      basketAmount: redemptions.basketAmount,
      pointsAwarded: redemptions.pointsAwarded,
      offerId: redemptions.offerId,
      offerTitle: offers.title,
      userId: redemptions.userId,
      username: users.username,
    })
    .from(redemptions)
    .innerJoin(offers, eq(offers.id, redemptions.offerId))
    .innerJoin(users, eq(users.id, redemptions.userId))
    .where(and(...conditions))
    .orderBy(desc(redemptions.redeemedAt));
}

export async function summariseRedemptionsForMerchant(merchantId: string, client: DbClient = db) {
  const [totals] = await client
    .select({
      today: sql<number>`count(*) filter (where (${redemptions.redeemedAt} at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date)::int`,
      thisWeek: sql<number>`count(*) filter (where ${redemptions.redeemedAt} >= date_trunc('week', now() at time zone 'Europe/London') at time zone 'Europe/London')::int`,
      thisMonth: sql<number>`count(*) filter (where ${redemptions.redeemedAt} >= date_trunc('month', now() at time zone 'Europe/London') at time zone 'Europe/London')::int`,
      allTime: sql<number>`count(*)::int`,
    })
    .from(redemptions)
    .where(eq(redemptions.merchantId, merchantId));

  const byOffer = await client
    .select({
      offerId: redemptions.offerId,
      title: offers.title,
      count: sql<number>`count(*)::int`,
    })
    .from(redemptions)
    .innerJoin(offers, eq(offers.id, redemptions.offerId))
    .where(eq(redemptions.merchantId, merchantId))
    .groupBy(redemptions.offerId, offers.title)
    .orderBy(desc(sql`count(*)`));

  return { ...(totals ?? { today: 0, thisWeek: 0, thisMonth: 0, allTime: 0 }), byOffer };
}

/** Newest redemptions across all merchants, for admins. */
export async function listRecentRedemptions(limit: number, client: DbClient = db) {
  return client
    .select({
      id: redemptions.id,
      code: redemptions.code,
      redeemedAt: redemptions.redeemedAt,
      basketAmount: redemptions.basketAmount,
      pointsAwarded: redemptions.pointsAwarded,
      merchantId: redemptions.merchantId,
      merchantName: merchants.name,
      offerId: redemptions.offerId,
      offerTitle: offers.title,
      userId: redemptions.userId,
      username: users.username,
    })
    .from(redemptions)
    .innerJoin(offers, eq(offers.id, redemptions.offerId))
    .innerJoin(merchants, eq(merchants.id, redemptions.merchantId))
    .innerJoin(users, eq(users.id, redemptions.userId))
    .orderBy(desc(redemptions.redeemedAt))
    .limit(limit);
}

export async function countRedemptionsWhere(condition: SQL | undefined, client: DbClient = db): Promise<number> {
  const [row] = await client.select({ value: count() }).from(redemptions).where(condition);
  return row?.value ?? 0;
}

/** Redemptions in the last 30 days and per ISO week for the loyalty analytics view. */
export async function countRedemptionsByWeek(merchantId: string, weeks: number, client: DbClient = db) {
  return client
    .select({
      weekStart: sql<string>`to_char(date_trunc('week', ${redemptions.redeemedAt} at time zone 'Europe/London'), 'YYYY-MM-DD')`,
      redemptions: sql<number>`count(*)::int`,
    })
    .from(redemptions)
    .where(
      and(
        eq(redemptions.merchantId, merchantId),
        gte(redemptions.redeemedAt, sql`now() - (${weeks} * interval '7 days')`),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);
}
