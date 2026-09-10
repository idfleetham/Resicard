/**
 * Tier ranks: bronze, silver, gold.
 *
 * A resident carries cards from a dozen outlets, each with its own tier names —
 * Harbourmaster, Cellar Key, House Guest. Charming, and completely opaque: with
 * merchant-chosen colours there was no way to glance at the stack and see where
 * you stood anywhere. The names stay; the colour is now the rank, and it means
 * the same thing in every outlet in the town.
 *
 * The colour is derived from position, never stored. `loyalty_tiers.color` is
 * still in the database and is simply ignored — nothing reads it — so no
 * migration is needed and nothing is destroyed.
 */

export const MAX_TIERS = 3;

export interface TierRank {
  key: "bronze" | "silver" | "gold";
  label: string;
  /** The pill fill. */
  color: string;
  /** Ink for the pill's own text. */
  ink: string;
}

/**
 * Lowest first. Solid, slightly earthy versions rather than literal metallics,
 * which go muddy at pill size.
 *
 * They get lighter going up, so the scale reads as a scale and not as three
 * unrelated colours: a first pass had bronze and silver at almost identical
 * lightness and they separated at only ΔE 13.5, which is below the floor where
 * a full-colour reader can reliably tell two swatches apart. These separate at
 * ΔE 20.4 normal and 18.3 for the worst colour-blind case.
 */
export const TIER_RANKS: readonly TierRank[] = [
  { key: "bronze", label: "Bronze", color: "#96501F", ink: "#FFFFFF" },
  { key: "silver", label: "Silver", color: "#8794A0", ink: "#121E24" },
  { key: "gold", label: "Gold", color: "#E3B02A", ink: "#2A1D00" },
] as const;

/**
 * The rank for a tier, counted from the top so that gold always means "top of
 * the house". With the usual three tiers this is bronze, silver, gold from the
 * bottom up; a two-tier programme is silver and gold; a single tier is gold.
 *
 * `index` is the tier's position with the lowest threshold first, which is the
 * order `listTiers` returns.
 */
export function tierRank(index: number, total: number): TierRank {
  const fromTop = Math.max(0, total - 1 - index);
  return TIER_RANKS[Math.max(0, TIER_RANKS.length - 1 - fromTop)];
}

export function tierColour(index: number, total: number): string {
  return tierRank(index, total).color;
}
