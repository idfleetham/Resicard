import { describe, it, expect } from "vitest";
import { CARD_THEMES } from "@shared/schema";
import { CARD_THEME_DEFS, readableOn, themeDef, tuckedEdge } from "@/components/loyalty/card-themes";

/*
  The card palette makes a promise in its own comment: every colour is legible at
  arm's length across a dark bar. This is that promise as a test, so adding a
  nice-looking colour that fails it breaks the build rather than shipping.
*/

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio, 1:1 to 21:1. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Full AA for body text, not the 3:1 large-text allowance. */
const FLOOR = 4.5;

describe("card themes", () => {
  it("defines every theme the schema offers", () => {
    for (const theme of CARD_THEMES) {
      expect(CARD_THEME_DEFS[theme], `${theme} has no definition`).toBeDefined();
    }
  });

  it("defines no theme the schema does not offer", () => {
    for (const key of Object.keys(CARD_THEME_DEFS)) {
      expect(CARD_THEMES as readonly string[]).toContain(key);
    }
  });

  it.each(CARD_THEMES)("%s keeps its foreground above 4.5:1", (theme) => {
    const def = CARD_THEME_DEFS[theme];
    expect(contrast(def.foreground, def.background)).toBeGreaterThanOrEqual(FLOOR);
  });

  it.each(CARD_THEMES)("%s keeps its muted foreground above 4.5:1", (theme) => {
    const def = CARD_THEME_DEFS[theme];
    expect(contrast(def.mutedForeground, def.background)).toBeGreaterThanOrEqual(FLOOR);
  });

  it("uses six-digit hex for every colour, so the contrast maths is valid", () => {
    for (const theme of CARD_THEMES) {
      const def = CARD_THEME_DEFS[theme];
      for (const colour of [def.background, def.foreground, def.mutedForeground]) {
        expect(colour, `${theme}: ${colour}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });

  it("gives every theme its own background, so no two swatches are the same card", () => {
    const backgrounds = CARD_THEMES.map((t) => CARD_THEME_DEFS[t].background.toLowerCase());
    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });

  it("offers colours that are actually bright, not fourteen shades of dark", () => {
    const light = CARD_THEMES.filter((t) => luminance(CARD_THEME_DEFS[t].background) > 0.25);
    expect(light.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back to sea for an unknown or missing theme", () => {
    expect(themeDef(undefined)).toBe(CARD_THEME_DEFS.sea);
    expect(themeDef(null)).toBe(CARD_THEME_DEFS.sea);
    expect(themeDef("not-a-theme")).toBe(CARD_THEME_DEFS.sea);
  });

  it("picks readable ink for a merchant's own tier colour", () => {
    expect(readableOn("#FFFFFF")).toBe("#0A2A33");
    expect(readableOn("#000000")).toBe("#FFFFFF");
    expect(readableOn("#F0B429")).toBe("#0A2A33");
    expect(readableOn("#A32A5E")).toBe("#FFFFFF");
  });

  /*
    Two outlets that both chose sea sit on top of each other in the wallet with
    no gap. The seam is drawn in the lower card's own foreground, which is the
    one colour guaranteed to contrast with its own background.
  */
  it.each(CARD_THEMES)("%s draws its tucked edge in its own foreground", (theme) => {
    const def = CARD_THEME_DEFS[theme];
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(def.foreground.slice(i, i + 2), 16));
    expect(tuckedEdge(def)).toContain(`rgba(${r}, ${g}, ${b}`);
  });

  it("draws the tucked edge as an inset line at the top", () => {
    expect(tuckedEdge(CARD_THEME_DEFS.sea)).toMatch(/^inset 0 1px 0 rgba\(/);
  });

  it("picks readable ink even when the tier colour is nonsense", () => {
    expect(["#0A2A33", "#FFFFFF"]).toContain(readableOn("rgb(1,2,3)"));
    expect(["#0A2A33", "#FFFFFF"]).toContain(readableOn(null));
  });
});
