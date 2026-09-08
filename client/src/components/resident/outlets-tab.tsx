import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OutletBadge } from "@/components/resident/points-list";
import { categoryLabel } from "@/components/resident/format";
import FavouriteButton from "@/components/resident/favourite-button";

/** One entry of GET /api/outlets. */
export interface Outlet {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  logoUrl: string | null;
  reservationProvider: string | null;
  reservationUrl: string | null;
  isFavourite: boolean;
  liveOfferCount: number;
  bestOffer: { id: string; title: string; headline: string } | null;
  loyalty: { points: number; tierName: string | null } | null;
}

const SEARCH_FROM = 8;

export function offerCountLabel(count: number): string {
  if (count === 0) return "No offers just now";
  return `${count} offer${count === 1 ? "" : "s"}`;
}

function OutletRow({ outlet }: { outlet: Outlet }) {
  return (
    <li className="bg-white rounded-2xl">
      <div className="flex items-center gap-3 p-4">
        <Link
          href={`/outlets/${outlet.id}`}
          className="flex items-center gap-3 min-w-0 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        >
          <OutletBadge name={outlet.name} logoUrl={outlet.logoUrl} size="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-lg leading-tight truncate tracking-[-0.01em] text-sea">{outlet.name}</p>
            <p className="text-xs text-slate-brand truncate mt-0.5">
              {categoryLabel(outlet.category)}
              {outlet.address ? ` · ${outlet.address}` : ""}
            </p>
            {/* Offers and points sit under the name so a long outlet name is not squeezed. */}
            <p className="text-xs mt-1 truncate">
              <span className={outlet.liveOfferCount > 0 ? "font-bold text-sea" : "text-slate-brand"}>
                {offerCountLabel(outlet.liveOfferCount)}
              </span>
              {outlet.loyalty && (
                <span className="text-slate-brand">
                  {" · "}
                  {outlet.loyalty.points} points
                  {outlet.loyalty.tierName ? ` · ${outlet.loyalty.tierName}` : ""}
                </span>
              )}
            </p>
          </div>
        </Link>
        <FavouriteButton merchantId={outlet.id} isFavourite={outlet.isFavourite} />
      </div>
    </li>
  );
}

function Section({ title, outlets }: { title: string; outlets: Outlet[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display font-bold text-2xl tracking-[-0.02em] text-sea">{title}</h2>
      <ul className="flex flex-col gap-3">
        {outlets.map((o) => (
          <OutletRow key={o.id} outlet={o} />
        ))}
      </ul>
    </section>
  );
}

export default function OutletsTab() {
  const { data: outlets = [], isLoading } = useQuery<Outlet[]>({ queryKey: ["/api/outlets"] });
  const [term, setTerm] = useState("");

  const visible = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return outlets;
    return outlets.filter((o) =>
      [o.name, o.category, o.address].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [outlets, term]);

  const favourites = visible.filter((o) => o.isFavourite);
  const rest = visible.filter((o) => !o.isFavourite);

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
        ))}
      </ul>
    );
  }

  if (outlets.length === 0) {
    return <div className="bg-sand rounded-2xl p-8 text-center text-sea">No outlets have joined yet. Check back soon.</div>;
  }

  return (
    <div className="space-y-5">
      {outlets.length > SEARCH_FROM && (
        <div className="relative">
          <Search className="h-5 w-5 text-slate-brand absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search outlets"
            className="h-12 pl-12 text-base bg-white rounded-xl border-0"
          />
        </div>
      )}

      {visible.length === 0 ? (
        <div className="bg-sand rounded-2xl p-8 text-center text-sea">No outlets match that search.</div>
      ) : (
        <>
          {favourites.length > 0 && <Section title="Your places" outlets={favourites} />}
          {rest.length > 0 && <Section title="All outlets" outlets={rest} />}
        </>
      )}
    </div>
  );
}
