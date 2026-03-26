/**
 * Service Worker - Shivsagar Interior Tracker
 * Caches app shell for offline use and installability.
 */

const CACHE_NAME = "shivsagar-v1";
const ASSETS = [
  "/shivsagar-tracker/",
  "/shivsagar-tracker/index.html",
  "/shivsagar-tracker/js/schema.js",
  "/shivsagar-tracker/js/sheet-sync.js",
  "/shivsagar-tracker/js/app.js",
  "/shivsagar-tracker/manifest.json",
];

// Install: cache app shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for app shell
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Network-first for Google Apps Script sync calls
  if (url.hostname === "script.google.com") {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first for CDN resources (Tailwind, fonts)
  if (url.hostname !== location.hostname) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
