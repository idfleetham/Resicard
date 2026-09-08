// Drops every table in the public schema, then recreates them from shared/schema.ts.
// Only for development or a fresh start. All data is lost.
import pg from "pg";
import { execSync } from "child_process";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
if (process.argv[2] !== "--yes") {
  console.log("This deletes every table and all data. Run again with --yes to confirm.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? undefined : { rejectUnauthorized: false } });
async function main() {
  const client = await pool.connect();
  try {
    await client.query("drop schema public cascade; create schema public;");
    console.log("Schema dropped.");
  } finally {
    client.release();
    await pool.end();
  }
  execSync("npx drizzle-kit push --force", { stdio: "inherit" });
  // push builds the tables straight from the schema, which leaves the migration
  // ledger empty while every table already exists. db:migrate would then try to
  // replay the baseline and fail on "relation already exists", so record the
  // migrations as applied here instead.
  execSync("npx tsx server/scripts/migrate.ts --baseline", { stdio: "inherit" });
  console.log("Tables recreated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
