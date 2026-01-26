"use client";

import { useOfflineStatus } from "@/lib/offline";
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

/**
 * Offline Status Indicator
 * Shows connection status and pending sync count
 * Allows manual sync trigger
 */
export function OfflineStatusIndicator() {
  const {
    isOnline,
    isSyncing,
    pendingCheckIns,
    pendingAttendance,
    syncProgress,
    triggerSync,
  } = useOfflineStatus();

  const [showDetails, setShowDetails] = useState(false);
  const totalPending = pendingCheckIns + pendingAttendance;
  const hasPending = totalPending > 0;

  // Don't show if online and no pending items
  if (isOnline && !hasPending && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Details popup */}
      {showDetails && (
        <div className="bg-white dark:bg-gray-800 border rounded-lg shadow-xl p-4 max-w-xs animate-in slide-in-from-bottom-2">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold">
              {isOnline ? "Online" : "Offline Mode"}
            </h4>
            <button
              onClick={() => setShowDetails(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {hasPending && (
            <div className="text-sm space-y-1 mb-3">
              <p className="font-medium">Pending operations:</p>
              {pendingCheckIns > 0 && (
                <p className="text-muted-foreground">• {pendingCheckIns} check-ins</p>
              )}
              {pendingAttendance > 0 && (
                <p className="text-muted-foreground">
                  • {pendingAttendance} attendance records
                </p>
              )}
            </div>
          )}

          {!isOnline && (
            <p className="text-sm text-muted-foreground">
              Operations will sync automatically when connection is restored
            </p>
          )}

          {isOnline && hasPending && !isSyncing && (
            <p className="text-sm italic text-muted-foreground mb-2">
              Click the badge or button to sync now
            </p>
          )}
        </div>
      )}

      {/* Sync progress */}
      {syncProgress && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">
            Syncing... {syncProgress.synced} synced
            {syncProgress.failed > 0 && `, ${syncProgress.failed} failed`}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Main status indicator */}
        <div
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg cursor-pointer transition-all
            ${
              isOnline
                ? hasPending
                  ? "bg-yellow-500 text-white hover:bg-yellow-600"
                  : "bg-green-500 text-white hover:bg-green-600"
                : "bg-red-500 text-white hover:bg-red-600"
            }
          `}
          onClick={() => {
            if (isOnline && hasPending && !isSyncing) {
              triggerSync();
            } else {
              setShowDetails(!showDetails);
            }
          }}
          title={isOnline ? (hasPending ? "Click to sync" : "System online") : "Offline mode"}
        >
          {/* Connection icon */}
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}

          {/* Status text */}
          <span className="text-sm font-medium">
            {isOnline ? (
              hasPending ? (
                <>
                  {totalPending} pending
                  {isSyncing && " (syncing...)"}
                </>
              ) : (
                "Online"
              )
            ) : (
              <>Offline{hasPending && ` (${totalPending} queued)`}</>
            )}
          </span>

          {/* Status icon */}
          {hasPending && !isSyncing && isOnline && (
            <AlertCircle className="h-4 w-4" />
          )}
          {!hasPending && !isSyncing && isOnline && (
            <CheckCircle className="h-4 w-4" />
          )}
          {isSyncing && <RefreshCw className="h-4 w-4 animate-spin" />}
        </div>

        {/* Manual sync button (only show when online with pending items) */}
        {isOnline && hasPending && !isSyncing && (
          <Button
            size="sm"
            variant="secondary"
            onClick={triggerSync}
            className="shadow-lg"
            title="Manually trigger sync of pending operations"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Now
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact version for header/toolbar
 */
export function OfflineStatusBadge() {
  const { isOnline, pendingCheckIns, pendingAttendance } = useOfflineStatus();
  const totalPending = pendingCheckIns + pendingAttendance;

  if (isOnline && totalPending === 0) {
    return null;
  }

  return (
    <div
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium cursor-help
        ${
          isOnline
            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        }
      `}
      title={`${isOnline ? "Online" : "Offline"}${totalPending > 0 ? ` - ${totalPending} pending operations` : ""}`}
    >
      {isOnline ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      {totalPending > 0 && <span>{totalPending}</span>}
    </div>
  );
}
