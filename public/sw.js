// Service Worker — network-first strategy
// Always fetches latest from server; falls back to cache when offline.

const CACHE_NAME = "battery-v1";

// Install: cache the app shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache essential assets (paths are relative to SW scope)
      return cache.addAll([
        "./",
        "./manifest.json",
        "./icon-192.png",
        "./icon-512.png",
      ]);
    })
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Don't cache GitHub API calls
  if (request.url.includes("api.github.com")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline — try cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, return cached index
          if (request.mode === "navigate") {
            return caches.match("./");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
