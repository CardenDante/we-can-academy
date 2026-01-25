import Redis from "ioredis";

// Redis client singleton for one-time authentication codes
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: false,
      enableReadyCheck: true,
    });

    redisClient.on("error", (err) => {
      console.error("Redis error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis connected successfully");
    });
  }

  return redisClient;
}

/**
 * Store one-time authentication code in Redis
 * Expires after 2 minutes
 */
export async function storeAuthCode(
  code: string,
  data: { userId: string; redirect: string }
): Promise<void> {
  const redis = getRedisClient();
  const key = `auth:code:${code}`;
  const value = JSON.stringify(data);

  // Store with 2-minute expiration
  await redis.setex(key, 120, value);
}

/**
 * Retrieve and delete one-time authentication code from Redis
 * Returns null if code doesn't exist or is expired
 */
export async function consumeAuthCode(
  code: string
): Promise<{ userId: string; redirect: string } | null> {
  const redis = getRedisClient();
  const key = `auth:code:${code}`;

  // Get the value
  const value = await redis.get(key);

  if (!value) {
    return null;
  }

  // Delete the code (one-time use)
  await redis.del(key);

  // Parse and return the data
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error("Error parsing auth code data:", error);
    return null;
  }
}

/**
 * Cleanup function (optional - Redis TTL handles this automatically)
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
