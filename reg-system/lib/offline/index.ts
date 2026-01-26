/**
 * Offline Support Utilities
 * Export all offline-related functionality
 */

// IndexedDB operations
export {
  openDatabase,
  queueCheckIn,
  queueAttendance,
  getPendingCheckIns,
  getPendingAttendance,
  getPendingCounts,
  updateCheckInStatus,
  updateAttendanceStatus,
  cacheStudent,
  getCachedStudent,
  clearOldSyncedRecords,
  STORES,
  type PendingCheckIn,
  type PendingAttendance,
  type CachedStudent,
  type CachedSession,
} from "./indexed-db";

// Sync manager
export {
  initSyncManager,
  startPeriodicSync,
  runSync,
  isOnline,
  isSyncing,
  onSyncEvent,
  setSyncAuthToken,
} from "./sync-manager";

// React hooks
export {
  useOfflineStatus,
  useOptimisticCheckIn,
  useOptimisticAttendance,
  useSetSyncAuth,
  checkIsOnline,
} from "./use-offline";
