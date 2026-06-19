import type { Config } from "drizzle-kit";
import { normalizeDatabaseUrl } from "./lib/db/connection-url";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: normalizeDatabaseUrl(process.env.DATABASE_URL)!,
  },
  strict: true,
  verbose: true,
} satisfies Config;
