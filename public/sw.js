// v4: adds Web Push handlers for server-side price alerts.
// (v3 made navigations network-first so new deploys show immediately.)
const CACHE_NAME = "stockify-v4";
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

// ---- Web Push (server-side price alerts) ----

self.addEventListener("push", (event) => {
  let payload = { title: "Stockify", body: "Price alert triggered", url: "/" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    /* keep defaults */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.url, // collapse repeat alerts for the same ticker
      data: { url: payload.url },
      requireInteraction: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (new URL(win.url).origin === self.location.origin && "focus" in win) {
          win.navigate(url);
          return win.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
