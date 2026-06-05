// v3: navigations are now network-first so a new deploy shows immediately
// instead of serving a stale cached page. Bumping the name purges old caches
// (including any previously-cached HTML).
const CACHE_NAME = "stockify-v3";
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

function cachePut(request, response) {
  if (response.ok && response.type === "basic") {
    const clone = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
  }
  return response;
}

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

  if (url.origin !== self.location.origin) return;

  // Page navigations (HTML): network-first so the latest deploy always wins,
  // falling back to cache only when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((res) => cachePut(request, res)).catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (hashed _next chunks, fonts, images): cache-first for speed.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => cachePut(request, res)))
  );
});
