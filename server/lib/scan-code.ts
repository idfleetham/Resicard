import { randomBytes } from "crypto";
import * as merchantStore from "../storage/merchants";
import type { DbClient } from "../storage/types";
import { db } from "../db";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
export const SCAN_CODE_LENGTH = 8;

export function randomScanCode(): string {
  const bytes = randomBytes(SCAN_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < SCAN_CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/** Generates a scan code not already used by another merchant. */
export async function uniqueScanCode(client: DbClient = db): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomScanCode();
    const existing = await merchantStore.getMerchantByScanCode(code, client);
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique scan code");
}
