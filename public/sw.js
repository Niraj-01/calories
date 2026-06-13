/*
 * Calories — minimal service worker.
 * Purpose: satisfy PWA installability (a fetch handler is required) and provide a
 * lightweight offline fallback, WITHOUT caching dynamic/auth/API responses that
 * would break the live SSR app. Strategy: network-first, fall back to cache.
 */
const CACHE = "calories-v1";
const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests. Never touch API routes, auth, or POSTs.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful static asset responses for offline fallback.
        if (
          response.ok &&
          (url.pathname.startsWith("/icons/") ||
            url.pathname.startsWith("/_next/static/"))
        ) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
