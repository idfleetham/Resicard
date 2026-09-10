import { useCallback, useState } from "react";
import type { Point } from "@shared/distance";

export { distanceMetres, formatDistance, sortByDistance } from "@shared/distance";
export type { Point } from "@shared/distance";

/**
 * "Near me": sorting the outlet list by how far away it is.
 *
 * Everything here happens on the resident's own phone. The position is asked
 * for once, when they press the button, is held in React state for as long as
 * the tab is open, and is never written to storage or sent to the server. The
 * server sends outlet coordinates out; nothing about where the resident is
 * comes back. That is deliberate: a residents' card that quietly accumulated a
 * record of who walked past which premises would be a worse thing than the
 * problem it set out to solve.
 *
 * This is foreground only. It cannot tell a resident they are walking past an
 * outlet right now, because a web app gets no location while it is closed. That
 * needs a native app and is a separate decision.
 */

export type NearbyStatus = "idle" | "asking" | "on" | "denied" | "failed" | "unsupported";

export interface Nearby {
  status: NearbyStatus;
  position: Point | null;
  /** Ask the browser for a one-shot fix. Only ever call this from a tap. */
  request: () => void;
  /** Forget the position and go back to the ordinary list. */
  clear: () => void;
}

export function useNearby(): Nearby {
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [status, setStatus] = useState<NearbyStatus>(supported ? "idle" : "unsupported");
  const [position, setPosition] = useState<Point | null>(null);

  const request = useCallback(() => {
    if (!supported) {
      setStatus("unsupported");
      return;
    }
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setStatus("on");
      },
      (err) => {
        // A denial is a decision, not an error to nag about: it is remembered
        // and the button stops offering.
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "failed");
      },
      // A minute-old fix is fine for ordering a list of pubs, and reusing one
      // avoids waking the GPS every time the tab is opened.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [supported]);

  const clear = useCallback(() => {
    setPosition(null);
    setStatus(supported ? "idle" : "unsupported");
  }, [supported]);

  return { status, position, request, clear };
}
