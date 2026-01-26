import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "./redis";

type RateLimitConfig = {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Identifier for this rate limit (e.g., "checkin", "attendance") */
  identifier: string;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
  error?: NextResponse;
};

const RATE_LIMIT_PREFIX = "ratelimit:";

/**
 * Check rate limit for a request
 * Uses Redis sliding window counter
 */
export async function checkRateLimit(
  request: NextRequest,
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, windowSeconds, identifier } = config;
  const key = `${RATE_LIMIT_PREFIX}${identifier}:${userId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  try {
    const redis = getRedisClient();

    // Use Redis transaction for atomic operations
    const multi = redis.multi();

    // Remove old entries outside the window
    multi.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    multi.zcard(key);

    // Add current request
    multi.zadd(key, now, `${now}:${Math.random()}`);

    // Set expiry on the key
    multi.expire(key, windowSeconds);

    const results = await multi.exec();

    if (!results) {
      // Redis transaction failed, allow request (fail open)
      return { success: true, remaining: limit, reset: now + windowSeconds };
    }

    const currentCount = (results[1]?.[1] as number) || 0;

    if (currentCount >= limit) {
      // Rate limit exceeded
      const response = NextResponse.json(
        {
          error: "Too many requests. Please slow down.",
          retryAfter: windowSeconds,
        },
        { status: 429 }
      );

      response.headers.set("X-RateLimit-Limit", limit.toString());
      response.headers.set("X-RateLimit-Remaining", "0");
      response.headers.set("X-RateLimit-Reset", (now + windowSeconds).toString());
      response.headers.set("Retry-After", windowSeconds.toString());

      return {
        success: false,
        remaining: 0,
        reset: now + windowSeconds,
        error: response,
      };
    }

    return {
      success: true,
      remaining: Math.max(0, limit - currentCount - 1),
      reset: now + windowSeconds,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Fail open - allow request if Redis is unavailable
    return { success: true, remaining: limit, reset: now + windowSeconds };
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  reset: number
): NextResponse {
  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", reset.toString());
  return response;
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Scanning operations - allow rapid fire for scanning
  scan: {
    limit: 120, // 120 requests per minute (2 per second)
    windowSeconds: 60,
    identifier: "scan",
  },
  // Batch operations - less frequent
  batch: {
    limit: 10, // 10 batch requests per minute
    windowSeconds: 60,
    identifier: "batch",
  },
  // General API calls
  general: {
    limit: 60, // 60 requests per minute
    windowSeconds: 60,
    identifier: "general",
  },
  // Stats/heavy queries
  stats: {
    limit: 20, // 20 stats requests per minute
    windowSeconds: 60,
    identifier: "stats",
  },
} as const;

/**
 * Rate limit middleware helper
 * Returns null if allowed, or error response if rate limited
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  userId: string,
  configKey: keyof typeof RATE_LIMITS
): Promise<NextResponse | null> {
  const config = RATE_LIMITS[configKey];
  const result = await checkRateLimit(request, userId, config);

  if (!result.success) {
    return result.error!;
  }

  return null;
}
