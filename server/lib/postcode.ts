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

/**
 * A configured prefix, split into the district and an optional sector.
 *
 * Eligibility is not always a whole postal district. KY15 is Cupar and reaches a
 * long way into the countryside, so the catchment may be only some of its
 * sectors. "KY16" is a district; "KY15 4" (or "KY154") is one sector of KY15.
 *
 * The split is unambiguous because the outward code is matched greedily: "KY154"
 * takes "KY15" as the district and "4" as the sector, while "KY16" takes the
 * whole thing as a district and leaves no sector.
 */
function parsePrefix(prefix: string): { district: string; sector: string | null } | null {
  const compact = prefix.replace(/\s+/g, "").toUpperCase();
  const match = /^([A-Z]{1,2}\d[A-Z\d]?)(\d?)$/.exec(compact);
  if (!match) return null;
  return { district: match[1], sector: match[2] || null };
}

/** The answer to "can this person join?", without saying what the rule is. */
export interface PostcodeCheck {
  /** False when the string cannot be a postcode at all. */
  valid: boolean;
  /** True only when it is a real postcode inside the catchment. */
  eligible: boolean;
  /** The tidied postcode, or null when it is not one. */
  normalised: string | null;
}

/**
 * Answer for one typed postcode. Deliberately says nothing about which districts
 * are listed: a would-be member should not be handed the rule to game.
 */
export function describePostcode(
  input: string,
  prefixes: readonly string[] = config.localPostcodePrefixes,
): PostcodeCheck {
  const normalised = normalisePostcode(input);
  if (!normalised) return { valid: false, eligible: false, normalised: null };
  return { valid: true, eligible: isLocalPostcode(normalised, prefixes), normalised };
}

/** True when the postcode falls in one of the configured local districts or sectors. */
export function isLocalPostcode(postcode: string, prefixes: readonly string[] = config.localPostcodePrefixes): boolean {
  const normalised = normalisePostcode(postcode);
  if (!normalised) return false;
  const [outward, inward] = normalised.split(" ");
  const sector = inward[0];

  return prefixes.some((prefix) => {
    const parsed = parsePrefix(prefix);
    // A district must match in full: "KY1" must not let in the whole of KY16.
    if (!parsed || outward !== parsed.district) return false;
    return parsed.sector === null || parsed.sector === sector;
  });
}
