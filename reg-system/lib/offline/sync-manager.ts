/**
 * Sync Manager - Handles syncing offline queued operations
 * Monitors online/offline status and syncs when connection restored
 */

import {
  getPendingCheckIns,
  getPendingAttendance,
  updateCheckInStatus,
  updateAttendanceStatus,
  getPendingCounts,
  clearOldSyncedRecords,
  type PendingCheckIn,
  type PendingAttendance,
} from "./indexed-db";

type SyncResult = {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
};

type SyncEventCallback = (event: {
  type: "start" | "progress" | "complete" | "error";
  pending?: { checkIns: number; attendance: number };
  synced?: number;
  failed?: number;
  error?: string;
}) => void;

let syncInProgress = false;
let syncEventCallback: SyncEventCallback | null = null;
let authToken: string | null = null;

/**
 * Set the auth token for API calls
 */
export function setSyncAuthToken(token: string): void {
  authToken = token;
}

/**
 * Register a callback for sync events
 */
export function onSyncEvent(callback: SyncEventCallback): () => void {
  syncEventCallback = callback;
  return () => {
    syncEventCallback = null;
  };
}

/**
 * Emit sync event
 */
function emitSyncEvent(event: Parameters<SyncEventCallback>[0]): void {
  if (syncEventCallback) {
    syncEventCallback(event);
  }
}

/**
 * Check if we're online
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Sync all pending check-ins
 */
async function syncCheckIns(): Promise<SyncResult> {
  const pending = await getPendingCheckIns();

  if (pending.length === 0) {
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  // Mark all as syncing
  for (const checkIn of pending) {
    await updateCheckInStatus(checkIn.id, "syncing");
  }

  // Prepare batch request
  const checkInsPayload = pending.map((c) => ({
    admissionNumber: c.admissionNumber,
    checkedAt: c.checkedAt,
    localId: c.id,
  }));

  try {
    const response = await fetch("/api/mobile/checkin/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ checkIns: checkInsPayload }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Update statuses based on results
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const result of data.results || []) {
      if (result.success) {
        await updateCheckInStatus(result.localId, "synced", result.checkInId);
        synced++;
      } else {
        await updateCheckInStatus(result.localId, "failed", undefined, result.error);
        failed++;
        errors.push(`${result.localId}: ${result.error}`);
      }
    }

    return { success: true, synced, failed, errors };
  } catch (error) {
    // Mark all as pending again (will retry on next sync)
    for (const checkIn of pending) {
      await updateCheckInStatus(
        checkIn.id,
        "pending",
        undefined,
        error instanceof Error ? error.message : "Sync failed"
      );
    }

    return {
      success: false,
      synced: 0,
      failed: pending.length,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Sync all pending attendance records
 */
async function syncAttendance(): Promise<SyncResult> {
  const pending = await getPendingAttendance();

  if (pending.length === 0) {
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  // Mark all as syncing
  for (const attendance of pending) {
    await updateAttendanceStatus(attendance.id, "syncing");
  }

  // Prepare batch request
  const attendancePayload = pending.map((a) => ({
    studentId: a.studentId,
    sessionId: a.sessionId,
    markedAt: a.markedAt,
    localId: a.id,
  }));

  try {
    const response = await fetch("/api/mobile/attendance/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ attendances: attendancePayload }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Update statuses based on results
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const result of data.results || []) {
      if (result.success) {
        await updateAttendanceStatus(result.localId, "synced", result.attendanceId);
        synced++;
      } else {
        await updateAttendanceStatus(result.localId, "failed", undefined, result.error);
        failed++;
        errors.push(`${result.localId}: ${result.error}`);
      }
    }

    return { success: true, synced, failed, errors };
  } catch (error) {
    // Mark all as pending again
    for (const attendance of pending) {
      await updateAttendanceStatus(
        attendance.id,
        "pending",
        undefined,
        error instanceof Error ? error.message : "Sync failed"
      );
    }

    return {
      success: false,
      synced: 0,
      failed: pending.length,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Run full sync of all pending operations
 */
export async function runSync(): Promise<{
  checkIns: SyncResult;
  attendance: SyncResult;
}> {
  if (syncInProgress) {
    return {
      checkIns: { success: false, synced: 0, failed: 0, errors: ["Sync already in progress"] },
      attendance: { success: false, synced: 0, failed: 0, errors: ["Sync already in progress"] },
    };
  }

  if (!isOnline()) {
    return {
      checkIns: { success: false, synced: 0, failed: 0, errors: ["Offline"] },
      attendance: { success: false, synced: 0, failed: 0, errors: ["Offline"] },
    };
  }

  syncInProgress = true;

  try {
    const pending = await getPendingCounts();
    emitSyncEvent({ type: "start", pending });

    // Sync check-ins
    const checkInsResult = await syncCheckIns();
    emitSyncEvent({
      type: "progress",
      synced: checkInsResult.synced,
      failed: checkInsResult.failed,
    });

    // Sync attendance
    const attendanceResult = await syncAttendance();
    emitSyncEvent({
      type: "progress",
      synced: checkInsResult.synced + attendanceResult.synced,
      failed: checkInsResult.failed + attendanceResult.failed,
    });

    // Clean up old synced records
    await clearOldSyncedRecords(24);

    emitSyncEvent({
      type: "complete",
      synced: checkInsResult.synced + attendanceResult.synced,
      failed: checkInsResult.failed + attendanceResult.failed,
    });

    return {
      checkIns: checkInsResult,
      attendance: attendanceResult,
    };
  } catch (error) {
    emitSyncEvent({
      type: "error",
      error: error instanceof Error ? error.message : "Sync failed",
    });

    return {
      checkIns: { success: false, synced: 0, failed: 0, errors: [String(error)] },
      attendance: { success: false, synced: 0, failed: 0, errors: [String(error)] },
    };
  } finally {
    syncInProgress = false;
  }
}

/**
 * Check if sync is in progress
 */
export function isSyncing(): boolean {
  return syncInProgress;
}

/**
 * Initialize sync manager with online/offline listeners
 */
export function initSyncManager(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  // Sync when coming back online
  const handleOnline = () => {
    console.log("[SyncManager] Online - starting sync...");
    runSync();
  };

  // Log when going offline
  const handleOffline = () => {
    console.log("[SyncManager] Offline - queuing operations locally");
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Initial sync if online and there are pending items
  if (isOnline()) {
    getPendingCounts().then((counts) => {
      if (counts.checkIns > 0 || counts.attendance > 0) {
        console.log("[SyncManager] Found pending items, starting initial sync...");
        runSync();
      }
    });
  }

  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Periodic sync (call every N minutes)
 */
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startPeriodicSync(intervalMs = 60000): () => void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  syncInterval = setInterval(() => {
    if (isOnline() && !syncInProgress) {
      getPendingCounts().then((counts) => {
        if (counts.checkIns > 0 || counts.attendance > 0) {
          runSync();
        }
      });
    }
  }, intervalMs);

  return () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  };
}
