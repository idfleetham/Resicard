import { randomBytes } from "crypto";

/** URL-safe alphabet shared by merchant scan codes and household codes. */
export const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Letters and digits people can read out or type without confusion (no 0/O/1/I, upper case only). */
export const HUMAN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * The handle alphabet: the human alphabet with its vowels dropped, so a generated
 * handle cannot fall out as a word and cannot be misread across a bar.
 */
export const HANDLE_ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789";

export const HANDLE_PREFIX = "member_";
export const HANDLE_LENGTH = 8;

/** A random code of the given length drawn from the given alphabet. */
export function randomCode(length: number, alphabet: string = CODE_ALPHABET): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

/**
 * A resident's username, generated rather than chosen. Merchants see this handle
 * as the customer alias, so it must carry nothing about the person behind it: a
 * name a resident picked for themselves would identify them as surely as their
 * real one. Callers retry on collision.
 */
export function randomHandle(): string {
  return HANDLE_PREFIX + randomCode(HANDLE_LENGTH, HANDLE_ALPHABET);
}
