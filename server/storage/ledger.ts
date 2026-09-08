import { and, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { subscriptionEvents, type SubscriptionEvent } from "@shared/schema";
import type { DbClient } from "./types";

type InsertSubscriptionEvent = typeof subscriptionEvents.$inferInsert;

export async function insertSubscriptionEvent(values: InsertSubscriptionEvent, client: DbClient = db): Promise<SubscriptionEvent> {
  const [row] = await client.insert(subscriptionEvents).values(values).returning();
  return row;
}

/** Newest first. */
export async function listSubscriptionEvents(limit: number, client: DbClient = db): Promise<SubscriptionEvent[]> {
  return client.select().from(subscriptionEvents).orderBy(desc(subscriptionEvents.createdAt)).limit(limit);
}

/** Every event created on or after `since`, oldest first. */
export async function listSubscriptionEventsSince(since: Date, client: DbClient = db): Promise<SubscriptionEvent[]> {
  return client.select().from(subscriptionEvents).where(gte(subscriptionEvents.createdAt, since)).orderBy(subscriptionEvents.createdAt);
}

/** True when the subject already has a started or renewed event (i.e. a previous paid period). */
export async function hasPaidPeriod(kind: SubscriptionEvent["kind"], subjectId: string, client: DbClient = db): Promise<boolean> {
  const [row] = await client
    .select({ id: subscriptionEvents.id })
    .from(subscriptionEvents)
    .where(and(eq(subscriptionEvents.kind, kind), eq(subscriptionEvents.subjectId, subjectId), inArray(subscriptionEvents.action, ["started", "renewed"])))
    .limit(1);
  return Boolean(row);
}

/** True when the subject has at least one event with money on it (a trial is never that). */
export async function hasPaidAmount(kind: SubscriptionEvent["kind"], subjectId: string, client: DbClient = db): Promise<boolean> {
  const [row] = await client
    .select({ id: subscriptionEvents.id })
    .from(subscriptionEvents)
    .where(and(eq(subscriptionEvents.kind, kind), eq(subscriptionEvents.subjectId, subjectId), gt(subscriptionEvents.amountGbp, "0")))
    .limit(1);
  return Boolean(row);
}

/** Everything a subject has actually been charged, in GBP. Trials are zero, so they add nothing. */
export async function sumPaidForSubject(kind: SubscriptionEvent["kind"], subjectId: string, client: DbClient = db): Promise<number> {
  const [row] = await client
    .select({ total: sql<string>`coalesce(sum(${subscriptionEvents.amountGbp}), 0)` })
    .from(subscriptionEvents)
    .where(and(eq(subscriptionEvents.kind, kind), eq(subscriptionEvents.subjectId, subjectId)));
  return Number(row?.total ?? 0);
}

/** Subject ids of the given kind that have at least one event of any action. */
export async function subjectIdsWithEvents(kind: SubscriptionEvent["kind"], client: DbClient = db): Promise<Set<string>> {
  const rows = await client
    .selectDistinct({ subjectId: subscriptionEvents.subjectId })
    .from(subscriptionEvents)
    .where(eq(subscriptionEvents.kind, kind));
  return new Set(rows.map((r) => r.subjectId));
}
