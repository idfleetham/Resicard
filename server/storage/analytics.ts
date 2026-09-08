import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../db";
import {
  favourites,
  loyaltyBalances,
  loyaltyTiers,
  merchants,
  offers,
  redemptions,
  users,
} from "@shared/schema";
import type { DbClient } from "./types";
import type { DayKey } from "../lib/analytics";

/**
 * Queries behind GET /api/merchant/analytics. Each one is a single grouped or
 * windowed query: the per-bucket maths (weeks, days, hours, shares) happens in
 * server/lib/analytics.ts on the rows these return.
 */

/**
 * Every redemption at this outlet between `from` and `to`, one row each. The window
 * is 180 days at most, so this is a few hundred rows for a busy outlet and lets the
 * shaping layer build the week, day, hour, offer and returning-share views from one read.
 */
export async function listRedemptionsInWindow(merchantId: string, from: Date, to: Date, client: DbClient = db) {
  return client
    .select({
      redeemedAt: redemptions.redeemedAt,
      userId: redemptions.userId,
      offerId: redemptions.offerId,
      basketAmount: redemptions.basketAmount,
    })
    .from(redemptions)
    .where(and(eq(redemptions.merchantId, merchantId), gte(redemptions.redeemedAt, from), lt(redemptions.redeemedAt, to)));
}

/**
 * One row per resident who redeemed at this outlet in the window, with the optional
 * demographics they gave. Distinct by resident, so the aggregate counts people
 * rather than visits, and it is only ever read into the suppression logic in
 * server/lib/analytics.ts — never returned per resident.
 */
export async function residentDemographicsInWindow(merchantId: string, from: Date, to: Date, client: DbClient = db) {
  return client
    .selectDistinct({ userId: users.id, ageBand: users.ageBand, sex: users.sex })
    .from(redemptions)
    .innerJoin(users, eq(users.id, redemptions.userId))
    .where(and(eq(redemptions.merchantId, merchantId), gte(redemptions.redeemedAt, from), lt(redemptions.redeemedAt, to)));
}

/** Each resident's first ever redemption at this outlet, however long ago. */
export async function firstRedemptionByUser(merchantId: string, client: DbClient = db): Promise<Map<number, Date>> {
  const rows = await client
    .select({ userId: redemptions.userId, firstAt: sql<Date>`min(${redemptions.redeemedAt})` })
    .from(redemptions)
    .where(eq(redemptions.merchantId, merchantId))
    .groupBy(redemptions.userId);
  const map = new Map<number, Date>();
  for (const row of rows) {
    if (row.firstAt) map.set(row.userId, new Date(row.firstAt));
  }
  return map;
}

/** Offers belonging to this outlet, enough to title and headline each one. */
export async function listOffersForMerchant(merchantId: string, client: DbClient = db) {
  return client
    .select({
      id: offers.id,
      title: offers.title,
      type: offers.type,
      percentOff: offers.percentOff,
      fixedPrice: offers.fixedPrice,
      shortPromo: offers.shortPromo,
    })
    .from(offers)
    .where(eq(offers.merchantId, merchantId));
}

/** How many residents have starred this outlet. */
export async function countFavourites(merchantId: string, client: DbClient = db): Promise<number> {
  const [row] = await client
    .select({ value: sql<number>`count(*)::int` })
    .from(favourites)
    .where(eq(favourites.merchantId, merchantId));
  return row?.value ?? 0;
}

/** Loyalty members per tier, in tier order. Members with no tier fall under "No tier". */
export async function tierDistribution(merchantId: string, programId: number, client: DbClient = db) {
  const rows = await client
    .select({
      tierId: loyaltyTiers.id,
      name: loyaltyTiers.name,
      color: loyaltyTiers.color,
      sortOrder: loyaltyTiers.sortOrder,
      members: sql<number>`count(${loyaltyBalances.id})::int`,
    })
    .from(loyaltyTiers)
    .leftJoin(
      loyaltyBalances,
      and(eq(loyaltyBalances.tierId, loyaltyTiers.id), eq(loyaltyBalances.merchantId, merchantId)),
    )
    .where(eq(loyaltyTiers.programId, programId))
    .groupBy(loyaltyTiers.id, loyaltyTiers.name, loyaltyTiers.color, loyaltyTiers.sortOrder)
    .orderBy(loyaltyTiers.sortOrder);
  return rows.map((r) => ({ name: r.name, color: r.color ?? "#0F3B47", members: r.members }));
}

// Town-wide blocks ------------------------------------------------------------

/** Redemptions in the last 30 days for every approved outlet in one category. */
export async function categoryRedemptions30d(category: string, client: DbClient = db) {
  return client
    .select({
      merchantId: merchants.id,
      redemptions: sql<number>`count(${redemptions.id})::int`,
    })
    .from(merchants)
    .leftJoin(
      redemptions,
      and(eq(redemptions.merchantId, merchants.id), gte(redemptions.redeemedAt, sql`now() - interval '30 days'`)),
    )
    .where(and(eq(merchants.status, "approved"), eq(merchants.category, category)))
    .groupBy(merchants.id);
}

/** Town-wide redemptions by day of the week over the last 90 days, Europe/London. */
export async function townRedemptionsByDay(client: DbClient = db): Promise<{ day: DayKey; redemptions: number }[]> {
  const rows = await client
    .select({
      day: sql<string>`lower(to_char(${redemptions.redeemedAt} at time zone 'Europe/London', 'dy'))`,
      redemptions: sql<number>`count(*)::int`,
    })
    .from(redemptions)
    .where(gte(redemptions.redeemedAt, sql`now() - interval '90 days'`))
    .groupBy(sql`1`);
  const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const counts = new Map<string, number>(rows.map((r) => [r.day, r.redemptions]));
  return DAYS.map((day) => ({ day, redemptions: counts.get(day) ?? 0 }));
}

/**
 * Town-wide active members by month for the last 12 months: distinct residents who
 * redeemed anywhere in the town that month. Months with nobody are filled in by the
 * shaping layer.
 */
export async function townActiveMembersByMonth(client: DbClient = db) {
  return client
    .select({
      month: sql<string>`to_char(${redemptions.redeemedAt} at time zone 'Europe/London', 'YYYY-MM')`,
      members: sql<number>`count(distinct ${redemptions.userId})::int`,
    })
    .from(redemptions)
    .where(gte(redemptions.redeemedAt, sql`date_trunc('month', now() at time zone 'Europe/London') - interval '11 months'`))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
}
