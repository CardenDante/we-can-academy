# Offline Support Guide

## Overview
The We Can Academy system includes offline support for attendance and check-in operations. This allows staff, teachers, and security to continue working even when internet connectivity is temporarily unavailable.

## How It Works

### First Visit (Must be Online)
⚠️ **IMPORTANT**: The offline functionality requires an initial online visit to cache the application.

1. **Visit the site while online** at least once on each page you want to use offline:
   - Security: `https://wecan.iyfkenya.org/security`
   - Staff: `https://wecan.iyfkenya.org/staff`
   - Teacher: `https://wecan.iyfkenya.org/teacher`

2. **The service worker will cache**:
   - HTML pages
   - JavaScript bundles
   - CSS files
   - API responses
   - Profile pictures

3. **After caching** (first visit complete), the pages will be available offline.

### Offline Mode Capabilities

When offline, you can:
- ✅ **Security**: Queue gate check-ins
- ✅ **Staff**: Queue chapel attendance
- ✅ **Teacher**: Queue class attendance
- ✅ View previously cached student data
- ✅ Continue scanning with barcode/NFC

### Automatic Sync

When connection is restored:
- Queued operations sync automatically every 60 seconds
- Manual sync available via the offline status indicator
- Failed operations are retried automatically
- Success/failure notifications displayed

## Testing Offline Mode

### Method 1: Disable Network in Browser DevTools
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Change "Online" dropdown to "Offline"
4. Test the functionality

### Method 2: Turn Off WiFi/Mobile Data
1. Ensure you've visited all needed pages while online first
2. Disable internet connection
3. Navigate to the app (it should load from cache)
4. Perform operations (they will be queued)
5. Re-enable internet to see sync happen

### Method 3: Airplane Mode
1. Visit all pages while online
2. Enable airplane mode
3. App should still work and queue operations

## Limitations

### DNS Resolution
If you try to access the site when:
- You've NEVER visited it before while online
- Browser cache was cleared completely
- Service worker was unregistered

You'll get: **"DNS_PROBE_POSSIBLE"** error

**Solution**: Visit the site at least once while online to initialize the cache.

### Expelled Students
- Offline check-ins still validate against cached expelled status
- If a student is expelled but not in cache, the check-in will be queued
- On sync, the server will reject if the student is expelled

### Session Validation
- Only active sessions visible when you went offline are available
- If new sessions are created while offline, you won't see them until back online

## Status Indicators

### Online Mode
- Green indicator: "Online - Changes sync immediately"
- Operations execute and validate in real-time

### Offline Mode
- Yellow indicator: "Offline - X items pending sync"
- Operations are queued to IndexedDB
- Student data served from cache when available

### Syncing Mode
- Blue indicator: "Syncing... X/Y complete"
- Shows progress of sync operation

## Developer Notes

### Service Worker Cache Strategy

1. **Static Assets** (HTML, CSS, JS)
   - Strategy: Network first, cache fallback
   - Cache: `wecan-v2-static` and `wecan-v2-runtime`

2. **API Requests**
   - Strategy: Network first, cache fallback for GET requests
   - Cache: `wecan-v2-api`

3. **Images**
   - Strategy: Cache first, network fallback
   - Cache: `wecan-v2-images`

### Clearing Cache

To clear all cached data:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});

caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

Then refresh the page.

### IndexedDB Queues

Queued operations are stored in IndexedDB databases:
- `wecan-offline` - Main database
- Stores: `checkIns`, `attendance`, `students`

## Troubleshooting

### "This site can't be reached" Error
**Cause**: Trying to access site offline without ever visiting while online.
**Fix**: Connect to internet, visit the page, then try offline again.

### Operations Not Syncing
**Cause**: Service worker not registered or network still offline.
**Fix**:
1. Check offline status indicator
2. Manually trigger sync with sync button
3. Check browser console for errors

### Old Data Being Shown
**Cause**: Cache not updated after new deployments.
**Fix**: Clear cache or hard refresh (Ctrl+Shift+R)

### Service Worker Not Updating
**Cause**: Old service worker still active.
**Fix**: Close all tabs of the site, reopen to activate new worker.

## Security Considerations

- Offline queues are stored locally on device
- Data is NOT encrypted in IndexedDB (browser security applies)
- Lost/stolen devices may expose queued operations
- Server validates all queued operations on sync
- Expelled students are rejected even if queued offline

## Browser Support

✅ **Fully Supported**:
- Chrome/Edge 90+
- Firefox 85+
- Safari 15.4+

⚠️ **Partial Support**:
- Safari 14.x (limited IndexedDB support)
- Mobile browsers (varies by OS version)

❌ **Not Supported**:
- Internet Explorer (any version)
- Chrome < 60
- Legacy browsers

## Production Deployment

1. **Enable HTTPS** - Service workers require HTTPS (or localhost)
2. **Configure cache headers** - Set appropriate cache-control headers
3. **Monitor sync failures** - Log failed syncs to server
4. **Test on target devices** - Especially mobile devices used in field

## Best Practices

1. ✅ Always visit pages while online before depending on offline mode
2. ✅ Sync frequently when online to minimize queue size
3. ✅ Monitor pending items counter
4. ✅ Clear cache after major updates
5. ❌ Don't assume offline mode works without testing
6. ❌ Don't queue hundreds of operations (performance impact)
7. ❌ Don't rely on offline mode for security-critical operations requiring immediate validation
