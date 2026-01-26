"use client";

/**
 * Service Worker Registration Utility
 * Registers and manages the service worker lifecycle
 */

let registration: ServiceWorkerRegistration | null = null;

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("[SW] Service Workers not supported");
    return null;
  }

  try {
    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[SW] Registered successfully:", registration.scope);

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration!.installing;
      console.log("[SW] New worker found");

      newWorker?.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          console.log("[SW] New version available");
          // Notify user about update
          notifyUpdate();
        }
      });
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data.type === "SYNC_REQUIRED") {
        console.log("[SW] Sync required notification received");
        // Trigger sync in the app
        window.dispatchEvent(new CustomEvent("offline-sync-required"));
      }
    });

    return registration;
  } catch (error) {
    console.error("[SW] Registration failed:", error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!registration) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }
    return true;
  }

  return await registration.unregister();
}

/**
 * Update the service worker
 */
export async function updateServiceWorker(): Promise<void> {
  if (registration) {
    await registration.update();
  }
}

/**
 * Skip waiting and activate new service worker
 */
export function activateNewServiceWorker(): void {
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }
}

/**
 * Clear all caches
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if (registration && registration.active) {
    registration.active.postMessage({ type: "CLEAR_CACHE" });
  }

  // Also clear using Cache API directly
  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith("wecan-"))
        .map((name) => caches.delete(name))
    );
  }
}

/**
 * Check if service worker is active
 */
export function isServiceWorkerActive(): boolean {
  return Boolean(
    typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      navigator.serviceWorker.controller
  );
}

/**
 * Register for background sync (if supported)
 */
export async function registerBackgroundSync(tag = "sync-offline-queue"): Promise<boolean> {
  if (!registration || !("sync" in registration)) {
    console.log("[SW] Background Sync not supported");
    return false;
  }

  try {
    await (registration as any).sync.register(tag);
    console.log("[SW] Background sync registered:", tag);
    return true;
  } catch (error) {
    console.error("[SW] Background sync registration failed:", error);
    return false;
  }
}

/**
 * Notify user about service worker update
 */
function notifyUpdate(): void {
  // Dispatch custom event for app to handle
  window.dispatchEvent(
    new CustomEvent("service-worker-update", {
      detail: { hasUpdate: true },
    })
  );
}

/**
 * Initialize service worker with default settings
 */
export async function initServiceWorker(): Promise<void> {
  await registerServiceWorker();

  // Check for updates every 30 minutes
  setInterval(() => {
    updateServiceWorker();
  }, 30 * 60 * 1000);
}
