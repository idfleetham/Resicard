import { and, desc, eq, gt, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  CAMPAIGN_OPTOUT_ALL,
  campaignOptouts,
  campaigns,
  favourites,
  merchants,
  offers,
  pushSubscriptions,
  redemptions,
  users,
  type Campaign,
  type InsertCampaign,
  type PushSubscription,
} from "@shared/schema";
import type { DbClient } from "./types";

// Push subscriptions -----------------------------------------------------------

/**
 * Records a browser subscription. The endpoint is the identity, so a resident
 * re-granting on the same browser refreshes the row rather than piling up
 * duplicates that would each get their own notification.
 */
export async function upsertPushSubscription(
  values: { userId: number; endpoint: string; p256dh: string; auth: string },
  client: DbClient = db,
): Promise<void> {
  await client
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: values.userId, p256dh: values.p256dh, auth: values.auth, lastSeenAt: new Date() },
    });
}

export async function deletePushSubscription(userId: number, endpoint: string, client: DbClient = db): Promise<void> {
  await client
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

/** Removes an endpoint the push service has told us is gone (410 or 404). */
export async function deletePushSubscriptionByEndpoint(endpoint: string, client: DbClient = db): Promise<void> {
  await client.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function listPushSubscriptionsForUser(userId: number, client: DbClient = db): Promise<PushSubscription[]> {
  return client.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

// Opt-outs ---------------------------------------------------------------------

/** A resident's opt-outs: the global flag and the outlets they have muted. */
export async function getOptouts(
  userId: number,
  client: DbClient = db,
): Promise<{ all: boolean; merchantIds: string[] }> {
  const rows = await client.select().from(campaignOptouts).where(eq(campaignOptouts.userId, userId));
  return {
    all: rows.some((r) => r.merchantId === CAMPAIGN_OPTOUT_ALL),
    merchantIds: rows.filter((r) => r.merchantId !== CAMPAIGN_OPTOUT_ALL).map((r) => r.merchantId),
  };
}

/** Replaces the resident's per-outlet opt-outs wholesale; the global flag is separate. */
export async function setOutletOptouts(userId: number, merchantIds: string[], client: DbClient = db): Promise<void> {
  await client
    .delete(campaignOptouts)
    .where(and(eq(campaignOptouts.userId, userId), ne(campaignOptouts.merchantId, CAMPAIGN_OPTOUT_ALL)));
  if (merchantIds.length === 0) return;
  await client
    .insert(campaignOptouts)
    .values(merchantIds.map((merchantId) => ({ userId, merchantId })))
    .onConflictDoNothing();
}

export async function setGlobalOptout(userId: number, optedOut: boolean, client: DbClient = db): Promise<void> {
  if (optedOut) {
    await client
      .insert(campaignOptouts)
      .values({ userId, merchantId: CAMPAIGN_OPTOUT_ALL })
      .onConflictDoNothing();
    return;
  }
  await client
    .delete(campaignOptouts)
    .where(and(eq(campaignOptouts.userId, userId), eq(campaignOptouts.merchantId, CAMPAIGN_OPTOUT_ALL)));
}

/** One click, no sign-in: the unsubscribe link only ever turns marketing email off. */
export async function clearMarketingEmailOptIn(userId: number, client: DbClient = db): Promise<void> {
  await client.update(users).set({ marketingEmailOptIn: false }).where(eq(users.id, userId));
}

export async function setMarketingEmailOptIn(userId: number, optIn: boolean, client: DbClient = db): Promise<void> {
  await client.update(users).set({ marketingEmailOptIn: optIn }).where(eq(users.id, userId));
}

// Audience ---------------------------------------------------------------------

export interface AudienceMember {
  userId: number;
  email: string;
  firstName: string | null;
  marketingEmailOptIn: boolean;
}

/**
 * Who a campaign reaches: residents with a live membership who have not opted
 * out of this outlet or of everything, and who can actually be reached — a push
 * subscription, or an explicit marketing email opt-in.
 *
 * `favourites` narrows to residents who have starred the outlet, `past` to those
 * who have redeemed there. This never leaves the server as a list; the merchant
 * only ever sees `.length`.
 */
export async function listAudience(
  merchantId: string,
  audience: "all" | "favourites" | "past",
  client: DbClient = db,
): Promise<AudienceMember[]> {
  const reachable = or(
    eq(users.marketingEmailOptIn, true),
    sql`exists (select 1 from ${pushSubscriptions} where ${pushSubscriptions.userId} = ${users.id})`,
  );
  const notOptedOut = sql`not exists (
    select 1 from ${campaignOptouts}
    where ${campaignOptouts.userId} = ${users.id}
      and ${campaignOptouts.merchantId} in (${merchantId}, ${CAMPAIGN_OPTOUT_ALL})
  )`;
  const targeted =
    audience === "favourites"
      ? sql`exists (select 1 from ${favourites} where ${favourites.userId} = ${users.id} and ${favourites.merchantId} = ${merchantId})`
      : audience === "past"
        ? sql`exists (select 1 from ${redemptions} where ${redemptions.userId} = ${users.id} and ${redemptions.merchantId} = ${merchantId})`
        : sql`true`;

  return client
    .select({
      userId: users.id,
      email: users.email,
      firstName: users.firstName,
      marketingEmailOptIn: users.marketingEmailOptIn,
    })
    .from(users)
    .where(
      and(
        eq(users.role, "resident"),
        eq(users.membershipStatus, "active"),
        isNotNull(users.membershipExpiry),
        gt(users.membershipExpiry, new Date()),
        reachable,
        notOptedOut,
        targeted,
      ),
    );
}

/**
 * The outlets a resident could plausibly hear from: ones they have starred,
 * redeemed at, or already muted. Listing every approved outlet would turn the
 * preferences screen into a directory nobody reads.
 */
export async function listRelatedMerchants(
  userId: number,
  client: DbClient = db,
): Promise<{ id: string; name: string }[]> {
  const [starred, redeemed, muted] = await Promise.all([
    client.select({ id: favourites.merchantId }).from(favourites).where(eq(favourites.userId, userId)),
    client
      .selectDistinct({ id: redemptions.merchantId })
      .from(redemptions)
      .where(eq(redemptions.userId, userId)),
    client
      .select({ id: campaignOptouts.merchantId })
      .from(campaignOptouts)
      .where(and(eq(campaignOptouts.userId, userId), ne(campaignOptouts.merchantId, CAMPAIGN_OPTOUT_ALL))),
  ]);
  const ids = Array.from(new Set([...starred, ...redeemed, ...muted].map((r) => r.id)));
  if (ids.length === 0) return [];
  return client
    .select({ id: merchants.id, name: merchants.name })
    .from(merchants)
    .where(inArray(merchants.id, ids))
    .orderBy(merchants.name);
}

/** Every push endpoint for a set of residents, in one query. */
export async function listPushSubscriptionsForUsers(
  userIds: number[],
  client: DbClient = db,
): Promise<PushSubscription[]> {
  if (userIds.length === 0) return [];
  return client.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
}

// Campaigns --------------------------------------------------------------------

export async function createCampaign(values: InsertCampaign, client: DbClient = db): Promise<Campaign> {
  const [row] = await client.insert(campaigns).values(values).returning();
  return row;
}

export async function updateCampaign(
  id: string,
  values: Partial<InsertCampaign>,
  client: DbClient = db,
): Promise<void> {
  await client.update(campaigns).set(values).where(eq(campaigns.id, id));
}

/**
 * The merchant's campaigns, newest first. Failed ones are included: a merchant
 * who was told "sent" needs to see when it was not.
 */
export async function listCampaignsForMerchant(merchantId: string, client: DbClient = db) {
  return client
    .select({
      id: campaigns.id,
      offerId: campaigns.offerId,
      offerTitle: offers.title,
      body: campaigns.body,
      audience: campaigns.audience,
      status: campaigns.status,
      scheduledFor: campaigns.scheduledFor,
      sentAt: campaigns.sentAt,
      recipients: campaigns.recipients,
      createdAt: campaigns.createdAt,
    })
    .from(campaigns)
    .innerJoin(offers, eq(offers.id, campaigns.offerId))
    .where(eq(campaigns.merchantId, merchantId))
    .orderBy(desc(campaigns.scheduledFor));
}

/**
 * What the limit rules count: every campaign the merchant has committed to,
 * queued ones included, at the time it goes out. A failed send still counts —
 * the resident's inbox does not know it failed, and letting a failure buy
 * another slot is exactly the loophole that would get the limits gamed.
 */
export async function listCampaignTimes(merchantId: string, client: DbClient = db): Promise<{ sendAt: Date }[]> {
  const rows = await client
    .select({ scheduledFor: campaigns.scheduledFor, sentAt: campaigns.sentAt })
    .from(campaigns)
    .where(eq(campaigns.merchantId, merchantId));
  return rows.map((r) => ({ sendAt: r.sentAt ?? r.scheduledFor }));
}

/** Queued campaigns whose moment has come, across every merchant. */
export async function listDueCampaigns(now: Date, client: DbClient = db) {
  return client
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.status, "queued"), sql`${campaigns.scheduledFor} <= ${now}`))
    .orderBy(campaigns.scheduledFor);
}
