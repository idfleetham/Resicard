import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { postcards, users, type Postcard } from "@shared/schema";
import type { DbClient } from "./types";

export type PostcardStatus = NonNullable<Postcard["status"]>;

export const OPEN_STATUSES: PostcardStatus[] = ["requested", "posted"];

export async function getPostcardById(id: string, client: DbClient = db): Promise<Postcard | undefined> {
  const [row] = await client.select().from(postcards).where(eq(postcards.id, id)).limit(1);
  return row;
}

/** The resident's most recent postcard of any status, if there is one. */
export async function getLatestPostcardForUser(userId: number, client: DbClient = db): Promise<Postcard | undefined> {
  const [row] = await client
    .select()
    .from(postcards)
    .where(eq(postcards.userId, userId))
    .orderBy(desc(postcards.requestedAt))
    .limit(1);
  return row;
}

/** The resident's requested or posted postcard, if there is one. */
export async function getOpenPostcardForUser(userId: number, client: DbClient = db): Promise<Postcard | undefined> {
  const [row] = await client
    .select()
    .from(postcards)
    .where(and(eq(postcards.userId, userId), inArray(postcards.status, OPEN_STATUSES)))
    .orderBy(desc(postcards.requestedAt))
    .limit(1);
  return row;
}

export async function createPostcard(
  values: { userId: number; codeHash: string; addressSnapshot: string; expiresAt: Date },
  client: DbClient = db,
): Promise<Postcard> {
  const [row] = await client.insert(postcards).values({ ...values, status: "requested" }).returning();
  return row;
}

export async function updatePostcard(id: string, values: Partial<Postcard>, client: DbClient = db): Promise<Postcard | undefined> {
  const [row] = await client.update(postcards).set(values).where(eq(postcards.id, id)).returning();
  return row;
}

/** Cancels every requested or posted postcard for the user (address change, in-person verification). */
export async function cancelOpenPostcards(userId: number, client: DbClient = db): Promise<void> {
  await client
    .update(postcards)
    .set({ status: "cancelled" })
    .where(and(eq(postcards.userId, userId), inArray(postcards.status, OPEN_STATUSES)));
}

export interface PostcardWithResident extends Postcard {
  firstName: string | null;
  surname: string | null;
  email: string;
}

export async function listPostcardsByStatus(status: PostcardStatus, client: DbClient = db): Promise<PostcardWithResident[]> {
  const rows = await client
    .select({ postcard: postcards, firstName: users.firstName, surname: users.surname, email: users.email })
    .from(postcards)
    .innerJoin(users, eq(users.id, postcards.userId))
    .where(eq(postcards.status, status))
    .orderBy(status === "requested" ? postcards.requestedAt : desc(postcards.requestedAt));
  return rows.map((r) => ({ ...r.postcard, firstName: r.firstName, surname: r.surname, email: r.email }));
}

export async function listRequestedPostcardsByIds(ids: string[], client: DbClient = db): Promise<PostcardWithResident[]> {
  if (ids.length === 0) return [];
  const rows = await client
    .select({ postcard: postcards, firstName: users.firstName, surname: users.surname, email: users.email })
    .from(postcards)
    .innerJoin(users, eq(users.id, postcards.userId))
    .where(and(inArray(postcards.id, ids), eq(postcards.status, "requested")))
    .orderBy(postcards.requestedAt);
  return rows.map((r) => ({ ...r.postcard, firstName: r.firstName, surname: r.surname, email: r.email }));
}

export async function countPostcardsByStatus(status: PostcardStatus, client: DbClient = db): Promise<number> {
  const [row] = await client.select({ value: sql<number>`count(*)::int` }).from(postcards).where(eq(postcards.status, status));
  return row?.value ?? 0;
}
