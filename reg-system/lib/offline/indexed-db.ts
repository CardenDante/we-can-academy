/**
 * IndexedDB Storage for Offline Queue
 * Stores pending check-ins and attendance records when offline
 */

const DB_NAME = "wecan-offline";
const DB_VERSION = 1;

// Store names
export const STORES = {
  PENDING_CHECKINS: "pending-checkins",
  PENDING_ATTENDANCE: "pending-attendance",
  CACHED_STUDENTS: "cached-students",
  CACHED_SESSIONS: "cached-sessions",
  SYNC_STATUS: "sync-status",
} as const;

export type PendingCheckIn = {
  id: string; // Local UUID
  admissionNumber: string;
  checkedAt: string; // ISO string
  createdAt: string;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  errorMessage?: string;
  serverId?: string; // ID from server after sync
};

export type PendingAttendance = {
  id: string; // Local UUID
  studentId: string;
  sessionId: string;
  admissionNumber?: string; // For display purposes
  studentName?: string;
  markedAt: string; // ISO string
  createdAt: string;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  errorMessage?: string;
  serverId?: string;
};

export type CachedStudent = {
  id: string;
  admissionNumber: string;
  fullName: string;
  courseId: string;
  courseName: string;
  isExpelled: boolean;
  cachedAt: string;
};

export type CachedSession = {
  id: string;
  name: string;
  sessionType: "CLASS" | "CHAPEL";
  day: "SATURDAY" | "SUNDAY";
  weekendId: string;
  weekendName: string;
  cachedAt: string;
};

let dbInstance: IDBDatabase | null = null;

/**
 * Open or create the IndexedDB database
 */
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Pending check-ins store
      if (!db.objectStoreNames.contains(STORES.PENDING_CHECKINS)) {
        const checkInStore = db.createObjectStore(STORES.PENDING_CHECKINS, {
          keyPath: "id",
        });
        checkInStore.createIndex("admissionNumber", "admissionNumber", { unique: false });
        checkInStore.createIndex("syncStatus", "syncStatus", { unique: false });
        checkInStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Pending attendance store
      if (!db.objectStoreNames.contains(STORES.PENDING_ATTENDANCE)) {
        const attendanceStore = db.createObjectStore(STORES.PENDING_ATTENDANCE, {
          keyPath: "id",
        });
        attendanceStore.createIndex("studentId", "studentId", { unique: false });
        attendanceStore.createIndex("sessionId", "sessionId", { unique: false });
        attendanceStore.createIndex("syncStatus", "syncStatus", { unique: false });
        attendanceStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Cached students store
      if (!db.objectStoreNames.contains(STORES.CACHED_STUDENTS)) {
        const studentStore = db.createObjectStore(STORES.CACHED_STUDENTS, {
          keyPath: "id",
        });
        studentStore.createIndex("admissionNumber", "admissionNumber", { unique: true });
        studentStore.createIndex("cachedAt", "cachedAt", { unique: false });
      }

      // Cached sessions store
      if (!db.objectStoreNames.contains(STORES.CACHED_SESSIONS)) {
        const sessionStore = db.createObjectStore(STORES.CACHED_SESSIONS, {
          keyPath: "id",
        });
        sessionStore.createIndex("sessionType", "sessionType", { unique: false });
        sessionStore.createIndex("cachedAt", "cachedAt", { unique: false });
      }

      // Sync status store
      if (!db.objectStoreNames.contains(STORES.SYNC_STATUS)) {
        db.createObjectStore(STORES.SYNC_STATUS, { keyPath: "key" });
      }
    };
  });
}

/**
 * Generic add operation
 */
export async function addToStore<T>(
  storeName: string,
  data: T
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.add(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to add to ${storeName}`));
  });
}

/**
 * Generic put (upsert) operation
 */
export async function putToStore<T>(
  storeName: string,
  data: T
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to put to ${storeName}`));
  });
}

/**
 * Get by key
 */
export async function getFromStore<T>(
  storeName: string,
  key: string
): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Failed to get from ${storeName}`));
  });
}

/**
 * Get all from store
 */
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error(`Failed to get all from ${storeName}`));
  });
}

/**
 * Get by index
 */
export async function getByIndex<T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error(`Failed to get by index from ${storeName}`));
  });
}

/**
 * Delete by key
 */
export async function deleteFromStore(
  storeName: string,
  key: string
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to delete from ${storeName}`));
  });
}

/**
 * Clear all data from a store
 */
export async function clearStore(storeName: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
  });
}

/**
 * Count items in store
 */
export async function countInStore(storeName: string): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Failed to count in ${storeName}`));
  });
}

/**
 * Count items by index value
 */
export async function countByIndex(
  storeName: string,
  indexName: string,
  value: IDBValidKey
): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.count(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Failed to count by index in ${storeName}`));
  });
}

