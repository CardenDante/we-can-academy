"use client";

import { useEffect } from "react";
import { initServiceWorker } from "@/lib/offline/sw-register";
import { OfflineStatusIndicator } from "@/components/offline-status";

/**
 * Offline Provider Component
 * Initializes service worker and displays offline status
 * Add this to your root layout
 */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker on mount
    initServiceWorker().catch((error) => {
      console.error("[OfflineProvider] Service Worker registration failed:", error);
    });
  }, []);

  return (
    <>
      {children}
      <OfflineStatusIndicator />
    </>
  );
}
