import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionTitle } from "../portal-ui";
import { AXIS_TICK, FOAM, LINE, SERIES_1, SERIES_2, weekLabel, yAxisLabel, type WeekPoint } from "./types";

/**
 * The period's redemptions by week, with new residents alongside. Two grouped columns
 * rather than a stack, because the reader's question is "how many of this week's
 * visits came from someone new", which needs both bars measured from the baseline.
 */

interface Row extends WeekPoint { label: string }

function WeekTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="bg-white rounded-xl border border-[#E6E9E8] px-3 py-2 text-xs text-sea">
      <p className="font-bold">Week of {weekLabel(row.weekStart)}</p>
      <p className="mt-1 flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES_1 }} /> Redemptions {row.redemptions}</p>
      <p className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES_2 }} /> New residents {row.newResidents}</p>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; colour: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-brand">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: i.colour }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export default function WeeklyChart({ byWeek }: { byWeek: WeekPoint[] }) {
  const rows: Row[] = byWeek.map((w) => ({ ...w, label: weekLabel(w.weekStart) }));
  const empty = rows.every((r) => r.redemptions === 0);

  return (
    <div className="bg-white rounded-2xl border border-hairline p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <SectionTitle>Redemptions by week</SectionTitle>
          <p className="text-xs text-slate-brand mt-1">
            {rows.length} week{rows.length === 1 ? "" : "s"}, Monday to Sunday.
          </p>
        </div>
        <Legend
          items={[
            { label: "Redemptions", colour: SERIES_1 },
            { label: "New residents", colour: SERIES_2 },
          ]}
        />
      </div>
      {empty ? (
        <p className="text-sm text-slate-brand">No redemptions yet in this window.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="26%" barGap={2}>
              <CartesianGrid stroke={LINE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: LINE }} tickLine={false} interval={1} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={64} label={yAxisLabel("Redemptions")} />
              <Tooltip cursor={{ fill: FOAM }} content={<WeekTooltip />} />
              <Bar dataKey="redemptions" fill={SERIES_1} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="newResidents" fill={SERIES_2} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