// ============================================
// Convenience functions for specific operations
// ============================================

/**
 * Add a pending check-in to the queue
 */
export async function queueCheckIn(
  admissionNumber: string
): Promise<PendingCheckIn> {
  const checkIn: PendingCheckIn = {
    id: crypto.randomUUID(),
    admissionNumber,
    checkedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
  };

  await addToStore(STORES.PENDING_CHECKINS, checkIn);
  return checkIn;
}

/**
 * Add a pending attendance to the queue
 */
export async function queueAttendance(
  studentId: string,
  sessionId: string,
  studentInfo?: { admissionNumber?: string; fullName?: string }
): Promise<PendingAttendance> {
  const attendance: PendingAttendance = {
    id: crypto.randomUUID(),
    studentId,
    sessionId,
    admissionNumber: studentInfo?.admissionNumber,
    studentName: studentInfo?.fullName,
    markedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
  };

  await addToStore(STORES.PENDING_ATTENDANCE, attendance);
  return attendance;
}

/**
 * Get all pending check-ins
 */
export async function getPendingCheckIns(): Promise<PendingCheckIn[]> {
  return getByIndex<PendingCheckIn>(
    STORES.PENDING_CHECKINS,
    "syncStatus",
    "pending"
  );
}

/**
 * Get all pending attendance records
 */
export async function getPendingAttendance(): Promise<PendingAttendance[]> {
  return getByIndex<PendingAttendance>(
    STORES.PENDING_ATTENDANCE,
    "syncStatus",
    "pending"
  );
}

/**
 * Update check-in status
 */
export async function updateCheckInStatus(
  id: string,
  status: PendingCheckIn["syncStatus"],
  serverId?: string,
  errorMessage?: string
): Promise<void> {
  const checkIn = await getFromStore<PendingCheckIn>(STORES.PENDING_CHECKINS, id);
  if (checkIn) {
    checkIn.syncStatus = status;
    if (serverId) checkIn.serverId = serverId;
    if (errorMessage) checkIn.errorMessage = errorMessage;
    await putToStore(STORES.PENDING_CHECKINS, checkIn);
  }
}

/**
 * Update attendance status
 */
export async function updateAttendanceStatus(
  id: string,
  status: PendingAttendance["syncStatus"],
  serverId?: string,
  errorMessage?: string
): Promise<void> {
  const attendance = await getFromStore<PendingAttendance>(
    STORES.PENDING_ATTENDANCE,
    id
  );
  if (attendance) {
    attendance.syncStatus = status;
    if (serverId) attendance.serverId = serverId;
    if (errorMessage) attendance.errorMessage = errorMessage;
    await putToStore(STORES.PENDING_ATTENDANCE, attendance);
  }
}

/**
 * Cache a student for offline lookup
 */
export async function cacheStudent(student: CachedStudent): Promise<void> {
  await putToStore(STORES.CACHED_STUDENTS, {
    ...student,
    cachedAt: new Date().toISOString(),
  });
}

/**
 * Get cached student by admission number
 */
export async function getCachedStudent(
  admissionNumber: string
): Promise<CachedStudent | undefined> {
  const results = await getByIndex<CachedStudent>(
    STORES.CACHED_STUDENTS,
    "admissionNumber",
    admissionNumber
  );
  return results[0];
}

/**
 * Clear synced records older than specified hours
 */
export async function clearOldSyncedRecords(hoursOld = 24): Promise<void> {
  const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000).toISOString();

  const allCheckIns = await getAllFromStore<PendingCheckIn>(STORES.PENDING_CHECKINS);
  const allAttendance = await getAllFromStore<PendingAttendance>(STORES.PENDING_ATTENDANCE);

  for (const checkIn of allCheckIns) {
    if (checkIn.syncStatus === "synced" && checkIn.createdAt < cutoff) {
      await deleteFromStore(STORES.PENDING_CHECKINS, checkIn.id);
    }
  }

  for (const attendance of allAttendance) {
    if (attendance.syncStatus === "synced" && attendance.createdAt < cutoff) {
      await deleteFromStore(STORES.PENDING_ATTENDANCE, attendance.id);
    }
  }
}

/**
 * Get pending counts for UI display
 */
export async function getPendingCounts(): Promise<{
  checkIns: number;
  attendance: number;
}> {
  const [checkIns, attendance] = await Promise.all([
    countByIndex(STORES.PENDING_CHECKINS, "syncStatus", "pending"),
    countByIndex(STORES.PENDING_ATTENDANCE, "syncStatus", "pending"),
  ]);

  return { checkIns, attendance };
}
