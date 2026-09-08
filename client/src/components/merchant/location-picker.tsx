import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { addTiles, draggablePin, FALLBACK_CENTRE, MAP_ENABLED } from "@/lib/map";
import { INPUT } from "./portal-ui";

const LABEL = "text-xs text-slate-brand";

export interface LocationValue {
  latitude: string;
  longitude: string;
}

function parsed(value: LocationValue): [number, number] | null {
  const lat = Number(value.latitude);
  const lng = Number(value.longitude);
  if (value.latitude.trim() === "" || value.longitude.trim() === "") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

const round = (n: number) => n.toFixed(6);

/**
 * Latitude and longitude, by dragging a pin or by typing. Almost nobody types a
 * latitude, so the map is the real control and the two fields are there for the
 * rare case of pasting a coordinate from somewhere else. Both stay in step: the
 * pin follows a valid typed pair, and typing follows the pin.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const usable = MAP_ENABLED && !tilesFailed;

  // Leaflet handlers are bound once, so they read the newest onChange through a ref.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const point = parsed(value);

  useEffect(() => {
    if (!usable || !containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(point ?? FALLBACK_CENTRE, point ? 17 : 14);
    addTiles(map, () => setTilesFailed(true));
    // Tapping anywhere places the pin, which is quicker than dragging it across town.
    map.on("click", (e: L.LeafletMouseEvent) =>
      onChangeRef.current({ latitude: round(e.latlng.lat), longitude: round(e.latlng.lng) }),
    );
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [usable]);

  // Keep the pin on whatever the fields currently say.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!point) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const marker = L.marker(point, { icon: draggablePin(), draggable: true, keyboard: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChangeRef.current({ latitude: round(p.lat), longitude: round(p.lng) });
      });
      markerRef.current = marker;
      map.setView(point, Math.max(map.getZoom(), 16));
    } else {
      markerRef.current.setLatLng(point);
    }
  }, [usable, point?.[0], point?.[1]]);

  const field = (key: keyof LocationValue) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: e.target.value });

  return (
    <div className="space-y-3">
      {usable ? (
        <>
          <div ref={containerRef} className="h-56 w-full rounded-xl overflow-hidden" role="application" aria-label="Place your pin" />
          <p className="text-xs text-slate-brand">
            Tap the map or drag the pin to where residents will find you.
          </p>
        </>
      ) : (
        <p className="text-xs text-slate-brand">
          The map is not available, so type the coordinates instead.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="latitude" className={LABEL}>Latitude</Label>
          <Input id="latitude" inputMode="decimal" placeholder="56.339" className={INPUT} value={value.latitude} onChange={field("latitude")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="longitude" className={LABEL}>Longitude</Label>
          <Input id="longitude" inputMode="decimal" placeholder="-2.795" className={INPUT} value={value.longitude} onChange={field("longitude")} />
        </div>
      </div>
      {(value.latitude || value.longitude) && (
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-3 text-sm"
          onClick={() => onChange({ latitude: "", longitude: "" })}
        >
          Remove the pin
        </Button>
      )}
    </div>
  );
}
