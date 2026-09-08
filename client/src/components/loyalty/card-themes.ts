import type { CSSProperties } from "react";
import { CARD_PATTERNS, CARD_THEMES, type CardPattern, type CardTheme } from "@shared/schema";

/**
 * The six card designs, defined once so the wallet, the presentation view and
 * the merchant preview all draw the same card. Every foreground is checked
 * against its background: the lowest pairing here is 8.6:1 and the lowest muted
 * pairing 5.0:1, well past AA, because this card gets read across a dark bar.
 */
export interface CardThemeDef {
  /** Label for the merchant's swatch. */
  label: string;
  background: string;
  foreground: string;
  /** Secondary lines: points, "member since", the outlet's own name when the tier leads. */
  mutedForeground: string;
  /** Ink the pattern overlay is drawn in, so it reads on light and dark grounds alike. */
  patternInk: string;
}

export const CARD_THEME_DEFS: Record<CardTheme, CardThemeDef> = {
  sea: { label: "Sea", background: "#0F3B47", foreground: "#F2F5F4", mutedForeground: "#B7CBD1", patternInk: "rgba(242,245,244,0.12)" },
  ink: { label: "Ink", background: "#0A2A33", foreground: "#F2F5F4", mutedForeground: "#A9C0C7", patternInk: "rgba(242,245,244,0.12)" },
  moss: { label: "Moss", background: "#14392B", foreground: "#F1F7F2", mutedForeground: "#A9CDB6", patternInk: "rgba(241,247,242,0.12)" },
  rust: { label: "Rust", background: "#7A2D12", foreground: "#FFF3EC", mutedForeground: "#F0BFA6", patternInk: "rgba(255,243,236,0.14)" },
  plum: { label: "Plum", background: "#3D1B3D", foreground: "#F8F0F8", mutedForeground: "#D5B4D5", patternInk: "rgba(248,240,248,0.13)" },
  sand: { label: "Sand", background: "#E6D9BF", foreground: "#0F3B47", mutedForeground: "#4A5C62", patternInk: "rgba(15,59,71,0.10)" },
};

export const CARD_PATTERN_LABELS: Record<CardPattern, string> = {
  plain: "Plain",
  wave: "Wave",
  stripe: "Stripe",
};

/** The picker lists exactly these; there is nothing else to choose. */
export const CARD_THEME_OPTIONS = CARD_THEMES;
export const CARD_PATTERN_OPTIONS = CARD_PATTERNS;

export function themeDef(theme: string | null | undefined): CardThemeDef {
  return CARD_THEME_DEFS[(theme as CardTheme) ?? "sea"] ?? CARD_THEME_DEFS.sea;
}

/** The pattern as a CSS background-image, or null for plain. No images, so it costs nothing to load. */
function patternImage(pattern: CardPattern, ink: string): string | null {
  if (pattern === "wave") {
    return `repeating-radial-gradient(circle at 18% 128%, transparent 0 30px, ${ink} 30px 32px)`;
  }
  if (pattern === "stripe") {
    return `repeating-linear-gradient(115deg, ${ink} 0 2px, transparent 2px 15px)`;
  }
  return null;
}

/**
 * Black or white text for an arbitrary tier colour. Merchants pick tier colours
 * freely, so the tier pill has to stay readable whatever they chose.
 */
export function readableOn(colour: string | null | undefined): string {
  const hex = /^#[0-9a-f]{6}$/i.test(colour ?? "") ? (colour as string) : "#E4572E";
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const n = parseInt(hex.slice(1), 16);
  const luminance = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return luminance > 0.4 ? "#0A2A33" : "#FFFFFF";
}

export interface CardStyle {
  def: CardThemeDef;
  /** Put on the card element: background colour and text colour. */
  surface: CSSProperties;
  /** Put on an absolutely positioned, pointer-events-none child, or null when plain. */
  overlay: CSSProperties | null;
  /** Convenience for inline colours on individual lines. */
  foreground: string;
  mutedForeground: string;
}

/** Every surface that draws a loyalty card goes through this, so they cannot drift apart. */
export function themeStyle(theme: string | null | undefined, pattern: string | null | undefined): CardStyle {
  const def = themeDef(theme);
  const chosen = (CARD_PATTERNS as readonly string[]).includes(pattern ?? "") ? (pattern as CardPattern) : "plain";
  const image = patternImage(chosen, def.patternInk);
  return {
    def,
    surface: { backgroundColor: def.background, color: def.foreground },
    overlay: image ? { backgroundImage: image } : null,
    foreground: def.foreground,
    mutedForeground: def.mutedForeground,
  };
}
