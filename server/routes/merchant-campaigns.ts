import { Router } from "express";
import { createCampaignSchema } from "@shared/schema";
import { config } from "../config";
import * as campaignStore from "../storage/campaigns";
import * as merchantStore from "../storage/merchants";
import * as offerStore from "../storage/offers";
import { authenticate, currentMerchantId, currentUser, requireRole } from "../lib/auth";
import { asyncHandler, badRequest, notFound, parseBody, HttpError } from "../lib/http";
import { hasLoyalty } from "../lib/plan";
import {
  CAMPAIGN_BODY_MAX,
  CAMPAIGN_GAP_DAYS,
  CAMPAIGN_MONTHLY_CAP,
  CAMPAIGN_WINDOW_END_HOUR,
  CAMPAIGN_WINDOW_START_HOUR,
  campaignLimitMessage,
  planCampaign,
} from "../lib/campaigns";
import { dispatchCampaign } from "../lib/campaign-dispatch";
import { isOfferLiveNow } from "../lib/offer-rules";
import { isPushConfigured } from "../lib/push";

/**
 * The merchant side of campaigns. Every limit is applied here and none of them
 * is a merchant field: the composer reads the same numbers back, so the rules
 * are visible, but there is nothing to change.
 */

export const merchantCampaignsRouter = Router();

const CAMPAIGN_PLAN_MESSAGE = "Sending an offer to residents is part of Standard and Insight.";

/** The rules, sent to the client so the composer states them rather than inventing them. */
const LIMITS = {
  bodyMax: CAMPAIGN_BODY_MAX,
  gapDays: CAMPAIGN_GAP_DAYS,
  monthlyCap: CAMPAIGN_MONTHLY_CAP,
  windowStartHour: CAMPAIGN_WINDOW_START_HOUR,
  windowEndHour: CAMPAIGN_WINDOW_END_HOUR,
} as const;

async function requireStandardPlan(merchantId: string) {
  const merchant = await merchantStore.getMerchantById(merchantId);
  if (!merchant) throw notFound("Merchant not found");
  if (!hasLoyalty(merchant.planStatus)) throw new HttpError(403, CAMPAIGN_PLAN_MESSAGE, "plan_required");
  return merchant;
}

/**
 * The audience count, suppressed below the same cohort floor the analytics use.
 * A count of three, next to a choice of "people who have redeemed here", is a
 * short step from working out who they are.
 */
function reportableSize(size: number): { size: number | null; suppressed: boolean; minimum: number } {
  const minimum = config.analyticsMinCohort;
  return size < minimum ? { size: null, suppressed: true, minimum } : { size, suppressed: false, minimum };
}

merchantCampaignsRouter.get(
  "/api/merchant/campaigns",
  authenticate,
  requireRole("merchant"),
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    const merchant = await merchantStore.getMerchantById(merchantId);
    if (!merchant) throw notFound("Merchant not found");
    const allowed = hasLoyalty(merchant.planStatus);

    const now = new Date();
    const [history, times, offers] = await Promise.all([
      allowed ? campaignStore.listCampaignsForMerchant(merchantId) : Promise.resolve([]),
      allowed ? campaignStore.listCampaignTimes(merchantId) : Promise.resolve([]),
      allowed ? offerStore.listActiveOffersForMerchant(merchantId) : Promise.resolve([]),
    ]);
    const plan = planCampaign(times, now);

    // Only offers a resident could redeem right now can be sent. Anything else
    // is a promise the till would refuse.
    const eligibleOffers = offers
      .filter((o) => isOfferLiveNow(o, now))
      .map((o) => ({ id: o.id, title: o.title, shortPromo: o.shortPromo, type: o.type, percentOff: o.percentOff }));

    const audiences = allowed
      ? await Promise.all(
          (["all", "favourites", "past"] as const).map(async (audience) => {
            const members = await campaignStore.listAudience(merchantId, audience);
            return { audience, ...reportableSize(members.length) };
          }),
        )
      : [];

    res.json({
      allowed,
      planMessage: allowed ? null : CAMPAIGN_PLAN_MESSAGE,
      pushConfigured: isPushConfigured(),
      limits: LIMITS,
      eligibleOffers,
      audiences,
      nextAllowedAt: plan.nextAllowedAt.toISOString(),
      canSendNow: plan.allowed,
      blockedReason: plan.reason,
      sentThisMonth: plan.sentThisMonth,
      campaigns: history,
    });
  }),
);

merchantCampaignsRouter.post(
  "/api/merchant/campaigns",
  authenticate,
  requireRole("merchant"),
  asyncHandler(async (req, res) => {
    const merchantId = currentMerchantId(req);
    const merchant = await requireStandardPlan(merchantId);
    if (merchant.status !== "approved") throw badRequest("Your outlet is not approved yet");

    const body = parseBody(createCampaignSchema, req.body);
    const now = new Date();

    const offer = await offerStore.getOfferForMerchant(body.offerId, merchantId);
    if (!offer) throw notFound("Offer not found");
    if (offer.archived || !offer.active || !isOfferLiveNow(offer, now)) {
      throw badRequest("Pick an offer that is live right now");
    }

    const plan = planCampaign(await campaignStore.listCampaignTimes(merchantId), now);
    if (!plan.allowed) {
      throw new HttpError(429, campaignLimitMessage(plan), "campaign_limit");
    }

    const campaign = await campaignStore.createCampaign({
      merchantId,
      offerId: offer.id,
      body: body.body,
      audience: body.audience,
      status: "queued",
      scheduledFor: plan.sendAt,
      createdBy: currentUser(req).id,
    });

    // Inside the window it goes now; outside it waits for the sweeper at 08:00.
    if (!plan.queued) {
      const { recipients } = await dispatchCampaign(campaign);
      res.status(201).json({
        campaign: { ...campaign, status: "sent", recipients },
        queued: false,
        ...reportableSize(recipients),
      });
      return;
    }

    res.status(201).json({
      campaign,
      queued: true,
      scheduledFor: plan.sendAt.toISOString(),
      size: null,
      suppressed: false,
      minimum: config.analyticsMinCohort,
    });
  }),
);
