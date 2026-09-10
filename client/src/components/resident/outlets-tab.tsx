import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Navigation, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OutletBadge } from "@/components/resident/points-list";
import { categoryLabel } from "@/components/resident/format";
import FavouriteButton from "@/components/resident/favourite-button";
import { formatDistance, sortByDistance, useNearby } from "@/lib/nearby";

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
  latitude: number | null;
  longitude: number | null;
}

const SEARCH_FROM = 8;

export function offerCountLabel(count: number): string {
  if (count === 0) return "No offers just now";
  return `${count} offer${count === 1 ? "" : "s"}`;
}

function OutletRow({ outlet, metres }: { outlet: Outlet; metres?: number | null }) {
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
              {/*
                The distance leads the line when there is one. Walking to it is
                the decision being made, and it is the reason the list is in
                this order rather than alphabetical.
              */}
              {metres != null && <span className="font-bold text-sea">{formatDistance(metres)} · </span>}
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

interface Ranked {
  outlet: Outlet;
  metres: number | null;
}

function Section({ title, items }: { title: string; items: Ranked[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display font-bold text-2xl tracking-[-0.02em] text-sea">{title}</h2>
      <ul className="flex flex-col gap-3">
        {items.map(({ outlet, metres }) => (
          <OutletRow key={outlet.id} outlet={outlet} metres={metres} />
        ))}
      </ul>
    </section>
  );
}

/**
 * The Near me control.
 *
 * It asks nothing until it is pressed. Asking for location on page load is how
 * an app gets refused permanently, and a resident who has said no once is not
 * asked again in this session.
 */
function NearMe({ nearby }: { nearby: ReturnType<typeof useNearby> }) {
  const { status, request, clear } = nearby;
  if (status === "unsupported") return null;

  if (status === "on") {
    return (
      <button
        type="button"
        onClick={clear}
        className="h-10 px-4 rounded-full bg-sea text-foam text-sm font-bold inline-flex items-center gap-2"
      >
        <Navigation className="h-4 w-4" /> Nearest first
        <X className="h-4 w-4 opacity-70" />
      </button>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-slate-brand">
        Location is switched off for Resicard. Turn it on in your browser settings if you want the nearest places first.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={request}
        disabled={status === "asking"}
        className="h-10 px-4 rounded-full bg-white text-sea text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
      >
        <Navigation className="h-4 w-4" /> {status === "asking" ? "Finding you" : "Near me"}
      </button>
      {status === "failed" && (
        <p className="text-xs text-slate-brand">Could not get a location just now. Try again in a moment.</p>
      )}
    </div>
  );
}

export default function OutletsTab() {
  const { data: outlets = [], isLoading } = useQuery<Outlet[]>({ queryKey: ["/api/outlets"] });
  const [term, setTerm] = useState("");
  const nearby = useNearby();

  const visible = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return outlets;
    return outlets.filter((o) =>
      [o.name, o.category, o.address].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [outlets, term]);

  const anyPlaced = outlets.some((o) => o.latitude != null && o.longitude != null);
  const on = nearby.status === "on" && nearby.position !== null;

  /*
    With Near me on the list is one ranked run, favourites included. Splitting it
    into "Your places" and "All outlets" would put a favourite half a mile away
    above the pub across the road, which is the opposite of what was asked for.
  */
  const rank = (list: Outlet[]): Ranked[] =>
    on && nearby.position
      ? sortByDistance(list, nearby.position)
      : list.map((outlet) => ({ outlet, metres: null }));

  const favourites = rank(visible.filter((o) => o.isFavourite));
  const rest = rank(visible.filter((o) => !o.isFavourite));
  const ranked = rank(visible);

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

      {anyPlaced && <NearMe nearby={nearby} />}

      {visible.length === 0 ? (
        <div className="bg-sand rounded-2xl p-8 text-center text-sea">No outlets match that search.</div>
      ) : on ? (
        <Section title="Near you" items={ranked} />
      ) : (
        <>
          {favourites.length > 0 && <Section title="Your places" items={favourites} />}
          {rest.length > 0 && <Section title="All outlets" items={rest} />}
        </>
      )}
    </div>
  );
}
