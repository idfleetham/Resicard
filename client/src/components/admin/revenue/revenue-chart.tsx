import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionTitle } from "@/components/merchant/portal-ui";
import type { ForecastMonth } from "./forecast";
import { monthLabel, pounds, type HistoryMonth } from "./types";

const SEA = "#0F3B47";
const SAND = "#E6D9BF";
const LINE = "#E6E9E8";
const SLATE = "#5C6F75";
const FOAM = "#F2F5F4";

interface Point {
  month: string;
  residents: number;
  merchants: number;
  total: number;
  forecast: boolean;
}

function toPoints(history: HistoryMonth[], forecast: ForecastMonth[]): Point[] {
  const actual = history.map((h) => ({ month: h.month, residents: h.residents, merchants: h.merchants, total: h.total, forecast: false }));
  const future = forecast.map((f) => ({ month: f.month, residents: f.residents, merchants: f.merchants, total: f.total, forecast: true }));
  return [...actual, ...future];
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="bg-white rounded-xl border border-[#E6E9E8] px-3 py-2 text-xs text-sea shadow-none">
      <p className="font-bold">
        {monthLabel(p.month)}
        {p.forecast && <span className="ml-2 font-normal text-slate-brand">forecast</span>}
      </p>
      <p className="mt-1 flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sea" /> Residents {pounds(p.residents)}</p>
      <p className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sand" /> Merchants {pounds(p.merchants)}</p>
      <p className="mt-1 text-slate-brand">Total {pounds(p.total)}</p>
    </div>
  );
}

/**
 * One bar chart: 12 months of amounts collected (stacked residents + merchants)
 * followed by 12 forecast months. Forecast bars are lighter with a sea outline and
 * a dashed divider marks where the forecast begins.
 */
export default function RevenueChart({ history, forecast }: { history: HistoryMonth[]; forecast: ForecastMonth[] }) {
  const points = toPoints(history, forecast);
  const firstForecast = points.find((p) => p.forecast);
  const lastActual = [...points].reverse().find((p) => !p.forecast);
  const yearOf = (month: string) => month.slice(0, 4);

  return (
    <div className="bg-white rounded-2xl border border-hairline p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <SectionTitle>Collected and forecast</SectionTitle>
          <p className="text-xs text-slate-brand mt-1">
            {lastActual && firstForecast ? `Actual to ${monthLabel(lastActual.month)}, forecast from ${monthLabel(firstForecast.month)}.` : "Amounts collected by month."}
          </p>
        </div>
        <div className="flex gap-4 text-xs text-slate-brand">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sea" /> Residents</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sand" /> Merchants</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-sea bg-white" /> Forecast</span>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 20, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis
              dataKey="month"
              interval={1}
              tick={{ fontSize: 12, fill: SLATE }}
              axisLine={{ stroke: LINE }}
              tickLine={false}
              tickFormatter={(month: string, index: number) => {
                const label = monthLabel(month, false);
                const first = index === 0 || yearOf(points[index - 1]?.month ?? month) !== yearOf(month);
                return first ? `${label} ${yearOf(month).slice(2)}` : label;
              }}
            />
            <YAxis tick={{ fontSize: 12, fill: SLATE }} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => pounds(v)} />
            <Tooltip cursor={{ fill: FOAM }} content={<ChartTooltip />} />
            {firstForecast && (
              <ReferenceLine
                x={firstForecast.month}
                stroke={SLATE}
                strokeDasharray="4 4"
                position="start"
                label={{ value: "Forecast", position: "insideTopLeft", fill: SLATE, fontSize: 12, offset: 6 }}
              />
            )}
            <Bar dataKey="residents" stackId="a" fill={SEA} stroke="#fff" strokeWidth={1} isAnimationActive={false}>
              {points.map((p) => (
                <Cell key={p.month} fill={p.forecast ? "#B9C9CD" : SEA} stroke={p.forecast ? SEA : "#fff"} strokeDasharray={p.forecast ? "3 2" : undefined} />
              ))}
            </Bar>
            <Bar dataKey="merchants" stackId="a" fill={SAND} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {points.map((p) => (
                <Cell key={p.month} fill={p.forecast ? "#F5EFE2" : SAND} stroke={p.forecast ? SEA : "#fff"} strokeDasharray={p.forecast ? "3 2" : undefined} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
