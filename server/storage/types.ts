import { db } from "../db";

/** A drizzle transaction handle. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Either the shared connection or a transaction; every storage function accepts one. */
export type DbClient = typeof db | Tx;
