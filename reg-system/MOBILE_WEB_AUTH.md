# Mobile-to-Web Authentication Flow

## Overview
This implementation allows mobile app users to seamlessly access web pages by converting their mobile JWT token into a web session, eliminating the need to login again.

## Architecture

### Components

1. **Mobile App** (`/home/chacha/Documents/Wecan-Attendance-App/`)
   - Uses JWT tokens stored in secure storage
   - Exchanges token for one-time code via API
   - Opens browser with signin URL

2. **Token Exchange API** (`/api/mobile/web-auth`)
   - Verifies mobile JWT token
   - Generates one-time code (64-character hex)
   - Stores code in Redis with 2-minute TTL
   - Returns signin URL to mobile app

3. **Mobile Signin Page** (`/mobile-signin`)
   - Server-side page that consumes one-time code
   - Creates NextAuth session cookie
   - Redirects to target page (e.g., student detail)

4. **Redis Storage** (`lib/redis.ts`)
   - Stores temporary one-time codes
   - Automatic expiration after 2 minutes
   - One-time use (deleted after consumption)

## Authentication Flow

```
┌─────────────┐                                    ┌──────────────┐
│  Mobile App │                                    │  Web Backend │
└──────┬──────┘                                    └──────┬───────┘
       │                                                  │
       │ 1. User taps "View Full Attendance Passport"    │
       │                                                  │
       │ 2. GET /api/mobile/web-auth?                    │
       │    token=<JWT>&redirect=/teacher/students/123   │
       ├─────────────────────────────────────────────────>│
       │                                                  │
       │                                    3. Verify JWT │
       │                              4. Generate code XYZ│
       │                     5. Store in Redis (2min TTL)│
       │                                                  │
       │ 6. Response: { signinUrl: "/mobile-signin?code=XYZ" }
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │ 7. Open browser: /mobile-signin?code=XYZ        │
       ├─────────────────────────────────────────────────>│
       │                                                  │
       │                           8. Get code from Redis │
       │                                 9. Delete code   │
       │                         10. Get user from DB     │
       │              11. Create NextAuth session cookie  │
       │                                                  │
       │ 12. Redirect to /teacher/students/123           │
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │ 13. User sees student page (authenticated)      │
       │                                                  │
```

## Security Features

### Token Security
- **Mobile JWT**: 30-day expiration, signed with `NEXTAUTH_SECRET`
- **One-time code**: 64 random hex characters (256-bit entropy)
- **Redis TTL**: 2-minute automatic expiration
- **One-time use**: Code deleted immediately after consumption

### Session Security
- **HTTP-only cookies**: Not accessible via JavaScript
- **Secure flag**: Enabled in production (HTTPS only)
- **SameSite: lax**: CSRF protection
- **30-day expiration**: Matches mobile token lifetime

### Attack Mitigation
1. **Replay attacks**: One-time code deleted after use
2. **Token theft**: Short 2-minute window for code usage
3. **CSRF**: SameSite cookie policy
4. **XSS**: HTTP-only cookies prevent JavaScript access
5. **Session hijacking**: Secure flag in production

## Implementation Files

### Backend (Next.js)

1. **`/lib/redis.ts`** - Redis client and helper functions
   - `storeAuthCode(code, data)`: Store code with 2-minute TTL
   - `consumeAuthCode(code)`: Get and delete code

2. **`/app/api/mobile/web-auth/route.ts`** - Token exchange endpoint
   - Verifies mobile JWT token
   - Generates one-time code
   - Stores in Redis
   - Returns signin URL

3. **`/app/mobile-signin/page.tsx`** - Server-side signin page
   - Consumes one-time code from Redis
   - Creates NextAuth session cookie
   - Redirects to target URL

### Mobile App (Flutter)

1. **`/lib/screens/teacher/student_detail_screen.dart`**
   - Modified `_openWebAttendancePassport()` method
   - Gets JWT token from AuthService
   - Calls token exchange endpoint
   - Opens browser with signin URL

## Configuration

### Environment Variables
```bash
# Redis connection (already configured in docker-compose.yml)
REDIS_URL=redis://redis:6379

# NextAuth secret (used for both mobile JWT and session cookies)
NEXTAUTH_SECRET=your-secret-key-here

# NextAuth URL (web app base URL)
NEXTAUTH_URL=https://wecan.iyfkenya.org
```

### Dependencies

**Backend:**
- `ioredis`: Redis client for Node.js
- `jsonwebtoken`: JWT signing and verification
- `next-auth`: Session management

**Mobile:**
- `flutter_secure_storage`: Secure token storage
- `url_launcher`: Open URLs in external browser
- `dio`: HTTP client (already in use)

## Testing

### Manual Testing Steps

1. **Build and deploy backend:**
   ```bash
   cd /home/chacha/Documents/we-can-academy/reg-system
   npm install
   docker-compose up -d
   ```

2. **Rebuild mobile app:**
   ```bash
   cd /home/chacha/Documents/Wecan-Attendance-App
   flutter pub get
   flutter run
   ```

3. **Test flow:**
   - Login to mobile app as a teacher
   - Navigate to a student's detail page
   - Tap "View Full Attendance Passport" button
   - Browser should open and show the student page
   - Verify no login prompt appears
   - Verify student data loads correctly

### Expected Behavior

✅ **Success:**
- Browser opens automatically
- Student attendance passport page loads immediately
- No login page displayed
- All student data visible

❌ **Failure scenarios:**
- "Authentication token not found": User needs to login again
- "Invalid or expired token": Mobile JWT expired (shouldn't happen within 30 days)
- "Invalid or expired code": Code expired (2-minute window exceeded)
- "Could not open web page": URL launcher issue

## Troubleshooting

### Issue: "Invalid or expired code"
**Cause:** Code expired before browser opened (2-minute window)
**Solution:** Increase TTL in `lib/redis.ts` if needed, or investigate delay

### Issue: "Authentication token not found"
**Cause:** Mobile app lost JWT token (logout, storage cleared)
**Solution:** User needs to login again in mobile app

### Issue: Browser opens but shows login page
**Cause:** Session cookie not being set correctly
**Solution:**
- Check cookie name matches NextAuth convention
- Verify `NEXTAUTH_SECRET` is the same in all environments
- Check browser allows cookies from the domain

### Issue: Redis connection error
**Cause:** Redis not running or wrong connection URL
**Solution:**
- Verify Redis is running: `docker ps | grep redis`
- Check `REDIS_URL` environment variable
- Check Redis logs: `docker logs wecanacademy-redis-dev`

## Future Enhancements

1. **Analytics**: Track mobile-to-web transitions
2. **Session sync**: Sync mobile and web session expiration
3. **Deeplinks**: Direct links to specific sections (attendance, check-ins, etc.)
4. **Offline handling**: Queue web page opens for when back online
5. **In-app browser**: Use WebView instead of external browser for seamless UX

## Maintenance

### Redis Cleanup
Redis automatically handles code expiration via TTL. No manual cleanup needed.

### Monitoring
Monitor these metrics:
- Code generation rate (should match button taps)
- Code consumption rate (should match successful browser opens)
- Expired codes (high rate indicates UX issue - codes expiring before use)
- Failed verifications (potential security issue if abnormally high)

### Scaling
Current implementation supports:
- **Throughput**: Thousands of simultaneous auths (Redis is very fast)
- **Storage**: Minimal - codes expire after 2 minutes
- **Memory**: ~100 bytes per code, max ~1000 concurrent codes = 100KB

For higher scale:
- Use Redis Cluster for redundancy
- Add rate limiting to prevent abuse
- Consider separating Redis instance for auth codes
