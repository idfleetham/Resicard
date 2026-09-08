import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet setup shared by the resident map and the merchant pin picker.
//
// Tiles are a running cost and a licensing decision, so the source is configured
// rather than hard-coded. Setting VITE_MAP_TILE_URL to an empty string turns the
// map off entirely and every view that uses it falls back to a plain list.

export const TILE_URL = (import.meta.env.VITE_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png").trim();

export const TILE_ATTRIBUTION =
  import.meta.env.VITE_MAP_TILE_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Where a map opens before it has anything to show. The resident map uses the
 * centre the API returns; this is for the merchant pin picker, which has no such
 * call, and mirrors the MAP_CENTRE_LAT / MAP_CENTRE_LNG defaults on the server.
 */
export const FALLBACK_CENTRE: [number, number] = [56.339, -2.795];

/** False when this deployment has deliberately no tile source; callers show the list instead. */
export const MAP_ENABLED = TILE_URL.length > 0;

// Brand palette, repeated here because pins are built as HTML strings for
// Leaflet and so cannot use the Tailwind utilities.
const SEA = "#0F3B47";
const BUOY = "#E4572E";
const FOAM = "#F2F5F4";
const SAND = "#E6D9BF";

/** lucide glyphs, inlined: a divIcon is an HTML string, so a React icon cannot be used. */
const CATEGORY_GLYPHS: Record<string, string> = {
  restaurant: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  bar: '<path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8Z"/>',
  cafe: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
  pub: '<path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z"/><path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/>',
  takeaway: '<path d="m2.37 11.223 8.372-6.777a2 2 0 0 1 2.516 0l8.371 6.777"/><path d="M21 15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-5.25"/><path d="M3 15a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h9"/><path d="m6.67 15 6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2"/><rect width="20" height="4" x="2" y="11" rx="1"/>',
  hotel: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>',
  retail: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  services: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  experience: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
  other: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
};

function glyph(category: string | null | undefined, colour: string): string {
  const paths = CATEGORY_GLYPHS[category ?? "other"] ?? CATEGORY_GLYPHS.other;
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

export interface PinOptions {
  category: string | null;
  /** Buoy for an outlet with something on, sea for one that is simply in the scheme. */
  hasLiveOffers: boolean;
  isFavourite?: boolean;
}

/**
 * A pin drawn in HTML. Leaflet's default marker points at image files that
 * bundlers rewrite out from under it, so nothing here depends on those assets.
 */
export function categoryPin({ category, hasLiveOffers, isFavourite }: PinOptions): L.DivIcon {
  const fill = hasLiveOffers ? BUOY : SEA;
  const star = isFavourite
    ? `<span style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:9999px;background:${SAND};border:2px solid #fff"></span>`
    : "";
  return L.divIcon({
    className: "resicard-pin",
    html:
      `<span style="position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;` +
      `border-radius:9999px;background:${fill};border:2px solid #fff;box-shadow:0 2px 6px rgba(15,59,71,.35)">` +
      `${glyph(category, FOAM)}${star}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

/** The draggable pin the merchant places, always sea and always the same shape. */
export function draggablePin(): L.DivIcon {
  return L.divIcon({
    className: "resicard-pin",
    html:
      `<span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;` +
      `background:${BUOY};border:3px solid #fff;box-shadow:0 2px 8px rgba(15,59,71,.4);cursor:grab">` +
      `${glyph("other", FOAM)}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

/** True when this is a touch device, where one-finger dragging has to be handled carefully. */
export const IS_TOUCH = L.Browser.mobile;

/**
 * On a phone a one-finger drag must scroll the page, not pan the map, or a map
 * halfway down a list becomes a trap the thumb cannot get out of. Leaflet has no
 * two-finger-drag mode, so dragging starts off and a tap turns it on; pinching
 * still pans and zooms with two fingers in the meantime.
 */
export const MOBILE_SAFE_OPTIONS: L.MapOptions = {
  scrollWheelZoom: false,
  dragging: !IS_TOUCH,
  touchZoom: true,
};

/** Adds the configured tile layer, calling back if the tiles cannot be fetched. */
export function addTiles(map: L.Map, onError: () => void): void {
  if (!MAP_ENABLED) return;
  const layer = L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 });
  layer.on("tileerror", onError);
  layer.addTo(map);
}
