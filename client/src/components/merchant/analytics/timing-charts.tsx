import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionTitle } from "../portal-ui";
import { AXIS_TICK, DAY_LABELS, FOAM, LINE, SEA, hourLabel, yAxisLabel, type DayPoint, type HourPoint } from "./types";

/**
 * When people redeem: day of the week and hour of the day. One series each, so
 * one colour each and no legend — the card title names the series. Side by side on
 * desktop, stacked on a phone.
 */

function CountTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-[#E6E9E8] px-3 py-2 text-xs text-sea">
      <p className="font-bold">{label}</p>
      <p className="mt-1">{payload[0].value} redemption{payload[0].value === 1 ? "" : "s"}</p>
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

function DayChart({ byDay }: { byDay: DayPoint[] }) {
  const rows = byDay.map((d) => ({ ...d, label: DAY_LABELS[d.day] }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: LINE }} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={64} label={yAxisLabel("Redemptions")} />
          <Tooltip cursor={{ fill: FOAM }} content={<CountTooltip />} />
          <Bar dataKey="redemptions" fill={SEA} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Trading hours only: the quiet overnight hours are dropped so the peak has room. */
function HourChart({ byHour }: { byHour: HourPoint[] }) {
  const busy = byHour.filter((h) => h.redemptions > 0);
  const first = busy.length ? Math.min(...busy.map((h) => h.hour)) : 9;
  const last = busy.length ? Math.max(...busy.map((h) => h.hour)) : 23;
  const rows = byHour.filter((h) => h.hour >= first && h.hour <= last).map((h) => ({ ...h, label: hourLabel(h.hour) }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="18%">
          <CartesianGrid stroke={LINE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: LINE }} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} width={64} label={yAxisLabel("Redemptions")} />
          <Tooltip cursor={{ fill: FOAM }} content={<CountTooltip />} />
          <Bar dataKey="redemptions" fill={SEA} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function TimingCharts({ byDay, byHour }: { byDay: DayPoint[]; byHour: HourPoint[] }) {
  const quiet = byDay.every((d) => d.redemptions === 0);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Card title="Busiest days" note="How many redemptions fell on each weekday. Totals across the last 90 days, not a daily average.">
        {quiet ? <p className="text-sm text-slate-brand">No redemptions yet.</p> : <DayChart byDay={byDay} />}
      </Card>
      <Card title="Busiest hours" note="How many redemptions fell in each hour. Totals across the last 90 days, local time.">
        {quiet ? <p className="text-sm text-slate-brand">No redemptions yet.</p> : <HourChart byHour={byHour} />}
      </Card>
    </div>
  );
}
