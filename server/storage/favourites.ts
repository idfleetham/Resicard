import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { favourites } from "@shared/schema";
import type { DbClient } from "./types";

/** Stars an outlet for a resident. Idempotent: a second call changes nothing. */
export async function addFavourite(userId: number, merchantId: string, client: DbClient = db): Promise<void> {
  await client.insert(favourites).values({ userId, merchantId }).onConflictDoNothing();
}

export async function removeFavourite(userId: number, merchantId: string, client: DbClient = db): Promise<void> {
  await client.delete(favourites).where(and(eq(favourites.userId, userId), eq(favourites.merchantId, merchantId)));
}

export async function isFavourite(userId: number, merchantId: string, client: DbClient = db): Promise<boolean> {
  const [row] = await client
    .select({ merchantId: favourites.merchantId })
    .from(favourites)
    .where(and(eq(favourites.userId, userId), eq(favourites.merchantId, merchantId)))
    .limit(1);
  return Boolean(row);
}

/** Every merchant id this resident has starred. */
export async function listFavouriteMerchantIds(userId: number, client: DbClient = db): Promise<string[]> {
  const rows = await client
    .select({ merchantId: favourites.merchantId })
    .from(favourites)
    .where(eq(favourites.userId, userId));
  return rows.map((r) => r.merchantId);
}

/** How many residents have starred one outlet. */
export async function countFavouritesForMerchant(merchantId: string, client: DbClient = db): Promise<number> {
  const [row] = await client
    .select({ value: sql<number>`count(*)::int` })
    .from(favourites)
    .where(eq(favourites.merchantId, merchantId));
  return row?.value ?? 0;
}

/** Star counts for many outlets at once, keyed by merchant id (absent means zero). */
export async function countFavouritesByMerchant(merchantIds: string[], client: DbClient = db): Promise<Map<string, number>> {
  if (merchantIds.length === 0) return new Map();
  const rows = await client
    .select({ merchantId: favourites.merchantId, value: sql<number>`count(*)::int` })
    .from(favourites)
    .where(inArray(favourites.merchantId, merchantIds))
    .groupBy(favourites.merchantId);
  return new Map(rows.map((r) => [r.merchantId, r.value]));
}
