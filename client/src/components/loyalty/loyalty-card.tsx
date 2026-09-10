import { readableOn, themeStyle, tuckedEdge, withAlpha, type CardStyle } from "./card-themes";

export interface LoyaltyCardTier {
  name: string;
  color: string | null;
  discountPercent?: number | null;
}

export type LoyaltyCardSize = "peek" | "compact" | "full";

export interface LoyaltyCardProps {
  /** The outlet's name, always shown: a card with no name is not a card. */
  name: string;
  logoUrl?: string | null;
  theme?: string | null;
  pattern?: string | null;
  tier?: LoyaltyCardTier | null;
  points: number;
  /** The unit label under the number. Defaults to "points". */
  unit?: string;
  /** The flat tier discount, the number that matters at the bar. Null when the tier has none. */
  discountPercent?: number | null;
  size?: LoyaltyCardSize;
  className?: string;
}

/**
 * How much of a tucked card shows in the wallet stack. The strip has to carry the
 * outlet name, so it is sized for a 36px mark and a line of display text.
 */
export const CARD_PEEK_PX = 84;

/** Fallback mark when the outlet has no logo: its initial on a translucent tile. */
function Mark({ name, logoUrl, box, ink }: { name: string; logoUrl?: string | null; box: string; ink: string }) {
  if (logoUrl) return <img src={logoUrl} alt="" className={`${box} rounded-xl object-cover shrink-0`} />;
  return (
    <div
      className={`${box} rounded-xl shrink-0 flex items-center justify-center font-display font-extrabold`}
      style={{ backgroundColor: "rgba(127,127,127,0.28)", color: ink }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/**
 * The tier pill. Its fill is the rank — bronze, silver, gold — so a resident can
 * see where they stand at a glance anywhere in the stack.
 *
 * The ring matters: a bronze pill on a rust or buoy card is barely 1.2:1 against
 * the card and would read as a smudge. A hairline in the card's own foreground
 * gives the pill an edge on every one of the fourteen card colours.
 */
function TierPill({ tier, className, style }: { tier: LoyaltyCardTier; className: string; style: CardStyle }) {
  return (
    <span
      className={`inline-block rounded-full font-bold truncate max-w-full ${className}`}
      style={{
        backgroundColor: tier.color ?? "#E4572E",
        color: readableOn(tier.color),
        boxShadow: `0 0 0 1px ${withAlpha(style.foreground, 0.35)}`,
      }}
    >
      {tier.name}
    </span>
  );
}

/**
 * The strip of a tucked card that stays visible in the stack. Only the bottom of
 * the card shows, so the outlet name is anchored there: a stack of cards showing
 * nothing but point totals cannot be navigated.
 */
function PeekStrip({
  name,
  logoUrl,
  tier,
  points,
  unit,
  discount,
  style,
}: {
  name: string;
  logoUrl?: string | null;
  tier?: LoyaltyCardTier | null;
  points: number;
  unit: string;
  discount: number | null;
  style: CardStyle;
}) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4"
      style={{ height: `${CARD_PEEK_PX}px` }}
    >
      <Mark name={name} logoUrl={logoUrl} box="h-9 w-9" ink={style.foreground} />
      <p
        className="font-display font-bold text-base truncate tracking-[-0.01em] flex-1 min-w-0"
        style={{ color: style.foreground }}
      >
        {name}
      </p>
      <div className="shrink-0 flex flex-col items-end gap-1 max-w-[34%]">
        {tier ? <TierPill tier={tier} className="px-2.5 py-0.5 text-[11px]" style={style} /> : null}
        {discount ? (
          <span className="text-[13px] font-display font-extrabold" style={{ color: style.foreground }}>
            {discount}% off
          </span>
        ) : (
          <span className="text-[11px] font-bold tabular-nums" style={{ color: style.mutedForeground }}>
            {points} {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * One outlet's loyalty card: the front of the wallet stack (compact), a card
 * tucked behind it (peek) or the card held up at the till (full). Everything
 * below the outlet name is optional, so a brand new member with no tier, no
 * discount and no logo still gets a card that reads.
 */
export function LoyaltyCard({
  name,
  logoUrl,
  theme,
  pattern,
  tier,
  points,
  unit = "points",
  discountPercent,
  size = "compact",
  className = "",
}: LoyaltyCardProps) {
  const style = themeStyle(theme, pattern);
  const full = size === "full";
  const discount = discountPercent ?? tier?.discountPercent ?? null;
  const pad = full ? "p-6 sm:p-7" : "p-4";

  return (
    <div
      className={`relative w-full aspect-[1.6/1] overflow-hidden ${full ? "rounded-[24px]" : "rounded-[20px]"} ${className}`}
      // A tucked card gets a hairline along its top edge so it separates from
      // the card lying over it, even when both outlets chose the same colour.
      style={size === "peek" ? { ...style.surface, boxShadow: tuckedEdge(style.def) } : style.surface}
    >
      {style.overlay && <div className="absolute inset-0 pointer-events-none" style={style.overlay} aria-hidden="true" />}

      {size === "peek" ? (
        <PeekStrip
          name={name}
          logoUrl={logoUrl}
          tier={tier}
          points={points}
          unit={unit}
          discount={discount}
          style={style}
        />
      ) : (
        <div className={`relative h-full flex flex-col justify-between ${pad}`}>
          <div className="flex items-center gap-3 min-w-0">
            <Mark name={name} logoUrl={logoUrl} box={full ? "h-12 w-12" : "h-9 w-9"} ink={style.foreground} />
            <p
              className={`font-display font-bold truncate tracking-[-0.01em] ${full ? "text-2xl" : "text-base"}`}
              style={{ color: style.foreground }}
            >
              {name}
            </p>
          </div>

          {discount ? (
            <p
              className={`font-display font-extrabold leading-[0.9] tracking-[-0.03em] ${full ? "text-[56px] sm:text-[72px]" : "text-[30px]"}`}
              style={{ color: style.foreground }}
            >
              {discount}% off
            </p>
          ) : null}

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              {tier ? (
                <TierPill tier={tier} className={full ? "px-4 py-1.5 text-base" : "px-2.5 py-1 text-[11px]"} style={style} />
              ) : (
                <span
                  className={full ? "text-base font-semibold" : "text-[11px] font-semibold"}
                  style={{ color: style.mutedForeground }}
                >
                  No tier yet
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p
                className={`font-display font-extrabold leading-none tabular-nums tracking-[-0.02em] ${full ? "text-4xl" : "text-2xl"}`}
                style={{ color: style.foreground }}
              >
                {points}
              </p>
              <p
                className={`uppercase font-bold tracking-[0.12em] mt-0.5 ${full ? "text-[11px]" : "text-[10px]"}`}
                style={{ color: style.mutedForeground }}
              >
                {unit}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoyaltyCard;
