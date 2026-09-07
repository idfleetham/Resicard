import { cn } from "@/lib/utils";

type Tone = "sea" | "white";

const COLOURS = {
  sea: { ring: "#0F3B47", text: "#0F3B47", buoy: "#E4572E" },
  white: { ring: "#F2F5F4", text: "#F2F5F4", buoy: "#E4572E" },
};

/** The Resicard mark: a horizon in a circle with one buoy. */
export function Mark({ size = 24, tone = "sea", className }: { size?: number; tone?: Tone; className?: string }) {
  const c = COLOURS[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="27" stroke={c.ring} strokeWidth="5" />
      <path d="M5.68 38 A 27 27 0 0 0 58.32 38 Z" fill={c.ring} />
      <circle cx="44" cy="22" r="7" fill={c.buoy} />
    </svg>
  );
}

/** Mark plus wordmark. `size` is the mark height in px; the wordmark scales with it. */
export function Logo({ size = 28, tone = "sea", className }: { size?: number; tone?: Tone; className?: string }) {
  const c = COLOURS[tone];
  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap: size * 0.32 }}>
      <Mark size={size} tone={tone} />
      <span
        className="font-display font-extrabold leading-none"
        style={{ fontSize: size * 0.95, letterSpacing: "-0.03em", color: c.text }}
      >
        resicard
      </span>
    </span>
  );
}
