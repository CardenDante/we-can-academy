import { NextResponse } from "next/server";

type CacheOptions = {
  /** Cache duration in seconds */
  maxAge?: number;
  /** Stale-while-revalidate duration in seconds */
  staleWhileRevalidate?: number;
  /** Whether the response is private (user-specific) */
  isPrivate?: boolean;
  /** ETag value for conditional requests */
  etag?: string;
};

/**
 * Add cache headers to a NextResponse
 * Optimizes responses for slow connections by enabling browser/CDN caching
 */
export function withCacheHeaders<T>(
  data: T,
  options: CacheOptions = {}
): NextResponse<T> {
  const {
    maxAge = 60, // 1 minute default
    staleWhileRevalidate = 300, // 5 minutes stale-while-revalidate
    isPrivate = true, // Private by default for authenticated endpoints
    etag,
  } = options;

  const response = NextResponse.json(data);

  // Build Cache-Control header
  const cacheControl = [
    isPrivate ? "private" : "public",
    `max-age=${maxAge}`,
    `stale-while-revalidate=${staleWhileRevalidate}`,
  ].join(", ");

  response.headers.set("Cache-Control", cacheControl);

  // Add ETag if provided
  if (etag) {
    response.headers.set("ETag", `"${etag}"`);
  }

  // Add Vary header for proper caching with Authorization
  response.headers.set("Vary", "Authorization");

  return response;
}

/**
 * Create a cached response for list endpoints
 * Short cache for frequently changing data
 */
export function cachedListResponse<T>(data: T, options?: Partial<CacheOptions>): NextResponse<T> {
  return withCacheHeaders(data, {
    maxAge: 30, // 30 seconds for lists
    staleWhileRevalidate: 120, // 2 minutes stale
    isPrivate: true,
    ...options,
  });
}

/**
 * Create a cached response for static/slow-changing data
 * Longer cache for reference data
 */
export function cachedStaticResponse<T>(data: T, options?: Partial<CacheOptions>): NextResponse<T> {
  return withCacheHeaders(data, {
    maxAge: 300, // 5 minutes for static data
    staleWhileRevalidate: 600, // 10 minutes stale
    isPrivate: true,
    ...options,
  });
}

/**
 * Create a no-cache response for mutation results
 */
export function noCacheResponse<T>(data: T, status = 200): NextResponse<T> {
  const response = NextResponse.json(data, { status });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}

/**
 * Check if request has valid cached response (ETag matching)
 */
export function checkETagMatch(
  request: Request,
  currentETag: string
): boolean {
  const ifNoneMatch = request.headers.get("If-None-Match");
  return ifNoneMatch === `"${currentETag}"` || ifNoneMatch === currentETag;
}

/**
 * Return 304 Not Modified response
 */
export function notModifiedResponse(): NextResponse {
  return new NextResponse(null, {
    status: 304,
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    },
  });
}

/**
 * Generate simple ETag from data
 */
export function generateETag(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
