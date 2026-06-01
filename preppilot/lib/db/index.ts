import { Pool, type PoolConfig } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  // Don't throw at import time during build — let runtime fail with a clearer message.
  console.warn("DATABASE_URL is not set. Database calls will fail until it's configured.");
}

const globalForDb = globalThis as unknown as { preppilotPool?: Pool };

const poolConfig: PoolConfig & { family?: number } = {
  connectionString: process.env.DATABASE_URL,
  family: 4,
  connectionTimeoutMillis: 10_000,
};

const pool =
  globalForDb.preppilotPool ??
  new Pool(poolConfig);

if (process.env.NODE_ENV !== "production") {
  globalForDb.preppilotPool = pool;
}

export const db = drizzle(pool, { schema });
export * from "./schema";
