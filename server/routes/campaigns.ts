import { Router } from "express";
import { campaignPreferencesSchema, pushSubscribeSchema, pushUnsubscribeSchema } from "@shared/schema";
import { config } from "../config";
import * as campaignStore from "../storage/campaigns";
import * as userStore from "../storage/users";
import { authenticate, currentUser, requireRole } from "../lib/auth";
import { asyncHandler, notFound, parseBody } from "../lib/http";
import { isPushConfigured, pushPublicKey } from "../lib/push";
import { readUnsubscribeToken } from "../lib/campaign-email";

/**
 * The resident side of campaigns: the push subscription, the preferences that
 * turn campaigns off, and the one-click unsubscribe link.
 *
 * The two channels are consented to differently on purpose. Web push is granted
 * by the browser's own prompt, so the subscription row *is* the record of
 * consent. Marketing email is direct marketing under PECR, so it is an explicit
 * opt-in, off by default, never pre-ticked, and every campaign email carries a
 * link that works without signing in.
 */

export const campaignsRouter = Router();

campaignsRouter.get(
  "/api/push/key",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (_req, res) => {
    res.json({ key: isPushConfigured() ? pushPublicKey() : null });
  }),
);

campaignsRouter.post(
  "/api/push/subscribe",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = parseBody(pushSubscribeSchema, req.body);
    await campaignStore.upsertPushSubscription({
      userId: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    });
    res.status(201).json({ subscribed: true });
  }),
);

campaignsRouter.delete(
  "/api/push/subscribe",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = parseBody(pushUnsubscribeSchema, req.body);
    await campaignStore.deletePushSubscription(user.id, body.endpoint);
    res.json({ subscribed: false });
  }),
);

async function preferencesPayload(userId: number) {
  const [user, optouts, outlets, subscriptions] = await Promise.all([
    userStore.getUserById(userId),
    campaignStore.getOptouts(userId),
    campaignStore.listRelatedMerchants(userId),
    campaignStore.listPushSubscriptionsForUser(userId),
  ]);
  if (!user) throw notFound("User not found");
  return {
    marketingEmailOptIn: user.marketingEmailOptIn ?? false,
    optOutAll: optouts.all,
    optedOutMerchantIds: optouts.merchantIds,
    outlets,
    pushConfigured: isPushConfigured(),
    // How many browsers this resident has granted push on. The prompt itself is
    // the consent, so this is a count of devices, not a switch.
    pushDevices: subscriptions.length,
  };
}

campaignsRouter.get(
  "/api/campaign-preferences",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    res.json(await preferencesPayload(currentUser(req).id));
  }),
);

campaignsRouter.put(
  "/api/campaign-preferences",
  authenticate,
  requireRole("resident"),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = parseBody(campaignPreferencesSchema, req.body);
    if (body.marketingEmailOptIn !== undefined) {
      await campaignStore.setMarketingEmailOptIn(user.id, body.marketingEmailOptIn);
    }
    if (body.optOutAll !== undefined) await campaignStore.setGlobalOptout(user.id, body.optOutAll);
    if (body.optedOutMerchantIds !== undefined) {
      await campaignStore.setOutletOptouts(user.id, body.optedOutMerchantIds);
    }
    res.json(await preferencesPayload(user.id));
  }),
);

/**
 * One click, no sign-in, no confirmation step. A signed token names the user and
 * grants nothing beyond turning marketing email off, so it is safe to leave in
 * an old email for as long as the email exists. This is a page rather than JSON
 * because it is opened from a mail client.
 */
campaignsRouter.get(
  "/api/unsubscribe/:token",
  asyncHandler(async (req, res) => {
    const userId = readUnsubscribeToken(String(req.params.token ?? ""));
    if (userId) await campaignStore.clearMarketingEmailOptIn(userId);
    const message = userId
      ? "You will not get any more marketing email from Resicard."
      : "That link is not valid. Sign in and change your preferences instead.";
    res.status(userId ? 200 : 400).type("html").send(unsubscribePage(message));
  }),
);

/** A single plain page, in the brand colours, with no tracking of any kind. */
function unsubscribePage(message: string): string {
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Email preferences</title>
<style>
  body { margin:0; background:#F2F5F4; color:#0F3B47; font:16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
  main { max-width:32rem; margin:0 auto; padding:3rem 1.25rem; }
  .card { background:#fff; border-radius:16px; padding:1.5rem; }
  h1 { font-size:1.75rem; letter-spacing:-0.03em; margin:0 0 0.75rem; }
  p { margin:0 0 1rem; }
  .small { color:#5C6F75; font-size:0.8125rem; }
  a { display:inline-block; background:#E4572E; color:#fff; text-decoration:none; font-weight:700; padding:0.75rem 1.25rem; border-radius:999px; }
</style>
</head>
<body>
  <main>
    <div class="card">
      <h1>Email preferences</h1>
      <p>${message}</p>
      <p class="small">Notifications on your phone are separate. Turn those off in the app, or in your browser settings.</p>
      <a href="${config.publicBaseUrl}">Back to Resicard</a>
    </div>
  </main>
</body>
</html>`;
}
