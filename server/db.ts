import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { config } from "./config";

// Standard Postgres driver. Works with Neon (Replit's database), any hosted
// Postgres, and a local instance for development.
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes("localhost") || config.databaseUrl.includes("127.0.0.1") || config.databaseUrl.includes("/tmp") ? undefined : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
export type Db = typeof db;
