import webpush from "web-push";
import { config } from "../config";
import { log } from "../vite";

/**
 * Web push, wrapped so the rest of the server never touches the library.
 *
 * Consent here is the browser's own permission prompt, which is why there is no
 * opt-in column for push: the subscription row exists precisely when the
 * resident said yes, and deleting it is the whole of withdrawing consent.
 */

let configured = false;

/** True when a VAPID key pair is set. Without one, push is off rather than broken. */
export function isPushConfigured(): boolean {
  return Boolean(config.vapidPublicKey && config.vapidPrivateKey);
}

export function pushPublicKey(): string {
  return config.vapidPublicKey;
}

function ensureConfigured(): boolean {
  if (!isPushConfigured()) return false;
  if (!configured) {
    webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
    configured = true;
  }
  return true;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** What the service worker's `push` handler expects to find in the payload. */
export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export interface PushOutcome {
  sent: number;
  /** Endpoints the push service says are gone, for the caller to delete. */
  gone: string[];
}

/**
 * Sends one payload to many endpoints. A 404 or 410 means the browser threw the
 * subscription away, so the endpoint is reported back for deletion; anything
 * else is logged and counted as a miss rather than failing the whole campaign.
 */
export async function sendPush(targets: PushTarget[], payload: PushPayload): Promise<PushOutcome> {
  if (!ensureConfigured() || targets.length === 0) return { sent: 0, gone: [] };
  const body = JSON.stringify(payload);
  const gone: string[] = [];
  let sent = 0;

  const results = await Promise.allSettled(
    targets.map((t) =>
      webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, body, {
        TTL: 6 * 60 * 60, // a campaign is about tonight; six hours later it is noise
      }),
    ),
  );

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sent += 1;
      return;
    }
    const status = (result.reason as { statusCode?: number } | undefined)?.statusCode;
    if (status === 404 || status === 410) {
      gone.push(targets[i].endpoint);
      return;
    }
    log(`push to ${targets[i].endpoint.slice(0, 60)} failed with ${status ?? "an error"}`, "push");
  });

  return { sent, gone };
}
