// Bumped to v2 to purge any v1 entries that may have cached authenticated
// API responses (e.g. /api/watchlist, /api/portfolio).
const CACHE_NAME = "stockify-v2";
// Only precache public, static pages. /watchlist is auth-gated and would cache
// a sign-in redirect, so it is intentionally excluded.
const PRECACHE = ["/", "/compare"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever handle GET. Caching a POST/DELETE throws, and mutations must
  // always hit the network.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API responses — they can be user-specific (watchlist,
  // portfolio, alerts). Go to network; fall back to nothing if offline.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).catch(() => Response.error()));
    return;
  }

  // Cache-first for same-origin static assets only.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Cache successful, basic (same-origin) responses for offline use.
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
