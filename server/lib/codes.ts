import { randomBytes } from "crypto";

/** URL-safe alphabet shared by merchant scan codes and household codes. */
export const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Letters and digits people can read out or type without confusion (no 0/O/1/I, upper case only). */
export const HUMAN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A random code of the given length drawn from the given alphabet. */
export function randomCode(length: number, alphabet: string = CODE_ALPHABET): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}
