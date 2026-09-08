import { and, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { merchants, offers, users, type Merchant, type InsertMerchant } from "@shared/schema";
import type { DbClient } from "./types";

export async function getMerchantById(id: string, client: DbClient = db): Promise<Merchant | undefined> {
  const [row] = await client.select().from(merchants).where(eq(merchants.id, id)).limit(1);
  return row;
}

export async function getMerchantByScanCode(scanCode: string, client: DbClient = db): Promise<Merchant | undefined> {
  const [row] = await client.select().from(merchants).where(eq(merchants.scanCode, scanCode)).limit(1);
  return row;
}

export async function getMerchantByStripeSubscription(subscriptionId: string, client: DbClient = db): Promise<Merchant | undefined> {
  const [row] = await client.select().from(merchants).where(eq(merchants.stripeSubscriptionId, subscriptionId)).limit(1);
  return row;
}

export async function createMerchant(values: InsertMerchant, client: DbClient = db): Promise<Merchant> {
  const [row] = await client.insert(merchants).values(values).returning();
  return row;
}

export async function updateMerchant(id: string, values: Partial<InsertMerchant>, client: DbClient = db): Promise<Merchant | undefined> {
  const [row] = await client.update(merchants).set(values).where(eq(merchants.id, id)).returning();
  return row;
}

/** Approved merchants with a count of their live (active, non-archived) offers. */
export async function listApprovedMerchantsWithOfferCount(client: DbClient = db) {
  return client
    .select({
      id: merchants.id,
      name: merchants.name,
      category: merchants.category,
      address: merchants.address,
      logoUrl: merchants.logoUrl,
      reservationProvider: merchants.reservationProvider,
      reservationUrl: merchants.reservationUrl,
      offerCount: sql<number>`count(${offers.id})::int`,
    })
    .from(merchants)
    .leftJoin(offers, and(eq(offers.merchantId, merchants.id), eq(offers.active, true), eq(offers.archived, false)))
    .where(eq(merchants.status, "approved"))
    .groupBy(merchants.id)
    .orderBy(merchants.name);
}

/** Approved merchants with the columns the resident outlets list needs. */
export async function listApprovedMerchantsForOutlets(client: DbClient = db) {
  return client
    .select({
      id: merchants.id,
      name: merchants.name,
      category: merchants.category,
      address: merchants.address,
      logoUrl: merchants.logoUrl,
      reservationProvider: merchants.reservationProvider,
      reservationUrl: merchants.reservationUrl,
      planStatus: merchants.planStatus,
    })
    .from(merchants)
    .where(eq(merchants.status, "approved"))
    .orderBy(merchants.name);
}

/** Approved merchants with the columns the resident map needs, coordinates included. */
export async function listApprovedMerchantsForMap(client: DbClient = db) {
  return client
    .select({
      id: merchants.id,
      name: merchants.name,
      category: merchants.category,
      latitude: merchants.latitude,
      longitude: merchants.longitude,
      planStatus: merchants.planStatus,
    })
    .from(merchants)
    .where(eq(merchants.status, "approved"))
    .orderBy(merchants.name);
}

/** All merchants (optionally by status) with owner details and an offer count, for admins. */
export async function listMerchantsForAdmin(status: string | undefined, client: DbClient = db) {
  const query = client
    .select({
      merchant: merchants,
      owner: { id: users.id, email: users.email, firstName: users.firstName, surname: users.surname },
      offerCount: sql<number>`(select count(*) from ${offers} where ${offers.merchantId} = ${merchants.id} and ${offers.archived} = false)::int`,
    })
    .from(merchants)
    .leftJoin(users, eq(users.id, merchants.ownerUserId))
    .orderBy(desc(merchants.createdAt));
  if (status === "pending" || status === "approved" || status === "rejected") {
    return query.where(eq(merchants.status, status));
  }
  return query;
}

export async function countMerchantsWhere(condition: SQL | undefined, client: DbClient = db): Promise<number> {
  const [row] = await client.select({ value: count() }).from(merchants).where(condition);
  return row?.value ?? 0;
}
