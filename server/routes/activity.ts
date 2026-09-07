import { Router } from "express";
import * as redemptionStore from "../storage/redemptions";
import * as loyaltyStore from "../storage/loyalty";
import { authenticate, requireRole, currentUser } from "../lib/auth";
import { asyncHandler } from "../lib/http";

const FEED_LIMIT = 100;

interface FeedMerchant {
  id: string;
  name: string;
  logoUrl: string | null;
}

export type ActivityItem =
  | { kind: "redemption"; id: string; at: Date; merchant: FeedMerchant; title: string; code: string; pointsAwarded: number }
  | { kind: "points" | "reward" | "tier"; id: string; at: Date; merchant: FeedMerchant; title: string; amount: number | null };

/** Points earned as part of an offer redemption already show on the redemption row. */
function belongsToRedemption(metadata: Record<string, unknown> | null): boolean {
  if (!metadata) return false;
  return metadata.source === "redemption" || metadata.redemptionId !== undefined;
}

export const activityRouter = Router();

activityRouter.get(
  "/api/activity/mine",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const userId = currentUser(req).id;
    const [redemptions, events] = await Promise.all([
      redemptionStore.listRedemptionsForUser(userId),
      loyaltyStore.listEventsForUser(userId, FEED_LIMIT),
    ]);

    const feed: ActivityItem[] = [];
    for (const r of redemptions) {
      feed.push({
        kind: "redemption",
        id: r.id,
        at: r.redeemedAt ?? new Date(0),
        merchant: { id: r.merchantId, name: r.merchantName, logoUrl: r.merchantLogoUrl },
        title: r.offerTitle,
        code: r.code,
        pointsAwarded: r.pointsAwarded ?? 0,
      });
    }
    for (const { event, merchant } of events) {
      const at = event.createdAt ?? new Date(0);
      const meta = event.metadata ?? null;
      switch (event.type) {
        case "earn_points":
          if (belongsToRedemption(meta)) break;
          feed.push({ kind: "points", id: event.id, at, merchant, title: `+${event.amount ?? 0} points`, amount: event.amount });
          break;
        case "earn_stamp":
          feed.push({ kind: "points", id: event.id, at, merchant, title: `+${event.amount ?? 1} stamp`, amount: event.amount });
          break;
        case "redeem_reward": {
          const name = typeof meta?.rewardName === "string" ? meta.rewardName : "reward";
          feed.push({ kind: "reward", id: event.id, at, merchant, title: `Claimed ${name}`, amount: event.amount });
          break;
        }
        case "tier_change": {
          const name = typeof meta?.toTierName === "string" ? meta.toTierName : null;
          feed.push({ kind: "tier", id: event.id, at, merchant, title: name ? `Now ${name}` : "Tier changed", amount: null });
          break;
        }
        default:
          break;
      }
    }

    feed.sort((a, b) => b.at.getTime() - a.at.getTime());
    res.json(feed.slice(0, FEED_LIMIT));
  }),
);
