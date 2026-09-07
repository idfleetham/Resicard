import { config } from "../config";

/**
 * Normalise a UK postcode: uppercase, single space before the inward code.
 * Returns null when the input cannot be a postcode.
 */
export function normalisePostcode(input: string): string | null {
  const compact = input.replace(/\s+/g, "").toUpperCase();
  // Outward code is 2-4 characters, inward code is always 3 (digit + two letters).
  if (compact.length < 5 || compact.length > 7) return null;
  const outward = compact.slice(0, -3);
  const inward = compact.slice(-3);
  if (!/^[A-Z]{1,2}\d[A-Z\d]?$/.test(outward)) return null;
  if (!/^\d[A-Z]{2}$/.test(inward)) return null;
  return `${outward} ${inward}`;
}

/** True when the postcode's outward code starts with one of the configured local prefixes. */
export function isLocalPostcode(postcode: string, prefixes: readonly string[] = config.localPostcodePrefixes): boolean {
  const normalised = normalisePostcode(postcode);
  if (!normalised) return false;
  const outward = normalised.split(" ")[0];
  return prefixes.some((prefix) => {
    const p = prefix.replace(/\s+/g, "").toUpperCase();
    // A prefix such as "DD6" must match the whole district, so "DD61" is not local.
    if (/\d$/.test(p)) {
      return outward === p || (outward.startsWith(p) && /[A-Z]$/.test(outward.slice(p.length)) && outward.length === p.length + 1);
    }
    return outward.startsWith(p);
  });
}
