import { apiRequest } from "./queryClient";

/**
 * Web push from the browser's side.
 *
 * The permission prompt is the consent, so there is nothing to tick here: the
 * resident either grants it or does not, and turning it off again removes the
 * subscription. Everything below fails quietly, because a browser that cannot do
 * push is not an error the resident can act on.
 */

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushPermission(): NotificationPermission | "unsupported" {
  return pushSupported() ? Notification.permission : "unsupported";
}

/** VAPID keys travel as base64url; the browser wants the raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return (await navigator.serviceWorker.ready) ?? null;
  } catch {
    return null;
  }
}

/** True when this browser already has a subscription registered with the server. */
export async function isSubscribed(): Promise<boolean> {
  const reg = await registration();
  if (!reg) return false;
  return Boolean(await reg.pushManager.getSubscription());
}

/**
 * Asks for permission if it has not been answered, then registers the
 * subscription. Returns what happened so the caller can say something useful.
 */
export async function subscribeToPush(): Promise<"subscribed" | "denied" | "unsupported" | "unavailable"> {
  if (!pushSupported()) return "unsupported";
  const reg = await registration();
  if (!reg) return "unsupported";

  const response = await fetch("/api/push/key", {
    headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") ?? ""}` },
  });
  const { key } = (await response.json()) as { key: string | null };
  if (!key) return "unavailable";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }));

  const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "unavailable";
  await apiRequest("POST", "/api/push/subscribe", {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
  return "subscribed";
}

/** Removes the subscription here and on the server. The browser permission stays granted. */
export async function unsubscribeFromPush(): Promise<void> {
  const reg = await registration();
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => undefined);
  await apiRequest("DELETE", "/api/push/subscribe", { endpoint }).catch(() => undefined);
}
