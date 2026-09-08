import { cn } from "@/lib/utils";

type Tone = "sea" | "white";

const COLOURS = {
  sea: { ring: "#0F3B47", text: "#0F3B47", buoy: "#E4572E" },
  white: { ring: "#F2F5F4", text: "#F2F5F4", buoy: "#E4572E" },
};

/**
 * The seal, as one path with `fillRule="evenodd"`: the 18-point scallop, a ring
 * knocked out at r=15.5 so whatever is behind shows through, and the disc filled
 * again at r=11.5. The knockout is the point. A white-filled ring would pin the
 * mark to a white page; this one sits on the sand panel, on the card photograph
 * and on the buoy orange without redrawing.
 *
 * Eighteen points is the count. Twelve reads as a cog and twenty-six fills in
 * below about 20px, where this still holds.
 *
 * Keep this in step with scripts/brand-assets.mjs, which draws the same geometry
 * for the files in client/public/brand.
 */
const SEAL = "M32.00 -0.60L36.76 5.02L43.15 1.37L45.70 8.27L52.95 7.03L52.99 14.39L60.23 15.70L57.75 22.63L64.10 26.34L59.40 32.00L64.10 37.66L57.75 41.37L60.23 48.30L52.99 49.61L52.95 56.97L45.70 55.73L43.15 62.63L36.76 58.98L32.00 64.60L27.24 58.98L20.85 62.63L18.30 55.73L11.05 56.97L11.01 49.61L3.77 48.30L6.25 41.37L-0.10 37.66L4.60 32.00L-0.10 26.34L6.25 22.63L3.77 15.70L11.01 14.39L11.05 7.03L18.30 8.27L20.85 1.37L27.24 5.02L32.00 -0.60ZM16.50 32a15.5 15.5 0 1 0 31.00 0a15.5 15.5 0 1 0 -31.00 0ZM20.50 32a11.5 11.5 0 1 0 23.00 0a11.5 11.5 0 1 0 -23.00 0Z";

/** The scallop tips reach 32.6, so the box is padded by a unit or they clip. */
const MARK_VIEWBOX = "-1 -1 66 66";

/** The Resicard mark: a seal, because residency here is proved. */
export function Mark({ size = 24, tone = "sea", className }: { size?: number; tone?: Tone; className?: string }) {
  const c = COLOURS[tone];
  return (
    <svg width={size} height={size} viewBox={MARK_VIEWBOX} fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d={SEAL} fill={c.ring} />
      <circle cx="32" cy="32" r="7.5" fill={c.buoy} />
    </svg>
  );
}

/**
 * The buoy appears exactly once in any lockup. If the seal is present the buoy
 * lives in the seal and the word beside it is plain; if the word stands alone the
 * buoy moves to the dot on the i.
 *
 * Two orange dots an inch apart compete rather than compound, and in the stacked
 * lockup they sit vertically aligned, so it reads as a repeat rather than as a
 * system. Hence one component with two states rather than two logos.
 *
 * The dotted state is drawn rather than typed: a font's own tittle cannot be
 * coloured separately, so it is a positioned disc sized in ems against the face
 * at our tracking. If the display face or the tracking changes, check this.
 */
function Word({ size, colour, dotted }: { size: number; colour: string; dotted: boolean }) {
  // The plain state stays a single text node. Splitting the word to hang the dot
  // off the i puts an inline-block boundary either side of it, which drops the
  // kerning pairs across that boundary, so the split only happens where the dot
  // needs it.
  return (
    <span
      className="font-display font-extrabold leading-none relative inline-block whitespace-nowrap"
      style={{ fontSize: size, letterSpacing: "-0.03em", color: colour }}
    >
      {dotted ? (
        <>
          res
          <span className="relative inline-block">
            i
            <span
              aria-hidden="true"
              className="absolute rounded-full"
              style={{
                width: "0.22em",
                height: "0.22em",
                left: "50%",
                top: "0.055em",
                transform: "translateX(-50%)",
                background: COLOURS.sea.buoy,
              }}
            />
          </span>
          card
        </>
      ) : (
        "resicard"
      )}
    </span>
  );
}

/** The wordmark alone, for the places the seal will not go. Carries the buoy. */
export function Wordmark({ size = 28, tone = "sea", className }: { size?: number; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Word size={size} colour={COLOURS[tone].text} dotted />
    </span>
  );
}

/** Mark plus wordmark. `size` is the mark height in px; the wordmark scales with it. */
export function Logo({ size = 28, tone = "sea", className }: { size?: number; tone?: Tone; className?: string }) {
  const c = COLOURS[tone];
  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap: size * 0.32 }}>
      <Mark size={size} tone={tone} />
      <Word size={size * 0.95} colour={c.text} dotted={false} />
    </span>
  );
}
