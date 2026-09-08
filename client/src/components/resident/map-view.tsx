import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import { X } from "lucide-react";
import { addTiles, categoryPin, FIT_OPTIONS, framedBounds, IS_TOUCH, MAP_ENABLED, MOBILE_SAFE_OPTIONS } from "@/lib/map";
import { CATEGORY_LABELS, categoryLabel, formatTime } from "@/components/resident/format";

/** GET /api/outlets/map. */
interface MapOutlet {
  id: string;
  name: string;
  category: string | null;
  latitude: number;
  longitude: number;
  isFavourite: boolean;
  liveOffers: { id: string; title: string; headline: string; endsAt: string | null }[];
  loyalty: { tierName: string; discountPercent: number | null } | null;
}

interface UnplacedOutlet {
  id: string;
  name: string;
  category: string | null;
  liveOfferCount: number;
}

interface MapResponse {
  centre: { lat: number; lng: number };
  outlets: MapOutlet[];
  withoutCoordinates: UnplacedOutlet[];
}

const ALL = "all";

/** Categories actually present, so the chips never offer a filter that finds nothing. */
function presentCategories(outlets: { category: string | null }[]): string[] {
  const set = new Set<string>();
  for (const o of outlets) if (o.category) set.add(o.category);
  return Array.from(set).sort((a, b) =>
    (CATEGORY_LABELS[a] ?? a).localeCompare(CATEGORY_LABELS[b] ?? b),
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 px-4 rounded-full text-sm font-bold whitespace-nowrap ${
        active ? "bg-sea text-foam" : "bg-white text-sea"
      }`}
    >
      {children}
    </button>
  );
}

function LiveLine({ offers }: { offers: MapOutlet["liveOffers"] }) {
  if (offers.length === 0) return <p className="text-sm text-slate-brand mt-1">Nothing on right now</p>;
  return (
    <ul className="mt-2 space-y-1">
      {offers.slice(0, 3).map((o) => (
        <li key={o.id} className="text-sm text-sea">
          <span className="font-bold">{o.headline}</span>
          <span className="text-[#0F3B47]/70"> · {o.title}</span>
          {o.endsAt && <span className="text-xs text-slate-brand"> · until {formatTime(o.endsAt)}</span>}
        </li>
      ))}
    </ul>
  );
}

/** The card that opens when a pin is tapped. */
function OutletCard({ outlet, onClose }: { outlet: MapOutlet; onClose: () => void }) {
  return (
    <div className="bg-white rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-xl leading-tight tracking-[-0.01em] text-sea truncate">{outlet.name}</p>
          <p className="text-xs text-slate-brand mt-0.5">
            {categoryLabel(outlet.category)}
            {outlet.isFavourite ? " · One of your places" : ""}
          </p>
          <LiveLine offers={outlet.liveOffers} />
          {outlet.loyalty && (
            <p className="text-xs text-slate-brand mt-2">
              {outlet.loyalty.tierName}
              {outlet.loyalty.discountPercent ? ` · ${outlet.loyalty.discountPercent}% off` : ""}
            </p>
          )}
          <Link
            href={`/outlets/${outlet.id}`}
            className="inline-flex items-center h-10 mt-3 text-sm font-bold text-buoy"
          >
            See the outlet
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-10 w-10 -mr-2 -mt-2 flex items-center justify-center rounded-full text-slate-brand"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function UnplacedList({ outlets }: { outlets: UnplacedOutlet[] }) {
  if (outlets.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display font-bold text-2xl tracking-[-0.02em] text-sea">Not on the map yet</h2>
      <p className="text-sm text-[#0F3B47]/70">
        These outlets are in the scheme but have not placed their pin yet.
      </p>
      <ul className="flex flex-col gap-3">
        {outlets.map((o) => (
          <li key={o.id} className="bg-white rounded-2xl">
            <Link href={`/outlets/${o.id}`} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-lg leading-tight tracking-[-0.01em] text-sea truncate">{o.name}</p>
                <p className="text-xs text-slate-brand mt-0.5">
                  {categoryLabel(o.category)} ·{" "}
                  {o.liveOfferCount === 0 ? "Nothing on just now" : `${o.liveOfferCount} offer${o.liveOfferCount === 1 ? "" : "s"} on now`}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The map view of the Offers tab. The map is one route to an offer and never the
 * only one: with no tile source configured, or with tiles that will not load, this
 * hands back to the ordinary offers list.
 */
export default function MapView({ fallback }: { fallback: ReactNode }) {
  const { data, isLoading } = useQuery<MapResponse>({ queryKey: ["/api/outlets/map"] });
  const [category, setCategory] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  // On touch devices the map starts inert so a thumb swipe scrolls past it.
  const [panLocked, setPanLocked] = useState(IS_TOUCH);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const framedRef = useRef(false);

  const outlets = data?.outlets ?? [];
  const unplaced = data?.withoutCoordinates ?? [];

  const categories = useMemo(() => presentCategories([...outlets, ...unplaced]), [outlets, unplaced]);
  const visible = useMemo(
    () => (category === ALL ? outlets : outlets.filter((o) => o.category === category)),
    [outlets, category],
  );
  const visibleUnplaced = useMemo(
    () => (category === ALL ? unplaced : unplaced.filter((o) => o.category === category)),
    [unplaced, category],
  );

  const usable = MAP_ENABLED && !tilesFailed;
  const centre = data?.centre;

  // Create the map once the container exists and the centre is known.
  useEffect(() => {
    if (!usable || !centre || !containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, MOBILE_SAFE_OPTIONS).setView([centre.lat, centre.lng], 15);
    addTiles(map, () => setTilesFailed(true));
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, [usable, centre]);

  // Redraw the pins whenever the filter or the data changes.
  useEffect(() => {
    const layer = markersRef.current;
    if (!layer) return;
    layer.clearLayers();
    const bounds = L.latLngBounds([]);
    for (const outlet of visible) {
      bounds.extend([outlet.latitude, outlet.longitude]);
      L.marker([outlet.latitude, outlet.longitude], {
        icon: categoryPin({
          category: outlet.category,
          hasLiveOffers: outlet.liveOffers.length > 0,
          isFavourite: outlet.isFavourite,
        }),
        title: `${outlet.name}, ${categoryLabel(outlet.category)}`,
        alt: `${outlet.name}, ${categoryLabel(outlet.category)}`,
        keyboard: true,
      })
        .on("click keypress", () => setSelectedId(outlet.id))
        .addTo(layer);
    }
    // Frame every pin the first time they are drawn; after that the resident is
    // in charge of where the map is looking.
    if (!framedRef.current && bounds.isValid()) {
      mapRef.current?.fitBounds(framedBounds(bounds), FIT_OPTIONS);
      framedRef.current = true;
    }
  }, [visible]);

  const selected = visible.find((o) => o.id === selectedId) ?? null;

  if (isLoading) {
    return <div className="h-[46vh] min-h-[300px] max-h-[560px] sm:h-[60vh] bg-white rounded-2xl animate-pulse" />;
  }

  const chips = (
    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
      <Chip active={category === ALL} onClick={() => setCategory(ALL)}>
        All
      </Chip>
      {categories.map((c) => (
        <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
          {categoryLabel(c)}
        </Chip>
      ))}
    </div>
  );

  if (!usable) {
    return (
      <div className="space-y-4">
        <div className="bg-sand rounded-2xl p-5 text-sm text-sea">
          The map is not available right now, so here are the offers as a list.
        </div>
        {fallback}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chips}

      <div className="relative rounded-2xl overflow-hidden bg-white">
        <div ref={containerRef} className="h-[46vh] min-h-[300px] max-h-[560px] sm:h-[60vh] w-full" role="application" aria-label="Map of outlets" />
        {panLocked && (
          <button
            type="button"
            onClick={() => {
              mapRef.current?.dragging.enable();
              setPanLocked(false);
            }}
            className="absolute inset-0 z-[500] flex items-end justify-center pb-6 bg-[#0F3B47]/10"
          >
            <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-sea">Tap to move the map</span>
          </button>
        )}
      </div>
      <p className="text-xs text-slate-brand">
        Pins in orange have something on now. Pinch to zoom.
      </p>

      {selected && <OutletCard outlet={selected} onClose={() => setSelectedId(null)} />}

      {visible.length === 0 && (
        <div className="bg-sand rounded-2xl p-5 text-sm text-sea">No outlets on the map match that filter.</div>
      )}

      <UnplacedList outlets={visibleUnplaced} />
    </div>
  );
}
