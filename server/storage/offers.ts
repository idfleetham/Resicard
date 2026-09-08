import { and, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { offers, merchants, type Offer } from "@shared/schema";
import type { DbClient } from "./types";

type OfferInsert = typeof offers.$inferInsert;

export const merchantSummaryColumns = {
  id: merchants.id,
  name: merchants.name,
  category: merchants.category,
  logoUrl: merchants.logoUrl,
  address: merchants.address,
};

export async function getOfferById(id: string, client: DbClient = db): Promise<Offer | undefined> {
  const [row] = await client.select().from(offers).where(eq(offers.id, id)).limit(1);
  return row;
}

export async function getOfferForMerchant(id: string, merchantId: string, client: DbClient = db): Promise<Offer | undefined> {
  const [row] = await client
    .select()
    .from(offers)
    .where(and(eq(offers.id, id), eq(offers.merchantId, merchantId)))
    .limit(1);
  return row;
}

/** Offer with its merchant, for public routes. */
export async function getOfferWithMerchant(id: string, client: DbClient = db) {
  const [row] = await client
    .select({ offer: offers, merchant: merchantSummaryColumns })
    .from(offers)
    .innerJoin(merchants, eq(merchants.id, offers.merchantId))
    .where(eq(offers.id, id))
    .limit(1);
  return row;
}

/** Public listing: active, non-archived offers of approved merchants. */
export async function listPublicOffers(filter: { category?: string; merchantId?: string }, client: DbClient = db) {
  const conditions: SQL[] = [eq(offers.active, true), eq(offers.archived, false), eq(merchants.status, "approved")];
  if (filter.category) conditions.push(eq(offers.category, filter.category));
  if (filter.merchantId) conditions.push(eq(offers.merchantId, filter.merchantId));
  return client
    .select({ offer: offers, merchant: merchantSummaryColumns })
    .from(offers)
    .innerJoin(merchants, eq(merchants.id, offers.merchantId))
    .where(and(...conditions))
    .orderBy(sql`case when ${offers.priority} = 'featured' then 0 else 1 end`, desc(offers.createdAt));
}

/** Active, non-archived offers for one merchant (scheduling is checked by the caller). */
export async function listActiveOffersForMerchant(merchantId: string, client: DbClient = db): Promise<Offer[]> {
  return client
    .select()
    .from(offers)
    .where(and(eq(offers.merchantId, merchantId), eq(offers.active, true), eq(offers.archived, false)))
    .orderBy(sql`case when ${offers.priority} = 'featured' then 0 else 1 end`, desc(offers.createdAt));
}

export async function listOffersForMerchant(merchantId: string, client: DbClient = db): Promise<Offer[]> {
  return client.select().from(offers).where(eq(offers.merchantId, merchantId)).orderBy(desc(offers.createdAt));
}

export async function createOffer(values: OfferInsert, client: DbClient = db): Promise<Offer> {
  const [row] = await client.insert(offers).values(values).returning();
  return row;
}

export async function updateOffer(id: string, values: Partial<OfferInsert>, client: DbClient = db): Promise<Offer | undefined> {
  const [row] = await client
    .update(offers)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(offers.id, id))
    .returning();
  return row;
}

export async function incrementOfferUsage(id: string, client: DbClient = db): Promise<void> {
  await client
    .update(offers)
    .set({ usageCount: sql`coalesce(${offers.usageCount}, 0) + 1` })
    .where(eq(offers.id, id));
}

/** Number of live (active, non-archived) offers for one merchant. */
export async function countLiveOffersForMerchant(merchantId: string, client: DbClient = db): Promise<number> {
  return countOffersWhere(and(eq(offers.merchantId, merchantId), eq(offers.active, true), eq(offers.archived, false)), client);
}

/** Sets the newest `count` live offers inactive (used when a merchant drops to Free). Returns how many were paused. */
export async function pauseNewestLiveOffers(merchantId: string, count: number, client: DbClient = db): Promise<number> {
  if (count <= 0) return 0;
  const newest = await client
    .select({ id: offers.id })
    .from(offers)
    .where(and(eq(offers.merchantId, merchantId), eq(offers.active, true), eq(offers.archived, false)))
    .orderBy(desc(offers.createdAt), desc(offers.id))
    .limit(count);
  if (newest.length === 0) return 0;
  await client
    .update(offers)
    .set({ active: false, updatedAt: new Date() })
    .where(inArray(offers.id, newest.map((o) => o.id)));
  return newest.length;
}

export async function countOffersWhere(condition: SQL | undefined, client: DbClient = db): Promise<number> {
  const [row] = await client.select({ value: count() }).from(offers).where(condition);
  return row?.value ?? 0;
}

/**
 * Count of active, non-archived offers belonging to approved merchants. No route
 * reads it since the public counter narrowed to residents and outlets; kept
 * because it is the one query that defines "a live offer" for the whole town.
 */
export async function countPublicActiveOffers(client: DbClient = db): Promise<number> {
  const [row] = await client
    .select({ value: count() })
    .from(offers)
    .innerJoin(merchants, eq(merchants.id, offers.merchantId))
    .where(and(eq(offers.active, true), eq(offers.archived, false), eq(merchants.status, "approved")));
  return row?.value ?? 0;
}
