import type { CardPattern, CardTheme } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import {
  CARD_PATTERN_LABELS,
  CARD_PATTERN_OPTIONS,
  CARD_THEME_DEFS,
  CARD_THEME_OPTIONS,
  themeStyle,
} from "@/components/loyalty/card-themes";
import { LoyaltyCard } from "@/components/loyalty/loyalty-card";

interface CardDesignProps {
  theme: CardTheme;
  pattern: CardPattern;
  onChange: (next: { theme: CardTheme; pattern: CardPattern }) => void;
  /** A tier to show in the preview, so the merchant sees their own colours. */
  previewTier: { name: string; color: string | null; discountPercent: number | null } | null;
}

const SWATCH = "h-11 w-11 rounded-xl border-2 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Theme and pattern swatches with a live preview of the resident's card. Six
 * colours and three patterns is the whole of it, so the copy says so plainly
 * rather than hinting at more to come.
 */
export default function CardDesign({ theme, pattern, onChange, previewTier }: CardDesignProps) {
  const { user } = useAuth();
  const merchant = user?.merchant ?? null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-5 items-start">
      <div className="space-y-4">
        <div>
          <p className="text-xs text-slate-brand mb-2">Colour</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Card colour">
            {CARD_THEME_OPTIONS.map((t) => {
              const def = CARD_THEME_DEFS[t];
              const selected = t === theme;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={def.label}
                  title={def.label}
                  onClick={() => onChange({ theme: t, pattern })}
                  className={`${SWATCH} ${selected ? "border-[#0F3B47] shadow-[0_0_0_3px_rgba(15,59,71,0.15)]" : "border-[#E6E9E8]"}`}
                  style={{ backgroundColor: def.background }}
                />
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-brand mb-2">Pattern</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Card pattern">
            {CARD_PATTERN_OPTIONS.map((p) => {
              const style = themeStyle(theme, p);
              const selected = p === pattern;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ theme, pattern: p })}
                  className={`relative overflow-hidden h-11 px-4 rounded-xl border-2 text-xs font-bold ${
                    selected ? "border-[#0F3B47] shadow-[0_0_0_3px_rgba(15,59,71,0.15)]" : "border-[#E6E9E8]"
                  }`}
                  style={style.surface}
                >
                  {style.overlay && <span className="absolute inset-0" style={style.overlay} aria-hidden="true" />}
                  <span className="relative">{CARD_PATTERN_LABELS[p]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-slate-brand max-w-sm">
          Six colours and three patterns, and that is the full set. Your logo and your tier colours do the rest, so every
          card in a resident's wallet stays readable across a busy bar.
        </p>
      </div>

      <div className="w-full sm:w-[280px]">
        <p className="text-xs text-slate-brand mb-2">In the resident's wallet</p>
        <LoyaltyCard
          name={merchant?.name ?? "Your outlet"}
          logoUrl={merchant?.logoUrl ?? null}
          theme={theme}
          pattern={pattern}
          tier={previewTier}
          discountPercent={previewTier?.discountPercent ?? null}
          points={320}
        />
      </div>
    </div>
  );
}
