# Offline Support for We Can Academy

Complete offline support implementation for scanning operations (check-ins and attendance marking).

## Features

- ✅ **Offline Queue**: Operations are queued locally using IndexedDB when offline
- ✅ **Auto-Sync**: Automatically syncs when connection is restored
- ✅ **Optimistic UI**: Instant feedback for users, even offline
- ✅ **Background Sync**: Uses Service Worker background sync API
- ✅ **Cached Data**: Student and session data cached for offline lookups
- ✅ **Rate Limiting**: Server-side rate limiting to prevent abuse
- ✅ **HTTP Caching**: Response caching for faster loads on slow connections

## Quick Start

### 1. Register Service Worker

In your root layout or main app component:

```tsx
"use client";

import { useEffect } from "react";
import { initServiceWorker } from "@/lib/offline/sw-register";

export function AppLayout({ children }) {
  useEffect(() => {
    // Register service worker
    initServiceWorker();
  }, []);

  return <>{children}</>;
}
```

### 2. Add Offline Status Indicator

```tsx
import { OfflineStatusIndicator } from "@/components/offline-status";

export function Layout() {
  return (
    <div>
      {/* Your content */}
      <OfflineStatusIndicator />
    </div>
  );
}
```

### 3. Use Offline Hooks in Scanning Components

#### For Check-In (Gate/Security):

```tsx
"use client";

import { useOptimisticCheckIn } from "@/lib/offline";

export function CheckInScanner() {
  const { checkIn, isProcessing, lastResult } = useOptimisticCheckIn();

  const handleScan = async (admissionNumber: string) => {
    await checkIn(
      admissionNumber,
      // Optional online function
      async (admNum) => {
        const response = await fetch("/api/mobile/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admissionNumber: admNum }),
        });

        const data = await response.json();
        return {
          success: response.ok,
          error: data.error,
          student: data.student,
        };
      }
    );
  };

  return (
    <div>
      <Scanner onScan={handleScan} />
      {isProcessing && <p>Processing...</p>}
      {lastResult && (
        <div className={lastResult.success ? "success" : "error"}>
          {lastResult.message}
          {lastResult.isOffline && " (queued for sync)"}
        </div>
      )}
    </div>
  );
}
```

#### For Attendance Marking:

```tsx
"use client";

import { useOptimisticAttendance } from "@/lib/offline";

export function AttendanceScanner({ sessionId }: { sessionId: string }) {
  const { markAttendance, isProcessing, lastResult } = useOptimisticAttendance();

  const handleScan = async (studentId: string, studentInfo: any) => {
    await markAttendance(
      studentId,
      sessionId,
      studentInfo,
      // Optional online function
      async (studId, sessId) => {
        const response = await fetch("/api/mobile/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: studId, sessionId: sessId }),
        });

        const data = await response.json();
        return { success: response.ok, error: data.error };
      }
    );
  };

  return (
    <div>
      <Scanner onScan={handleScan} />
      {lastResult?.isOffline && (
        <div className="warning">
          Offline mode - will sync when online
        </div>
      )}
    </div>
  );
}
```

### 4. Monitor Sync Status

```tsx
"use client";

import { useOfflineStatus } from "@/lib/offline";

export function SyncStatusDisplay() {
  const {
    isOnline,
    isSyncing,
    pendingCheckIns,
    pendingAttendance,
    syncProgress,
    triggerSync,
  } = useOfflineStatus();

  return (
    <div>
      <p>Status: {isOnline ? "Online" : "Offline"}</p>
      <p>Pending Check-ins: {pendingCheckIns}</p>
      <p>Pending Attendance: {pendingAttendance}</p>

      {isSyncing && syncProgress && (
        <p>
          Syncing... {syncProgress.synced} synced, {syncProgress.failed} failed
        </p>
      )}

      {isOnline && !isSyncing && (pendingCheckIns + pendingAttendance) > 0 && (
        <button onClick={triggerSync}>Sync Now</button>
      )}
    </div>
  );
}
```

## Architecture

```
┌─────────────────────────────────────────┐
│         React Components                 │
│   (with Offline Hooks)                   │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
Online Mode      Offline Mode
    │                 │
    ▼                 ▼
API Routes      IndexedDB Queue
    │                 │
    └────────┬────────┘
             │
      Sync Manager
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
Batch Sync      Service Worker
  (API)         (Background Sync)
```

