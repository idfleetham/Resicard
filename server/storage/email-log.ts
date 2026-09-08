import { eq } from "drizzle-orm";
import { db } from "../db";
import { emailLog, type EmailKind, type EmailLogEntry } from "@shared/schema";
import type { DbClient } from "./types";

/**
 * Reserves the dedupe key. Throws on the unique violation when the message has
 * already gone out, which is how the daily job stays safe to re-run: the caller
 * takes the throw as "already sent" and moves on.
 */
export async function insertEmailLog(
  values: { userId: number; kind: EmailKind; dedupeKey: string },
  client: DbClient = db,
): Promise<EmailLogEntry> {
  const [row] = await client.insert(emailLog).values(values).returning();
  return row;
}

export async function findEmailLog(dedupeKey: string, client: DbClient = db): Promise<EmailLogEntry | undefined> {
  const [row] = await client.select().from(emailLog).where(eq(emailLog.dedupeKey, dedupeKey)).limit(1);
  return row;
}
