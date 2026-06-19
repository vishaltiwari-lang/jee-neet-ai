import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { normalizeDatabaseUrl } from "./connection-url";

if (!process.env.DATABASE_URL) {
  // Don't throw at import time during build — let runtime fail with a clearer message.
  console.warn("DATABASE_URL is not set. Database calls will fail until it's configured.");
}

const fallbackDatabaseUrl = "postgres://missing:missing@localhost/missing";
const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL ?? fallbackDatabaseUrl) ?? fallbackDatabaseUrl;
const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
export * from "./schema";
