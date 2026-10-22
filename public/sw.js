/*
 * Calories — service worker.
 * Purpose: PWA installability (a fetch handler is required), fast repeat loads,
 * and a lightweight offline fallback, WITHOUT caching dynamic/auth/API
 * responses that would break the live SSR app.
 *
 * Strategies:
 *   - /_next/static/* (JS, CSS, fonts): cache-first. Next content-hashes these
 *     filenames, so a cached copy can never be stale — repeat visits load the
 *     whole app from disk with no network round trips.
 *   - /icons/*: cache-first, refreshed in the background.
 *   - Page navigations: network-first (fresh HTML + CSP nonce every time), using
 *     navigation preload so the request starts while the worker boots.
 */
const CACHE = "calories-v2";
const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];
// Each deploy adds new hashed files; keep the cache from growing forever.
const MAX_STATIC_ENTRIES = 250;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })()
  );
});

async function trimCache(cache) {
  const keys = await cache.keys();
  // Cache keys come back in insertion order, so the oldest go first.
  const excess = keys.length - MAX_STATIC_ENTRIES;
  for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
}

async function cacheFirst(event, { revalidate }) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request);
  const network = fetch(event.request).then((response) => {
    if (response.ok) {
      event.waitUntil(cache.put(event.request, response.clone()).then(() => trimCache(cache)));
    }
    return response;
  });
  if (cached) {
    if (revalidate) event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}

async function networkFirstPage(event) {
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch (err) {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests. Never touch API routes, auth, or POSTs.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event, { revalidate: false }));
    return;
  }
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(event, { revalidate: true }));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
  }
  // Everything else (RSC payloads, manifest, misc public files) goes straight
  // to the network without passing through the worker.
});
