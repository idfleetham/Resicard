/*
 * Minimal service worker.
 *
 * It exists so the browser treats Resicard as installable; it deliberately
 * caches NOTHING. A caching service worker is the usual way a web app ends up
 * serving a stale version after a deploy, and there is nothing here worth the
 * risk. Add caching later only with a versioned build and a clear update path.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clear anything an earlier version of this worker may have cached.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  // Straight through to the network.
  event.respondWith(fetch(event.request));
});

/*
 * Campaign notifications.
 *
 * The server sends { title, body, url, tag }. Nothing is cached here either:
 * the payload arrives with the push and the click opens a normal page load.
 */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A push with no readable payload is not worth a blank notification.
    return;
  }
  const title = payload.title || "Resicard";
  if (!payload.body) return;
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body,
      // The app icon, served from the client's public folder.
      icon: "/brand/icon-192.png",
      badge: "/brand/icon-192.png",
      // One notification per campaign: a resubscribed browser cannot stack duplicates.
      tag: payload.tag || "resicard",
      data: { url: payload.url || "/resident" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/resident";
  event.waitUntil(
    (async () => {
      // Reuse a tab that is already open rather than piling up windows.
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })(),
  );
});
