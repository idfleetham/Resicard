import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { offerPriceChanges, offers, merchants, users, type OfferPriceChange } from "@shared/schema";
import type { DbClient } from "./types";

type PriceChangeInsert = typeof offerPriceChanges.$inferInsert;

export interface PriceChangeFilter {
  since: Date;
  merchantId?: string;
  flaggedOnly?: boolean;
}

function conditions(filter: PriceChangeFilter): SQL[] {
  const list: SQL[] = [gte(offerPriceChanges.changedAt, filter.since)];
  if (filter.merchantId) list.push(eq(offerPriceChanges.merchantId, filter.merchantId));
  if (filter.flaggedOnly) list.push(eq(offerPriceChanges.inflatesSaving, true));
  return list;
}

/** Written inside the same transaction as the offer update, so a half record is impossible. */
export async function insertPriceChanges(values: PriceChangeInsert[], client: DbClient = db): Promise<OfferPriceChange[]> {
  if (values.length === 0) return [];
  return client.insert(offerPriceChanges).values(values).returning();
}

/** Newest first, with the offer, the outlet and whoever saved the edit. */
export async function listPriceChanges(filter: PriceChangeFilter, limit: number, client: DbClient = db) {
  return client
    .select({
      id: offerPriceChanges.id,
      changedAt: offerPriceChanges.changedAt,
      field: offerPriceChanges.field,
      oldValue: offerPriceChanges.oldValue,
      newValue: offerPriceChanges.newValue,
      direction: offerPriceChanges.direction,
      inflatesSaving: offerPriceChanges.inflatesSaving,
      offerId: offerPriceChanges.offerId,
      offerTitle: offers.title,
      offerType: offers.type,
      merchantId: offerPriceChanges.merchantId,
      merchantName: merchants.name,
      changedById: users.id,
      changedByUsername: users.username,
    })
    .from(offerPriceChanges)
    .innerJoin(offers, eq(offers.id, offerPriceChanges.offerId))
    .innerJoin(merchants, eq(merchants.id, offerPriceChanges.merchantId))
    .leftJoin(users, eq(users.id, offerPriceChanges.changedBy))
    .where(and(...conditions(filter)))
    .orderBy(desc(offerPriceChanges.changedAt))
    .limit(limit);
}

/**
 * One line per outlet with at least one flagged change in the window. Outlets
 * with none are absent rather than listed at zero, so a quiet town shows an
 * empty table instead of a page of noise.
 */
export async function summarisePriceChanges(filter: Omit<PriceChangeFilter, "flaggedOnly">, client: DbClient = db) {
  const move = sql`(${offerPriceChanges.newValue} - ${offerPriceChanges.oldValue}) / nullif(${offerPriceChanges.oldValue}, 0)`;
  return client
    .select({
      merchantId: offerPriceChanges.merchantId,
      name: merchants.name,
      flaggedChanges: sql<number>`count(*)::int`,
      largestMovePercent: sql<number | null>`max(${move})::float8`,
    })
    .from(offerPriceChanges)
    .innerJoin(merchants, eq(merchants.id, offerPriceChanges.merchantId))
    .where(and(...conditions({ ...filter, flaggedOnly: true })))
    .groupBy(offerPriceChanges.merchantId, merchants.name)
    .orderBy(desc(sql`count(*)`), merchants.name);
}
