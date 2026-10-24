/*
 * Calories — service worker.
 * Purpose: PWA installability (a fetch handler is required), instant app
 * opens, and a lightweight offline fallback, WITHOUT caching API responses.
 *
 * Strategies:
 *   - /_next/static/* (JS, CSS, fonts): cache-first. Next content-hashes these
 *     filenames, so a cached copy can never be stale — repeat visits load the
 *     whole app from disk with no network round trips.
 *   - /icons/*: cache-first, refreshed in the background.
 *   - Page navigations: stale-while-revalidate. Every page is the same
 *     client-rendered shell for every user (all data is read from Firestore in
 *     the browser), so the copy from the last visit opens the app instantly —
 *     no wait on the network or on a server cold start — while a fresh copy is
 *     fetched in the background for next time. A cached page keeps the CSP
 *     header it was served with, so its nonce still matches its own scripts.
 */
const CACHE = "calories-v3";
const PAGES = "calories-pages-v1";
const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];
// Each deploy adds new hashed files; keep the cache from growing forever.
const MAX_STATIC_ENTRIES = 250;
// Records which build the cached pages belong to.
const BUILD_KEY = "/__sw-build-id";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE && k !== PAGES).map((k) => caches.delete(k))
      );
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

// Next embeds the build id in each page's inline RSC payload as \"b\":\"<id>\".
function buildIdOf(html) {
  const match = html.match(/\\"b\\":\\"([\w-]+)/);
  return match ? match[1] : null;
}

// Stores a fresh page. When it comes from a new deploy, the other cached pages
// are dropped: they point at the previous build's scripts, and the client
// router would answer the next tab switch with a full reload into them.
async function storePage(cache, key, response) {
  const html = await response.clone().text();
  const build = buildIdOf(html);
  if (build) {
    const stored = await cache.match(BUILD_KEY);
    const storedBuild = stored ? await stored.text() : null;
    if (storedBuild !== build) {
      const keys = await cache.keys();
      await Promise.all(keys.map((k) => cache.delete(k)));
      await cache.put(BUILD_KEY, new Response(build));
    }
  }
  await cache.put(key, response);
}

async function fetchPage(event, cache, key) {
  const response = (await event.preloadResponse) || (await fetch(event.request));
  const type = response.headers.get("content-type") || "";
  if (response.ok && response.type === "basic" && type.includes("text/html")) {
    event.waitUntil(storePage(cache, key, response.clone()).catch(() => {}));
  }
  return response;
}

async function staleWhileRevalidatePage(event, url) {
  const cache = await caches.open(PAGES);
  const key = url.origin + url.pathname;
  const cached = await cache.match(key);
  const network = fetchPage(event, cache, key);
  if (cached) {
    event.waitUntil(network.catch(() => {}));
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
    // A query string (e.g. /chat?q=…) is an intent for this visit only, so
    // those always go to the network.
    event.respondWith(
      url.search ? networkFirstPage(event) : staleWhileRevalidatePage(event, url)
    );
  }
  // Everything else (RSC payloads, manifest, misc public files) goes straight
  // to the network without passing through the worker.
});
