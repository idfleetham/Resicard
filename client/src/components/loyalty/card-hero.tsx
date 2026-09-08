import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, User } from "lucide-react";
import { formatTime } from "@/components/resident/format";
import { themeStyle, type CardStyle } from "@/components/loyalty/card-themes";

/** Response of GET /api/loyalty/card/:merchantId. */
export interface LoyaltyCardData {
  merchant: { id: string; name: string; logoUrl: string | null };
  resident: { firstName: string | null; surname: string | null; profilePhoto: string | null; alias: string };
  cardTheme: string;
  cardPattern: string;
  points: number;
  statusPoints: number;
  tierWindowDays: number;
  tier: { name: string; color: string | null; discountPercent: number | null } | null;
  nextTier: { name: string; thresholdPoints: number } | null;
  memberSince: string | null;
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return <span className="font-display font-bold text-xl tabular-nums tracking-[0.02em]">{formatTime(now, true)}</span>;
}

function ResidentPhoto({ photo, ink }: { photo: string | null; ink: string }) {
  return (
    <div
      className="h-[64px] w-[64px] flex-none rounded-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: "rgba(127,127,127,0.28)", border: `3px solid ${ink}` }}
    >
      {photo ? (
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <User className="h-7 w-7" strokeWidth={1.5} style={{ color: ink }} />
      )}
    </div>
  );
}

/** The outlet: present, but secondary to what staff have to act on. */
function OutletLine({ merchant, style }: { merchant: LoyaltyCardData["merchant"]; style: CardStyle }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {merchant.logoUrl ? (
        <img src={merchant.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" />
      ) : (
        <div
          className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center font-display font-extrabold text-sm"
          style={{ backgroundColor: "rgba(127,127,127,0.28)" }}
        >
          {merchant.name.charAt(0).toUpperCase()}
        </div>
      )}
      <p className="font-display font-bold text-lg truncate tracking-[-0.01em]">{merchant.name}</p>
    </div>
  );
}

/**
 * What a member of staff reads across the bar: the tier, and the flat discount
 * that comes with it, which is the number they act on. A tier with no flat
 * discount puts its own name in the large slot; a resident with no tier yet gets
 * a card that still reads as a card rather than an empty one.
 */
function TierBlock({ tier, style }: { tier: LoyaltyCardData["tier"]; style: CardStyle }) {
  const discount = tier?.discountPercent ?? null;
  const accent = tier?.color ?? "#E4572E";

  if (!tier) {
    return (
      <div className="flex flex-col gap-2">
        <p className="font-display font-extrabold text-[44px] leading-[0.9] tracking-[-0.03em]">Member</p>
        <p className="text-sm font-semibold" style={{ color: style.mutedForeground }}>
          Earn points here to reach a tier and its discount
        </p>
      </div>
    );
  }

  if (!discount) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: style.mutedForeground }}>
          Tier
        </p>
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-5 w-5 rounded-full shrink-0" style={{ backgroundColor: accent }} aria-hidden="true" />
          <p className="font-display font-extrabold text-[46px] sm:text-[56px] leading-[0.9] tracking-[-0.035em] break-words min-w-0">
            {tier.name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: accent }} aria-hidden="true" />
        <p className="font-display font-extrabold text-[26px] leading-none tracking-[-0.02em] truncate">{tier.name}</p>
      </div>
      <p className="font-display font-extrabold text-[76px] sm:text-[92px] leading-[0.82] tracking-[-0.045em]">
        {discount}% off
      </p>
    </div>
  );
}

/**
 * The card, full-bleed and in the outlet's own colours. This is held up across a
 * bar, so the tier and any flat discount carry the screen and everything else,
 * the outlet included, sits around them.
 */
export default function CardHero({ card }: { card: LoyaltyCardData }) {
  const { merchant, resident, tier, cardTheme, cardPattern } = card;
  const style = themeStyle(cardTheme, cardPattern);
  const name = [resident.firstName, resident.surname].filter(Boolean).join(" ") || "Resident";

  return (
    <section className="relative overflow-hidden" style={style.surface}>
      {style.overlay && <div className="absolute inset-0 pointer-events-none" style={style.overlay} aria-hidden="true" />}
      <div className="relative max-w-md mx-auto px-5 pt-4 pb-7 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/resident?tab=cards"
            className="inline-flex items-center gap-1.5 text-sm font-bold"
            style={{ color: style.mutedForeground }}
          >
            <ArrowLeft className="h-4 w-4" /> Cards
          </Link>
          <Clock />
        </div>

        <OutletLine merchant={merchant} style={style} />

        <div className="min-h-[140px] flex flex-col justify-center">
          <TierBlock tier={tier} style={style} />
        </div>

        <div className="flex items-center gap-4">
          <ResidentPhoto photo={resident.profilePhoto} ink={style.foreground} />
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-[24px] leading-none tracking-[-0.02em] truncate">{name}</p>
            <p className="text-xs font-semibold mt-1 truncate" style={{ color: style.mutedForeground }}>
              {resident.alias}
            </p>
          </div>
          <span
            className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-right leading-tight"
            style={{ color: style.mutedForeground }}
          >
            Show
            <br />
            at the till
          </span>
        </div>
      </div>
    </section>
  );
}
