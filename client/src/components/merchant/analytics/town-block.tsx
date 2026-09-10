import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionTitle } from "../portal-ui";
import { AXIS_TICK, DAY_LABELS, LINE, SERIES_1, SERIES_2, barWidth, monthLabel, percent, type TownBlockData } from "./types";

/**
 * How the town is trading, with the outlet's own 30 days set against a typical
 * outlet in its category. Nothing here names another outlet, and the block is
 * withheld entirely when too few outlets share the category.
 *
 * The comparison figure is a median, not a mean, and the wording says "typical"
 * rather than either word. With five restaurants in a category, one busy Friday
 * outlet drags a mean somewhere no real outlet sits, and a publican told they are
 * "below average" by a number no one in town actually posts has been misled. But
 * "median" is a word that makes people stop reading, so it does not appear on the
 * screen: the note says what was done in plain words instead.
 */

function Comparison({ town }: { town: TownBlockData }) {
  const scale = Math.max(town.yourRedemptions30d, town.medianRedemptions30d, 1);
  const rows = [
    { label: "You", value: town.yourRedemptions30d, colour: SERIES_1 },
    { label: `A typical ${singular(town.categoryLabel)}`, value: town.medianRedemptions30d, colour: SERIES_2 },
  ];
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-sea">{row.label}</p>
            <p className="text-sm font-bold text-sea tabular-nums">{row.value}</p>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-foam overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: barWidth(row.value, scale), backgroundColor: row.colour }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** "Restaurants" -> "restaurant", so the row reads "A typical restaurant". */
function singular(categoryLabel: string): string {
  const lower = categoryLabel.toLowerCase();
  if (lower.endsWith("ies")) return `${lower.slice(0, -3)}y`;
  if (lower.endsWith("ses") || lower.endsWith("shes")) return lower.slice(0, -2);
  if (lower.endsWith("s")) return lower.slice(0, -1);
  return lower;
}

function BusiestDays({ town }: { town: TownBlockData }) {
  const top = town.busiestDays[0]?.share ?? 0;
  return (
    <ol className="space-y-2">
      {town.busiestDays.map((d) => (
        <li key={d.day} className="flex items-center gap-3">
          <span className="text-sm text-sea w-9 shrink-0">{DAY_LABELS[d.day]}</span>
          <span className="h-2 rounded-full bg-foam flex-1 overflow-hidden">
            <span className="block h-full rounded-full" style={{ width: barWidth(d.share, top), backgroundColor: SERIES_1 }} />
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
          <Line type="monotone" dataKey="members" stroke={SERIES_1} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-hairline p-5">
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
        note={`Redemptions in the last 30 days. "Typical" is the middle outlet of the ${town.outletsInCategory} ${town.categoryLabel.toLowerCase()} in the town, so one very busy outlet cannot drag the comparison. No outlet is named.`}
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
