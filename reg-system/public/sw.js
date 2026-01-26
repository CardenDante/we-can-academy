/**
 * Service Worker for Performance Optimization
 * Caches static assets for faster load times
 * Version: 2.0.0 (Web-optimized, no offline-first)
 */

const CACHE_VERSION = "wecan-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Install event - prepare cache
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Install");
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activate");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName.startsWith("wecan-") &&
                   cacheName !== STATIC_CACHE &&
                   cacheName !== IMAGE_CACHE;
          })
          .map((cacheName) => {
            console.log("[ServiceWorker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache static assets for performance
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip API requests - always go to network
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Handle image requests with cache-first strategy
  if (request.destination === "image" || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle static assets (JS, CSS, fonts) with cache-first for performance
  if (url.pathname.startsWith("/_next/") || url.pathname.match(/\.(js|css|woff|woff2|ttf|otf)$/i)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // For HTML pages, always fetch from network (no offline support)
  // This ensures users always get the latest version
});

/**
 * Cache-first strategy for images
 * Images rarely change and can be cached aggressively
 */
async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response("", { status: 404, statusText: "Not Found" });
  }
}

/**
 * Cache-first strategy for static assets (JS, CSS, fonts)
 * These are versioned by Next.js and can be cached indefinitely
 */
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // If we can't fetch and it's not in cache, let it fail
    throw error;
  }
}

// Listen for messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith("wecan-")) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});
