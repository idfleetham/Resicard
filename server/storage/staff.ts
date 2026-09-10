import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import { merchantStaff, type MerchantStaff } from "@shared/schema";
import type { DbClient } from "./types";

/**
 * Till staff: a name and a PIN, no account.
 *
 * These rows can do exactly one thing — identify who was on the till when points
 * were awarded. They are not users, cannot sign in, and hold no email address.
 */

export async function listStaff(merchantId: string, client: DbClient = db): Promise<MerchantStaff[]> {
  return client
    .select()
    .from(merchantStaff)
    .where(eq(merchantStaff.merchantId, merchantId))
    .orderBy(asc(merchantStaff.name));
}

/** Only the ones whose PIN should still open the till. */
export async function listActiveStaff(merchantId: string, client: DbClient = db): Promise<MerchantStaff[]> {
  return client
    .select()
    .from(merchantStaff)
    .where(and(eq(merchantStaff.merchantId, merchantId), eq(merchantStaff.active, true)))
    .orderBy(asc(merchantStaff.name));
}

export async function getStaff(id: string, merchantId: string, client: DbClient = db): Promise<MerchantStaff | undefined> {
  const [row] = await client
    .select()
    .from(merchantStaff)
    .where(and(eq(merchantStaff.id, id), eq(merchantStaff.merchantId, merchantId)));
  return row;
}

export async function createStaff(
  values: { merchantId: string; name: string; pin: string },
  client: DbClient = db,
): Promise<MerchantStaff> {
  const [row] = await client.insert(merchantStaff).values(values).returning();
  return row;
}

export async function updateStaff(
  id: string,
  values: Partial<Pick<MerchantStaff, "name" | "pin" | "active">>,
  client: DbClient = db,
): Promise<MerchantStaff | undefined> {
  const [row] = await client.update(merchantStaff).set(values).where(eq(merchantStaff.id, id)).returning();
  return row;
}

export async function deleteStaff(id: string, client: DbClient = db): Promise<void> {
  await client.delete(merchantStaff).where(eq(merchantStaff.id, id));
}
