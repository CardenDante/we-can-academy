"use client";

/**
 * React Hook for Offline Support
 * Provides optimistic UI updates and offline queue management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  queueCheckIn,
  queueAttendance,
  getPendingCounts,
  getCachedStudent,
  cacheStudent,
  type PendingCheckIn,
  type PendingAttendance,
  type CachedStudent,
} from "./indexed-db";
import {
  initSyncManager,
  startPeriodicSync,
  runSync,
  onSyncEvent,
  isOnline as checkOnline,
  isSyncing,
  setSyncAuthToken,
} from "./sync-manager";

type OfflineStatus = {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCheckIns: number;
  pendingAttendance: number;
};

type SyncProgress = {
  synced: number;
  failed: number;
};

/**
 * Hook for managing offline status and sync
 */
export function useOfflineStatus() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    pendingCheckIns: 0,
    pendingAttendance: 0,
  });

  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  // Update pending counts
  const refreshPendingCounts = useCallback(async () => {
    try {
      const counts = await getPendingCounts();
      setStatus((prev) => ({
        ...prev,
        pendingCheckIns: counts.checkIns,
        pendingAttendance: counts.attendance,
      }));
    } catch (error) {
      console.error("Failed to get pending counts:", error);
    }
  }, []);

  // Initialize sync manager
  useEffect(() => {
    const cleanupSync = initSyncManager();
    const cleanupInterval = startPeriodicSync(60000); // Sync every minute

    // Listen for sync events
    const cleanupEvents = onSyncEvent((event) => {
      switch (event.type) {
        case "start":
          setStatus((prev) => ({ ...prev, isSyncing: true }));
          if (event.pending) {
            setStatus((prev) => ({
              ...prev,
              pendingCheckIns: event.pending!.checkIns,
              pendingAttendance: event.pending!.attendance,
            }));
          }
          break;
        case "progress":
          setSyncProgress({
            synced: event.synced || 0,
            failed: event.failed || 0,
          });
          break;
        case "complete":
          setStatus((prev) => ({ ...prev, isSyncing: false }));
          setSyncProgress(null);
          refreshPendingCounts();
          break;
        case "error":
          setStatus((prev) => ({ ...prev, isSyncing: false }));
          setSyncProgress(null);
          break;
      }
    });

    // Online/offline listeners
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial count refresh
    refreshPendingCounts();

    return () => {
      cleanupSync();
      cleanupInterval();
      cleanupEvents();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshPendingCounts]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!status.isOnline || status.isSyncing) return;
    await runSync();
  }, [status.isOnline, status.isSyncing]);

  return {
    ...status,
    syncProgress,
    triggerSync,
    refreshPendingCounts,
  };
}

/**
 * Hook for optimistic check-in operations
 */
export function useOptimisticCheckIn() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    isOffline?: boolean;
    student?: CachedStudent;
  } | null>(null);

  const checkIn = useCallback(
    async (
      admissionNumber: string,
      onlineCheckIn?: (admissionNumber: string) => Promise<{
        success: boolean;
        error?: string;
        student?: {
          id: string;
          fullName: string;
          courseId: string;
          course?: { name: string };
          isExpelled: boolean;
        };
      }>
    ) => {
      setIsProcessing(true);
      setLastResult(null);

      try {
        // If online and have a callback, try online first
        if (checkOnline() && onlineCheckIn) {
          const result = await onlineCheckIn(admissionNumber);

          if (result.success && result.student) {
            // Cache the student for offline use
            await cacheStudent({
              id: result.student.id,
              admissionNumber,
              fullName: result.student.fullName,
              courseId: result.student.courseId,
              courseName: result.student.course?.name || "",
              isExpelled: result.student.isExpelled,
              cachedAt: new Date().toISOString(),
            });
          }

          setLastResult({
            success: result.success,
            message: result.error || "Check-in successful",
            isOffline: false,
          });

          return result;
        }

        // Offline mode - queue for later sync
        const cachedStudent = await getCachedStudent(admissionNumber);

        // Check if student is expelled (from cache)
        if (cachedStudent?.isExpelled) {
          setLastResult({
            success: false,
            message: `${cachedStudent.fullName} has been expelled`,
            isOffline: true,
            student: cachedStudent,
          });
          return { success: false, error: "Student is expelled" };
        }

        // Queue the check-in
        await queueCheckIn(admissionNumber);

        setLastResult({
          success: true,
          message: cachedStudent
            ? `${cachedStudent.fullName} queued for sync`
            : `Check-in queued for sync`,
          isOffline: true,
          student: cachedStudent,
        });

        return {
          success: true,
          queued: true,
          student: cachedStudent,
        };
      } catch (error) {
        setLastResult({
          success: false,
          message: error instanceof Error ? error.message : "Check-in failed",
          isOffline: !checkOnline(),
        });
        return { success: false, error: String(error) };
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return {
    checkIn,
    isProcessing,
    lastResult,
    clearResult: () => setLastResult(null),
  };
}

/**
 * Hook for optimistic attendance operations
 */
export function useOptimisticAttendance() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    isOffline?: boolean;
  } | null>(null);

  const markAttendance = useCallback(
    async (
      studentId: string,
      sessionId: string,
      studentInfo?: { admissionNumber?: string; fullName?: string },
      onlineMarkAttendance?: (
        studentId: string,
        sessionId: string
      ) => Promise<{ success: boolean; error?: string }>
    ) => {
      setIsProcessing(true);
      setLastResult(null);

      try {
        // If online and have a callback, try online first
        if (checkOnline() && onlineMarkAttendance) {
          const result = await onlineMarkAttendance(studentId, sessionId);

          setLastResult({
            success: result.success,
            message: result.error || "Attendance marked",
            isOffline: false,
          });

          return result;
        }

        // Offline mode - queue for later sync
        await queueAttendance(studentId, sessionId, studentInfo);

        setLastResult({
          success: true,
          message: studentInfo?.fullName
            ? `${studentInfo.fullName} attendance queued`
            : "Attendance queued for sync",
          isOffline: true,
        });

        return { success: true, queued: true };
      } catch (error) {
        setLastResult({
          success: false,
          message: error instanceof Error ? error.message : "Failed to mark attendance",
          isOffline: !checkOnline(),
        });
        return { success: false, error: String(error) };
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return {
    markAttendance,
    isProcessing,
    lastResult,
    clearResult: () => setLastResult(null),
  };
}

/**
 * Hook for setting auth token (call once when user logs in)
 */
export function useSetSyncAuth(token: string | null) {
  useEffect(() => {
    if (token) {
      setSyncAuthToken(token);
    }
  }, [token]);
}

/**
 * Export for index file
 */
export { isOnline as checkIsOnline } from "./sync-manager";
