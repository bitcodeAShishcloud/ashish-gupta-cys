/*
 * Migration kill-switch service worker.
 *
 * The previous static HTML site on this domain registered a service worker.
 * This file replaces it: as soon as any browser holding the old worker
 * fetches this one, the old registration is unregistered and every Cache
 * Storage entry is deleted, so the stale shell can never be served again.
 *
 * New visitors (no existing service worker) never reach this file — the
 * registration snippet only runs when a controller is already present.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (err) {
        /* cache storage unavailable — still unregister below */
      }
      await self.registration.unregister();
    })(),
  );
});
