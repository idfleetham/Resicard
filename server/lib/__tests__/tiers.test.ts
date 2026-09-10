import { describe, it, expect } from "vitest";
import { MAX_TIERS, TIER_RANKS, tierColour, tierRank } from "@shared/tiers";

/*
  The whole point of fixing the ranks is that a resident can glance at a stack of
  cards from different outlets and see where they stand in each. That only holds
  if gold means "top of the house" everywhere, whatever a merchant named it.
*/

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("tier ranks", () => {
  it("has one rank per allowed tier", () => {
    expect(TIER_RANKS).toHaveLength(MAX_TIERS);
  });

  it("runs bronze, silver, gold from the bottom up", () => {
    expect(TIER_RANKS.map((r) => r.key)).toEqual(["bronze", "silver", "gold"]);
  });

  it("gives the usual three-tier programme bronze, silver, gold", () => {
    expect([0, 1, 2].map((i) => tierRank(i, 3).key)).toEqual(["bronze", "silver", "gold"]);
  });

  it("makes the top tier gold whatever the programme's size", () => {
    for (const total of [1, 2, 3]) {
      expect(tierRank(total - 1, total).key, `top of ${total}`).toBe("gold");
    }
  });

  it("gives a two-tier programme silver and gold, not bronze and silver", () => {
    expect([0, 1].map((i) => tierRank(i, 2).key)).toEqual(["silver", "gold"]);
  });

  it("gives a single-tier programme gold", () => {
    expect(tierRank(0, 1).key).toBe("gold");
  });

  it("never runs off the end of the scale, however odd the input", () => {
    for (const [i, total] of [[0, 0], [5, 3], [-1, 3], [2, 1], [99, 99]]) {
      expect(TIER_RANKS).toContain(tierRank(i, total));
    }
  });

  it("returns a six-digit hex colour", () => {
    expect(tierColour(0, 3)).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("gives every rank a distinct colour, or the ranks are pointless", () => {
    const colours = TIER_RANKS.map((r) => r.color.toLowerCase());
    expect(new Set(colours).size).toBe(colours.length);
  });

  it.each(TIER_RANKS)("$key keeps its pill text above 4.5:1", (rank) => {
    expect(contrast(rank.ink, rank.color)).toBeGreaterThanOrEqual(4.5);
  });

  /*
    The ranks get lighter going up, so the scale reads as a scale. This is also
    what keeps them apart: bronze and silver at the same lightness separated at
    only dE 13.5, under the floor where a full-colour reader can tell two
    swatches apart at pill size.
  */
  it("gets lighter from bronze to gold", () => {
    const lightness = TIER_RANKS.map((r) => {
      const n = parseInt(r.color.slice(1), 16);
      return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
    });
    for (let i = 1; i < lightness.length; i++) {
      expect(lightness[i], `${TIER_RANKS[i].key} is not lighter than ${TIER_RANKS[i - 1].key}`)
        .toBeGreaterThan(lightness[i - 1] * 1.4);
    }
  });
});
