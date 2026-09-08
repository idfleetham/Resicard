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
