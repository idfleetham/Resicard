/**
 * Applies the SQL migrations in ./migrations.
 *
 * This replaces `drizzle-kit push` for anything holding real data. push diffs the
 * code against the live database and applies the difference, which means a
 * renamed column reads as a drop plus a create, and it asks ambiguous questions
 * that are easy to answer wrongly at four in the afternoon. Migrations are an
 * ordered list of statements that either ran or did not.
 *
 *   npm run db:migrate              apply anything outstanding
 *   npm run db:migrate -- --baseline  record every existing migration as applied
 *                                     WITHOUT running it
 *
 * --baseline is for one situation only: a database whose tables were created by
 * `drizzle-kit push` before migrations existed. The tables are already there, so
 * replaying the baseline migration would fail on "relation already exists". Run
 * it once on that database, then never again. On an empty database, do NOT use
 * it; run the plain command so the tables are actually created.
 */

import { readdirSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";
import pg from "pg";
import { config } from "../config";

const MIGRATIONS_DIR = join(process.cwd(), "migrations");

interface Migration {
  file: string;
  sql: string;
  hash: string;
}

function readMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      return { file, sql, hash: createHash("sha256").update(sql).digest("hex") };
    });
}

async function main() {
  const baseline = process.argv.includes("--baseline");
  if (!config.databaseUrl) throw new Error("DATABASE_URL is not set");

  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();

  try {
    await client.query(`
      create table if not exists __resicard_migrations (
        hash text primary key,
        file text not null,
        applied_at timestamptz not null default now()
      )
    `);

    const applied = new Set(
      (await client.query<{ hash: string }>("select hash from __resicard_migrations")).rows.map((r) => r.hash),
    );

    const migrations = readMigrations();
    let count = 0;

    for (const migration of migrations) {
      if (applied.has(migration.hash)) continue;

      // Each migration is one transaction: it lands whole or not at all.
      await client.query("begin");
      try {
        if (!baseline) {
          // Drizzle separates statements with this marker rather than plain
          // semicolons, because a semicolon can appear inside a function body.
          for (const statement of migration.sql.split("--> statement-breakpoint")) {
            const trimmed = statement.trim();
            if (trimmed) await client.query(trimmed);
          }
        }
        await client.query("insert into __resicard_migrations (hash, file) values ($1, $2)", [
          migration.hash,
          migration.file,
        ]);
        await client.query("commit");
        console.log(`${baseline ? "Recorded" : "Applied"} ${migration.file}`);
        count += 1;
      } catch (err) {
        await client.query("rollback");
        throw new Error(`${migration.file} failed and was rolled back: ${(err as Error).message}`);
      }
    }

    if (count === 0) console.log("Nothing to do; the database is up to date.");
    else if (baseline) console.log(`\nBaselined ${count} migration(s). Do not run --baseline again.`);
    else console.log(`\nApplied ${count} migration(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
