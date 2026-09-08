import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionTitle } from "../portal-ui";
import { AXIS_TICK, DAY_LABELS, LINE, SEA, monthLabel, percent, type TownBlockData } from "./types";

/**
 * How the town is trading, with the outlet's own 30 days set against the median of
 * its category. Nothing here names another outlet: the comparison is a median
 * across the whole category, and the block is withheld entirely when too few
 * outlets share it.
 */

function Comparison({ town }: { town: TownBlockData }) {
  const top = Math.max(town.yourRedemptions30d, town.medianRedemptions30d, 1);
  const rows = [
    { label: "You", value: town.yourRedemptions30d, className: "bg-sea" },
    { label: `Median ${town.categoryLabel.toLowerCase()}`, value: town.medianRedemptions30d, className: "bg-sand border border-[#D3C09B]" },
  ];
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-sea">{row.label}</p>
            <p className="text-sm font-bold text-sea">{row.value}</p>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-foam overflow-hidden">
            <div className={`h-full rounded-full ${row.className}`} style={{ width: `${Math.max(2, (row.value / top) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BusiestDays({ town }: { town: TownBlockData }) {
  const top = town.busiestDays[0]?.share ?? 0;
  return (
    <ol className="space-y-2">
      {town.busiestDays.map((d) => (
        <li key={d.day} className="flex items-center gap-3">
          <span className="text-sm text-sea w-9 shrink-0">{DAY_LABELS[d.day]}</span>
          <span className="h-2 rounded-full bg-foam flex-1 overflow-hidden">
            <span className="block h-full rounded-full bg-sea" style={{ width: `${top === 0 ? 0 : Math.max(2, (d.share / top) * 100)}%` }} />
          </span>
          <span className="text-sm text-slate-brand w-10 text-right shrink-0">{percent(d.share)}</span>
        </li>
      ))}
    </ol>
  );
}

function GrowthTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-[#E6E9E8] px-3 py-2 text-xs text-sea">
      <p className="font-bold">{label}</p>
      <p className="mt-1">{payload[0].value.toLocaleString("en-GB")} active members</p>
    </div>
  );
}

function MemberGrowth({ town }: { town: TownBlockData }) {
  const rows = town.memberGrowth.map((m) => ({ ...m, label: monthLabel(m.month) }));
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: LINE }} tickLine={false} minTickGap={8} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
          <Tooltip cursor={{ stroke: LINE }} content={<GrowthTooltip />} />
          <Line type="monotone" dataKey="members" stroke={SEA} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5">
      <SectionTitle>{title}</SectionTitle>
      <p className="text-xs text-slate-brand mt-1 mb-4">{note}</p>
      {children}
    </div>
  );
}

export default function TownBlock({ town }: { town: TownBlockData }) {
  return (
    <div className="space-y-3">
      <Card
        title={`You against other ${town.categoryLabel.toLowerCase()}`}
        note={`Redemptions in the last 30 days, against the median of ${town.outletsInCategory} ${town.categoryLabel.toLowerCase()} in the town. No outlet is named.`}
      >
        <Comparison town={town} />
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Busiest days in town" note="Share of all Resicard redemptions across every outlet.">
          <BusiestDays town={town} />
        </Card>
        <Card title="Members in the town" note="Residents redeeming somewhere each month, over 12 months.">
          <MemberGrowth town={town} />
        </Card>
      </div>
    </div>
  );
}
