import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CARD_PEEK_PX, LoyaltyCard } from "@/components/loyalty/loyalty-card";
import type { LoyaltyMembership } from "@/components/resident/points-list";
import type { Outlet } from "@/components/resident/outlets-tab";

/** Card height is 62.5% of its width (a 1.6:1 card), and margin percentages resolve against width. */
const TUCK = `calc(${CARD_PEEK_PX}px - 62.5%)`;

function EmptyWallet() {
  return (
    <div className="bg-sand rounded-2xl p-6 max-w-md">
      <h2 className="font-display font-bold text-2xl tracking-[-0.02em] text-sea">No loyalty cards yet</h2>
      <p className="text-sm text-[#0F3B47]/70 mt-2">
        Cards appear here once you have redeemed at an outlet that runs a loyalty programme. Each one shows your tier,
        your points and any discount that comes with them.
      </p>
      <Link
        href="/resident?tab=offers&view=outlets"
        className="inline-flex mt-4 text-sm font-bold text-sea underline underline-offset-4"
      >
        Find an outlet
      </Link>
    </div>
  );
}

/** The resident's loyalty cards, stacked the way passes sit in a wallet: favourites at the front. */
export default function CardsTab() {
  const { data: memberships = [], isLoading } = useQuery<LoyaltyMembership[]>({ queryKey: ["/api/loyalty/mine"] });
  const { data: outlets = [] } = useQuery<Outlet[]>({ queryKey: ["/api/outlets"] });

  const ordered = useMemo(() => {
    const favourites = new Set(outlets.filter((o) => o.isFavourite).map((o) => o.id));
    const rank = (m: LoyaltyMembership) => (favourites.has(m.merchant.id) ? 0 : 1);
    return [...memberships].sort((a, b) => rank(a) - rank(b));
  }, [memberships, outlets]);

  if (isLoading) {
    return <div className="max-w-md aspect-[1.6/1] bg-white rounded-[20px] animate-pulse" />;
  }

  if (ordered.length === 0) return <EmptyWallet />;

  return (
    <div className="max-w-md">
      <p className="text-xs text-slate-brand mb-3">
        Tap a card to show it at the till. {ordered.length === 1 ? "One outlet so far." : `${ordered.length} outlets.`}
      </p>
      <ul className="relative">
        {ordered.map((m, i) => (
          <li
            key={m.merchant.id}
            className="relative transition-transform duration-200 hover:translate-y-1 focus-within:translate-y-1"
            style={{ marginTop: i === 0 ? 0 : TUCK, zIndex: ordered.length - i }}
          >
            <Link
              href={`/loyalty/${m.merchant.id}`}
              aria-label={`${m.merchant.name} loyalty card`}
              className="block rounded-[20px] shadow-[0_10px_24px_rgba(15,59,71,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <LoyaltyCard
                name={m.merchant.name}
                logoUrl={m.merchant.logoUrl}
                theme={m.cardTheme}
                pattern={m.cardPattern}
                tier={m.tier}
                discountPercent={m.tierDiscountPercent}
                points={m.points}
                size={i === 0 ? "compact" : "peek"}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
