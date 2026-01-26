import { getRedisClient } from "./redis";
import { prisma } from "./prisma";

const TEACHER_CACHE_TTL = 300; // 5 minutes
const TEACHER_CACHE_PREFIX = "teacher:profile:";

export type CachedTeacherProfile = {
  id: string;
  userId: string;
  class: {
    id: string;
    name: string;
    courseId: string;
    course: {
      id: string;
      name: string;
    };
  } | null;
};

/**
 * Get teacher profile with Redis caching
 * Reduces database queries for frequently accessed teacher data
 *
 * @param userId - The user ID of the teacher
 * @returns Teacher profile or null if not found
 */
export async function getCachedTeacherProfile(
  userId: string
): Promise<CachedTeacherProfile | null> {
  const redis = getRedisClient();
  const cacheKey = `${TEACHER_CACHE_PREFIX}${userId}`;

  try {
    // Try to get from cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    // If Redis fails, continue to database
    console.error("Redis cache read error:", error);
  }

  // Fetch from database
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      class: {
        select: {
          id: true,
          name: true,
          courseId: true,
          course: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!teacher) {
    return null;
  }

  // Cache the result
  try {
    await redis.setex(cacheKey, TEACHER_CACHE_TTL, JSON.stringify(teacher));
  } catch (error) {
    // If Redis fails to write, just log and continue
    console.error("Redis cache write error:", error);
  }

  return teacher;
}

/**
 * Invalidate teacher profile cache
 * Call this when teacher data is updated
 *
 * @param userId - The user ID of the teacher
 */
export async function invalidateTeacherCache(userId: string): Promise<void> {
  const redis = getRedisClient();
  const cacheKey = `${TEACHER_CACHE_PREFIX}${userId}`;

  try {
    await redis.del(cacheKey);
  } catch (error) {
    console.error("Redis cache invalidation error:", error);
  }
}

/**
 * Invalidate all teacher caches
 * Use sparingly - only when bulk teacher data changes
 */
export async function invalidateAllTeacherCaches(): Promise<void> {
  const redis = getRedisClient();

  try {
    const keys = await redis.keys(`${TEACHER_CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Redis bulk cache invalidation error:", error);
  }
}
