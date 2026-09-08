import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OfferCard, { type PublicOffer } from "@/components/offer-card";
import OfferDetailsModal from "@/components/offer-details-modal";
import { categoryLabel } from "@/components/resident/format";
import OutletsTab, { type Outlet } from "@/components/resident/outlets-tab";
import MapView from "@/components/resident/map-view";

const ALL = "all";
const VIEWS = ["offers", "outlets", "map"] as const;
type View = (typeof VIEWS)[number];
const VIEW_LABELS: Record<View, string> = { offers: "Offers", outlets: "Outlets", map: "Map" };

export function OfferGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-foam" />
          <div className="p-5 space-y-2">
            <div className="h-3 bg-foam rounded w-1/3" />
            <div className="h-5 bg-foam rounded w-3/4" />
            <div className="h-3 bg-foam rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className="font-display font-bold text-sm tracking-[0.02em] text-slate-brand whitespace-nowrap">{label}</p>
      <span className="h-px flex-1 bg-[#E6E9E8]" />
    </div>
  );
}

function OfferGrid({ offers, onOpen }: { offers: PublicOffer[]; onOpen: (o: PublicOffer) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {offers.map((o) => (
        <OfferCard key={o.id} offer={o} onOpen={onOpen} />
      ))}
    </div>
  );
}

export default function OffersTab() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const requested = new URLSearchParams(search).get("view");
  const view: View = (VIEWS as readonly string[]).includes(requested ?? "") ? (requested as View) : "offers";

  const { data: offers = [], isLoading } = useQuery<PublicOffer[]>({ queryKey: ["/api/offers"] });
  const { data: outlets = [] } = useQuery<Outlet[]>({ queryKey: ["/api/outlets"] });
  const [category, setCategory] = useState(ALL);
  const [merchantId, setMerchantId] = useState(ALL);
  const [selected, setSelected] = useState<PublicOffer | null>(null);

  const favouriteIds = useMemo(
    () => new Set(outlets.filter((o) => o.isFavourite).map((o) => o.id)),
    [outlets],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const o of offers) set.add(o.category ?? o.merchant.category ?? "other");
    return Array.from(set).sort();
  }, [offers]);

  const merchants = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of offers) map.set(o.merchant.id, o.merchant.name);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [offers]);

  const filtered = category !== ALL || merchantId !== ALL;
  const visible = offers.filter((o) => {
    const cat = o.category ?? o.merchant.category ?? "other";
    if (category !== ALL && cat !== category) return false;
    if (merchantId !== ALL && o.merchant.id !== merchantId) return false;
    return true;
  });

  // Offers from starred outlets come first, under their own divider.
  const grouped = !filtered && favouriteIds.size > 0;
  const mine = grouped ? visible.filter((o) => favouriteIds.has(o.merchant.id)) : [];
  const others = grouped ? visible.filter((o) => !favouriteIds.has(o.merchant.id)) : visible;

  const changeView = (next: View) => {
    setLocation(next === "offers" ? "/resident?tab=offers" : `/resident?tab=offers&view=${next}`, { replace: true });
  };

  // Built once and used twice: it is the Offers view, and it is what the Map view
  // falls back to when there are no tiles, so no offer is ever only on the map.
  const offerList = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-12 text-base bg-white rounded-xl border-0">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {categoryLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={merchantId} onValueChange={setMerchantId}>
          <SelectTrigger className="h-12 text-base bg-white rounded-xl border-0">
            <SelectValue placeholder="Outlet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All outlets</SelectItem>
            {merchants.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <OfferGridSkeleton />
      ) : visible.length === 0 ? (
        <div className="bg-sand rounded-2xl p-8 text-center text-sea">
          {offers.length === 0 ? "No offers are live yet. Check back soon." : "No offers match those filters."}
        </div>
      ) : (
        <div className="space-y-4">
          {mine.length > 0 && (
            <div className="space-y-3">
              <Divider label="Your places" />
              <OfferGrid offers={mine} onOpen={setSelected} />
            </div>
          )}
          {others.length > 0 && (
            <div className="space-y-3">
              {mine.length > 0 && <Divider label="All offers" />}
              <OfferGrid offers={others} onOpen={setSelected} />
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="inline-grid grid-cols-3 h-12 p-1 rounded-full bg-white w-full sm:w-auto">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => changeView(v)}
            aria-pressed={view === v}
            className={`h-10 px-5 rounded-full text-[15px] font-bold ${view === v ? "bg-sea text-foam" : "text-sea"}`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {view === "outlets" ? <OutletsTab /> : view === "map" ? <MapView fallback={offerList} /> : offerList}

      <OfferDetailsModal offer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
