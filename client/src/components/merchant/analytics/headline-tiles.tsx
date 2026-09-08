import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { AnalyticsHeadline } from "./types";
import { percent } from "./types";

/**
 * The KPI row. Each number is a stat tile rather than a one-bar chart: the number
 * is the chart. Only the redemptions tile carries a change, against the 90 days
 * before this window.
 */

function pounds(value: number): string {
  return `£${value.toFixed(2)}`;
}

function Change({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return <p className="text-xs text-slate-brand mt-1.5">No redemptions in the previous 90 days</p>;
  }
  const delta = Math.round(((current - previous) / previous) * 100);
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const tone = delta > 0 ? "text-[#1F8A5B]" : delta < 0 ? "text-[#B5321A]" : "text-slate-brand";
  return (
    <p className={`text-xs font-bold mt-1.5 flex items-center gap-1 ${tone}`}>
      <Icon size={14} strokeWidth={2} aria-hidden />
      {delta > 0 ? "+" : ""}{delta}%
      <span className="font-normal text-slate-brand">on the previous 90 days</span>
    </p>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5">
      <p className="text-xs text-slate-brand">{label}</p>
      <p className="font-display font-extrabold text-[32px] leading-none tracking-[-0.03em] text-sea mt-2">{value}</p>
      {children}
    </div>
  );
}

export default function HeadlineTiles({ headline }: { headline: AnalyticsHeadline }) {
  const tiles: { label: string; value: string }[] = [
    { label: "Residents", value: String(headline.residents) },
    { label: "New residents", value: String(headline.newResidents) },
    { label: "Returning share", value: percent(headline.returningShare) },
    { label: "Saved as a favourite", value: String(headline.favourites) },
  ];
  if (headline.averageBasket !== null) tiles.push({ label: "Average bill", value: pounds(headline.averageBasket) });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <div className="col-span-2 lg:col-span-1">
        <Tile label="Redemptions" value={String(headline.redemptions)}>
          <Change current={headline.redemptions} previous={headline.redemptionsPrevious} />
        </Tile>
      </div>
      {tiles.map((t) => (
        <Tile key={t.label} label={t.label} value={t.value} />
      ))}
    </div>
  );
}
