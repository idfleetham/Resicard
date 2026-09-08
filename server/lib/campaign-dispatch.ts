import type { Campaign } from "@shared/schema";
import * as campaignStore from "../storage/campaigns";
import * as merchantStore from "../storage/merchants";
import * as offerStore from "../storage/offers";
import { campaignEmailService, unsubscribeUrl } from "./campaign-email";
import { config } from "../config";
import { isOfferLiveNow } from "./offer-rules";
import { sendPush } from "./push";
import { log } from "../vite";

/**
 * Delivery for campaigns: fan a campaign out to its audience, and flush the ones
 * queued for the next 08:00.
 *
 * The audience is resolved at send time, not at compose time, so a resident who
 * opts out during the queued hours is not sent to. That is the only correct
 * reading of consent: the answer that counts is the one held when the message
 * goes out.
 */

/** Sends one campaign and records what happened. Safe to call on a queued or failed row. */
export async function dispatchCampaign(campaign: Campaign): Promise<{ recipients: number }> {
  await campaignStore.updateCampaign(campaign.id, { status: "sending" });
  try {
    const [merchant, offer] = await Promise.all([
      merchantStore.getMerchantById(campaign.merchantId),
      offerStore.getOfferById(campaign.offerId),
    ]);
    if (!merchant || !offer) throw new Error("The outlet or offer is gone");

    // The offer must still be live at the moment of sending. A campaign queued
    // overnight for an offer the merchant then archived would otherwise send a
    // promise no one can redeem, which is worse than not sending at all.
    if (offer.archived || !offer.active || !isOfferLiveNow(offer, new Date())) {
      await campaignStore.updateCampaign(campaign.id, { status: "failed", recipients: 0 });
      log(`campaign ${campaign.id} not sent: the offer is no longer live`, "campaigns");
      return { recipients: 0 };
    }

    const audience = await campaignStore.listAudience(campaign.merchantId, campaign.audience);
    const offerUrl = `${config.publicBaseUrl}/offers/${offer.id}`;

    const subscriptions = await campaignStore.listPushSubscriptionsForUsers(audience.map((a) => a.userId));
    const push = await sendPush(subscriptions, {
      title: merchant.name,
      body: campaign.body,
      url: offerUrl,
      tag: `campaign-${campaign.id}`,
    });
    for (const endpoint of push.gone) await campaignStore.deletePushSubscriptionByEndpoint(endpoint);

    // Email only where the resident has explicitly opted in, and only where push
    // did not already reach them, so nobody gets the same line twice.
    const reachedByPush = new Set(subscriptions.map((s) => s.userId));
    const emailTargets = audience.filter((a) => a.marketingEmailOptIn && !reachedByPush.has(a.userId));
    let emailed = 0;
    for (const target of emailTargets) {
      try {
        await campaignEmailService.sendCampaign({
          to: target.email,
          firstName: target.firstName,
          merchantName: merchant.name,
          offerTitle: offer.title,
          body: campaign.body,
          unsubscribeUrl: unsubscribeUrl(target.userId),
          offerUrl,
        });
        emailed += 1;
      } catch {
        // One bad address does not fail the campaign.
      }
    }

    const recipients = push.sent + emailed;
    await campaignStore.updateCampaign(campaign.id, { status: "sent", sentAt: new Date(), recipients });
    log(`campaign ${campaign.id} sent to ${recipients}`, "campaigns");
    return { recipients };
  } catch (error) {
    await campaignStore.updateCampaign(campaign.id, { status: "failed" });
    log(`campaign ${campaign.id} failed: ${(error as Error).message}`, "campaigns");
    return { recipients: 0 };
  }
}

/** Sends every queued campaign whose scheduled moment has passed. Idempotent. */
export async function dispatchDueCampaigns(now: Date = new Date()): Promise<number> {
  const due = await campaignStore.listDueCampaigns(now);
  for (const campaign of due) await dispatchCampaign(campaign);
  return due.length;
}

const SWEEP_MS = 5 * 60 * 1000;

/**
 * Flushes queued campaigns every few minutes. A campaign queued at midnight has
 * to go out at 08:00 whether or not anyone touches the app, and five minutes of
 * lag on "quiet Tuesday" copy costs nothing.
 */
export function startCampaignDispatcher(): NodeJS.Timeout {
  const timer = setInterval(() => {
    dispatchDueCampaigns().catch((error) => log(`campaign sweep failed: ${(error as Error).message}`, "campaigns"));
  }, SWEEP_MS);
  timer.unref?.();
  return timer;
}
