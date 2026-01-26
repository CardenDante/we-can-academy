/**
 * Service Worker for Offline Support
 * Caches API responses and static assets
 * Version: 1.0.0
 */

const CACHE_VERSION = "wecan-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Static assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/staff",
  "/teacher",
  "/offline",
];

// API routes that can be cached
const CACHEABLE_API_ROUTES = [
  "/api/mobile/weekends",
  "/api/mobile/sessions",
  "/api/mobile/students",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Install");
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[ServiceWorker] Caching static assets");
        return cache.addAll(STATIC_ASSETS.map((url) => new Request(url, { cache: "reload" })));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activate");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName.startsWith("wecan-") && cacheName !== STATIC_CACHE && cacheName !== API_CACHE && cacheName !== IMAGE_CACHE;
          })
          .map((cacheName) => {
            console.log("[ServiceWorker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle image requests
  if (request.destination === "image" || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request));
});

/**
 * Network first, fallback to cache for API requests
 * Caches successful GET responses for offline use
 */
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_ROUTES.some((route) => url.pathname.startsWith(route));

  try {
    // Try network first
    const response = await fetch(request);

    // Cache successful responses for cacheable routes
    if (isCacheable && response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    if (isCacheable) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log("[ServiceWorker] Serving API from cache:", url.pathname);
        return cachedResponse;
      }
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: "Offline",
        message: "No network connection and no cached data available",
        offline: true,
      }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Cache first with network fallback for images
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
    // Return placeholder or error
    return new Response("", { status: 404, statusText: "Not Found" });
  }
}

/**
 * Network first with cache fallback for static assets
 */
async function handleStaticRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log("[ServiceWorker] Serving static from cache:", request.url);
      return cachedResponse;
    }

    // Return offline page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - We Can Academy</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
              text-align: center;
              padding: 20px;
            }
            .offline-message {
              max-width: 400px;
            }
            h1 {
              color: #333;
              font-size: 24px;
              margin-bottom: 16px;
            }
            p {
              color: #666;
              line-height: 1.6;
            }
            .icon {
              font-size: 48px;
              margin-bottom: 16px;
            }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="icon">📡</div>
            <h1>You're Offline</h1>
            <p>This page isn't available offline. Please check your internet connection and try again.</p>
            <p>Scanning operations will be queued and synced when you're back online.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}

// Background sync for queued operations
self.addEventListener("sync", (event) => {
  console.log("[ServiceWorker] Background sync:", event.tag);

  if (event.tag === "sync-offline-queue") {
    event.waitUntil(notifyClientsToSync());
  }
});

/**
 * Notify all clients to trigger sync
 */
async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => {
    client.postMessage({
      type: "SYNC_REQUIRED",
      timestamp: Date.now(),
    });
  });
}

// Listen for messages from clients
self.addEventListener("message", (event) => {
  console.log("[ServiceWorker] Message received:", event.data);

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
