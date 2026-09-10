import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Small shared pieces for the merchant, loyalty and admin screens so they match
 * the resident dashboard: segmented pill tabs, white cards on the mist ground,
 * number tiles, status pills and the table header/row treatment.
 */

export const TAB_LIST = "h-12 p-1 rounded-full bg-white inline-flex w-auto";
export const TAB_TRIGGER =
  "h-10 px-4 sm:px-6 rounded-full text-[15px] font-bold text-sea whitespace-nowrap data-[state=active]:bg-sea data-[state=active]:text-foam data-[state=active]:shadow-none";

/**
 * Wraps a TabsList so it scrolls sideways on phones instead of wrapping. The
 * right-hand fade matters: a pill sliced off by the screen edge reads as a broken
 * layout, while a fade reads as "there is more this way".
 */
export function TabScroller({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(true);

  const check = () => {
    const el = scroller.current;
    if (!el) return;
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  };

  useEffect(() => {
    check();
    // The active pill can start off screen, so bring it into view on first paint.
    const active = scroller.current?.querySelector('[data-state="active"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    // min-w-0 so that when this sits beside the outlet name it scrolls rather
    // than pushing the row wider than the page.
    <div className="relative -mx-5 lg:mx-0 mb-4 min-w-0">
      <div
        ref={scroller}
        onScroll={check}
        className="overflow-x-auto px-5 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {!atEnd && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10"
          style={{ background: "linear-gradient(90deg, rgba(231,237,236,0) 0%, #E7EDEC 70%)" }}
        />
      )}
    </div>
  );
}

/**
 * Sub-tabs inside a tab (Settings is Business / Team / Plan). Deliberately
 * quieter than the main row — smaller, sand rather than sea when active — so a
 * screen never looks like it has two tab bars of equal weight.
 */
export const SUBTAB_LIST = "h-11 p-1 rounded-full bg-white border border-hairline inline-flex w-auto";
export const SUBTAB_TRIGGER =
  "h-9 px-4 sm:px-5 rounded-full text-sm font-bold text-slate-brand whitespace-nowrap data-[state=active]:bg-sand data-[state=active]:text-sea data-[state=active]:shadow-none";

/**
 * The one card treatment. White on mist with a hairline edge: without the edge
 * the panels dissolve into the ground on a phone screen in daylight, which is
 * where a publican actually reads this.
 */
export const CARD = "bg-white rounded-2xl border border-hairline";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${CARD} p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`font-display font-bold text-2xl tracking-[-0.02em] text-sea ${className}`}>{children}</h2>;
}

/**
 * A number tile. `lead` marks the one figure on the screen worth landing on and
 * gives it the sea ground, so a grid of tiles has somewhere for the eye to go
 * instead of six identical white boxes, four of which usually read zero.
 */
export function Tile({
  label,
  value,
  note,
  lead = false,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  lead?: boolean;
}) {
  const ground = lead ? "bg-sea border-sea" : CARD;
  const labelInk = lead ? "text-[#B7CBD1]" : "text-slate-brand";
  const valueInk = lead ? "text-foam" : "text-sea";
  return (
    <div className={`${lead ? "rounded-2xl border" : ""} ${ground} p-4`}>
      <p className={`text-xs ${labelInk}`}>{label}</p>
      <p className={`font-display font-extrabold text-[30px] leading-none tracking-[-0.03em] ${valueInk} mt-1.5`}>
        {value ?? "-"}
      </p>
      {note && <p className={`text-xs ${labelInk} mt-1`}>{note}</p>}
    </div>
  );
}

export type PillTone = "live" | "sand" | "slate" | "sea" | "buoy" | "red";

const PILL_TONES: Record<PillTone, string> = {
  live: "bg-[#E4F3EB] text-[#1F8A5B]",
  sand: "bg-sand text-sea",
  slate: "bg-foam text-slate-brand",
  sea: "bg-sea text-foam",
  buoy: "bg-buoy text-white",
  red: "bg-[#FBE9E7] text-[#B5321A]",
};

export function Pill({ tone = "slate", children, className = "" }: { tone?: PillTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-xs font-bold whitespace-nowrap ${PILL_TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Table header cell: small caps in slate. */
export const TH = "h-10 px-4 text-left align-middle text-[11px] font-bold uppercase tracking-[0.08em] text-slate-brand";
/** Table row: 48px, hairline divider. */
export const TR = "h-12 border-b border-[#E6E9E8] last:border-0 hover:bg-[#FAFBFB]";
export const TD = "px-4 py-2 align-middle text-sm text-sea";

/** Outline button styling for a destructive secondary action. */
export const DESTRUCTIVE_OUTLINE = "border-[#B5321A] text-[#B5321A] bg-white hover:bg-[#FBE9E7] hover:text-[#B5321A]";

export const INPUT = "h-12 rounded-xl";

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="bg-sand rounded-2xl p-5 text-sm text-sea">{children}</div>;
}

export function Skeleton({ className = "h-28" }: { className?: string }) {
  return <div className={`${CARD} animate-pulse ${className}`} />;
}
