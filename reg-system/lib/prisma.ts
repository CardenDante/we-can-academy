import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Optimized for 100+ concurrent users with PgBouncer
  // Note: PgBouncer handles connection pooling, so reduce pool size here
  max: 20, // Maximum number of clients (PgBouncer pools to database)
  min: 5, // Minimum number of clients to keep alive
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout after 5 seconds if all connections are busy
  // statement_timeout removed - not supported by PgBouncer in transaction mode
  // Query timeout is handled at PostgreSQL level (10s configured in docker-compose)
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: [
      {
        emit: "event",
        level: "query",
      },
      {
        emit: "stdout",
        level: "error",
      },
      {
        emit: "stdout",
        level: "warn",
      },
    ],
  });

// Monitor slow queries in development and production
if (process.env.NODE_ENV !== "test") {
  prisma.$on("query" as never, (e: any) => {
    const duration = e.duration;
    const query = e.query;

    // Log queries that take longer than 1 second
    if (duration > 1000) {
      console.warn(`[SLOW QUERY - ${duration}ms]`, {
        query: query.substring(0, 200) + (query.length > 200 ? "..." : ""),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    }

    // Log extremely slow queries (>5 seconds) as errors
    if (duration > 5000) {
      console.error(`[CRITICAL SLOW QUERY - ${duration}ms]`, {
        query: query.substring(0, 500) + (query.length > 500 ? "..." : ""),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