## API Endpoints

### Optimized Batch Endpoints (for offline sync):

- `POST /api/mobile/checkin/batch` - Sync 100 check-ins
- `POST /api/mobile/attendance/batch` - Sync 100 attendance records
- `POST /api/mobile/chapel/attendance/batch` - Sync chapel attendance

All batch endpoints:
- Accept array of operations with `localId` for tracking
- Return detailed results per operation
- Handle duplicates gracefully (idempotent)
- Use optimized bulk queries (~5 queries for 100 items)
- Rate limited: 10 requests/minute

### Single Operation Endpoints (for online mode):

- `POST /api/mobile/checkin` - Single check-in
- `POST /api/mobile/attendance` - Single attendance
- `POST /api/mobile/chapel/attendance` - Single chapel attendance

All single endpoints:
- Rate limited: 120 requests/minute (scan profile)
- Use parallel queries and upserts
- Cached responses (30s for GET)

## IndexedDB Stores

```typescript
STORES = {
  PENDING_CHECKINS: "pending-checkins",      // Queued check-ins
  PENDING_ATTENDANCE: "pending-attendance",  // Queued attendance
  CACHED_STUDENTS: "cached-students",        // Student cache
  CACHED_SESSIONS: "cached-sessions",        // Session cache
  SYNC_STATUS: "sync-status",                // Sync metadata
}
```

## Service Worker Caching Strategy

- **API Routes**: Network first, cache fallback
- **Static Assets**: Network first, cache fallback
- **Images**: Cache first, network fallback
- **Offline Page**: Custom offline page for unavailable routes

## Configuration

### Rate Limits

Defined in `/lib/rate-limit.ts`:

```typescript
RATE_LIMITS = {
  scan: { limit: 120, windowSeconds: 60 },    // 2 scans/sec
  batch: { limit: 10, windowSeconds: 60 },    // 10 batches/min
  general: { limit: 60, windowSeconds: 60 },
  stats: { limit: 20, windowSeconds: 60 },
}
```

### Cache Durations

Defined in `/lib/api-cache.ts`:

```typescript
// List data (frequently changing)
maxAge: 30 seconds
staleWhileRevalidate: 120 seconds

// Static data (rarely changing)
maxAge: 300 seconds (5 min)
staleWhileRevalidate: 600 seconds (10 min)
```

## Testing Offline Mode

### Chrome DevTools:

1. Open DevTools (F12)
2. Go to Network tab
3. Change "No throttling" to "Offline"
4. Try scanning - operations should queue
5. Change back to "Online"
6. Operations should sync automatically

### Service Worker:

1. Open DevTools → Application → Service Workers
2. Check "Offline" checkbox
3. Verify offline page appears for uncached routes
4. Uncheck "Offline"
5. Verify sync happens automatically

## Troubleshooting

### Operations Not Syncing

1. Check browser console for errors
2. Verify service worker is registered (DevTools → Application)
3. Check IndexedDB (DevTools → Application → Storage)
4. Verify rate limits not exceeded (check response headers)

### Cache Issues

Clear all caches:

```typescript
import { clearServiceWorkerCache } from "@/lib/offline/sw-register";

await clearServiceWorkerCache();
```

### Sync Conflicts

Batch endpoints handle duplicates gracefully:
- Duplicate check-ins return `{ success: true, duplicate: true }`
- Duplicate attendance returns same
- No data loss occurs

## Performance Metrics

| Operation | Before | After |
|-----------|--------|-------|
| Batch check-in (100 items) | ~300 queries | ~5 queries |
| Batch attendance (100 items) | ~500 queries | ~8 queries |
| Single scan response time | 500-2000ms | <100ms (cached) |
| Offline scan | Not possible | Instant |

## Browser Support

- ✅ Chrome/Edge 80+
- ✅ Firefox 78+
- ✅ Safari 14+
- ✅ Mobile Chrome/Safari
- ❌ IE11 (not supported)

## Security

- All API routes protected with JWT authentication
- Rate limiting prevents abuse
- HTTPS required for Service Workers
- IndexedDB data isolated per origin
- No sensitive data cached (only IDs and names)

## Further Reading

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
