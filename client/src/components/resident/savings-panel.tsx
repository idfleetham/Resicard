import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPounds } from "@/components/resident/format";

interface MonthPoint {
  month: string;
  amount: number;
  count: number;
}

interface TopSaving {
  id: string;
  amount: number;
  at: string;
  offerTitle: string;
  merchantId: string;
  merchantName: string;
}

/** GET /api/savings/mine. Every figure is a floor, never a best guess. */
export interface SavingsSummary {
  currency: string;
  total: number;
  counted: number;
  uncounted: number;
  estimatedPortion: number;
  months: MonthPoint[];
  averageMonthly: number;
  firstAt: string | null;
  membershipPaid: number;
  aheadBy: number;
  top: TopSaving[];
}

/** House chart colours, matching the merchant analytics charts. */
const BUOY = "#E4572E";
const LINE = "#E6E9E8";
const FOAM = "#F2F5F4";
const AXIS_TICK = { fontSize: 12, fill: "#5C6F75" } as const;

/** Whole pounds, no pence: the headline is approximate and should not pretend otherwise. */
function wholePounds(value: number): string {
  return formatPounds(Math.floor(value)).replace(/\.00$/, "");
}

function monthShort(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, (m || 1) - 1, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
}

/** "March", or "March 2025" when it was not this year. */
function sinceLabel(firstAt: string, now: Date = new Date()): string {
  const d = new Date(firstAt);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-GB", { month: "long", year: sameYear ? undefined : "numeric" });
}

/**
 * The line that argues for the renewal: what they have saved set against what
 * the membership has actually cost them. No nagging when they are not yet ahead.
 */
function renewalLine(data: SavingsSummary): string {
  if (data.membershipPaid <= 0) return "Your membership has cost you nothing so far.";
  if (data.aheadBy > 0) return `That is ${formatPounds(data.aheadBy)} more than your membership has cost you.`;
  const toGo = Math.abs(data.aheadBy);
  return `Your membership has cost you ${formatPounds(data.membershipPaid)}, so there is ${formatPounds(toGo)} to go.`;
}

function honestyNote(uncounted: number): string {
  const base = "These are estimates based on typical prices at each outlet.";
  if (uncounted <= 0) return base;
  const plural = uncounted === 1 ? "redemption had" : "redemptions had";
  return `${base} ${uncounted} ${plural} no price to work from, so the real figure is higher.`;
}

function MonthTooltip({ active, payload }: { active?: boolean; payload?: { payload: MonthPoint }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="bg-white rounded-xl border border-[#E6E9E8] px-3 py-2 text-xs text-sea">
      <p className="font-bold">{monthShort(row.month)}</p>
      <p className="mt-1">{formatPounds(row.amount)} saved</p>
    </div>
  );
}

function MonthlyChart({ months }: { months: MonthPoint[] }) {
  return (
    <div className="bg-white rounded-2xl p-5">
      <h3 className="font-display font-bold text-base tracking-[-0.02em] text-sea">Month by month</h3>
      <div className="h-44 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="26%">
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="month" tickFormatter={monthShort} tick={AXIS_TICK} axisLine={{ stroke: LINE }} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => `£${v}`} />
            <Tooltip cursor={{ fill: FOAM }} content={<MonthTooltip />} />
            <Bar dataKey="amount" fill={BUOY} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopSavings({ items }: { items: TopSaving[] }) {
  return (
    <div className="bg-white rounded-2xl divide-y divide-[#E6E9E8] overflow-hidden">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/outlets/${item.merchantId}`}
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFBFB] active:bg-foam"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold truncate leading-tight text-sea">{item.offerTitle}</span>
            <span className="block text-xs text-slate-brand truncate mt-0.5">{item.merchantName}</span>
          </span>
          <span className="font-display font-extrabold text-base tabular-nums shrink-0 text-[#1F8A5B]">
            {formatPounds(item.amount)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function Placeholder() {
  return <div className="bg-white rounded-2xl p-5 animate-pulse h-20" />;
}

/**
 * What being a resident has been worth in pounds. It sits at the top of the
 * Activity tab because it is the answer to "should I keep paying for this".
 */
export function SavingsPanel() {
  const { data, isLoading } = useQuery<SavingsSummary>({ queryKey: ["/api/savings/mine"] });

  if (isLoading) return <Placeholder />;
  if (!data) return null;

  if (data.counted === 0) {
    return (
      <div className="bg-sand rounded-2xl p-5 text-sm text-sea">
        What you save appears here after your first redemption.
      </div>
    );
  }

  const since = data.firstAt ? sinceLabel(data.firstAt) : "";
  const hasChart = data.months.length > 1;

  return (
    <div className="space-y-3">
      <div className="bg-sea text-foam rounded-2xl p-5">
        <p className="font-display font-extrabold text-[42px] leading-none tracking-[-0.03em] tabular-nums">
          About {wholePounds(data.total)} saved
        </p>
        {since && <p className="text-sm text-[#F2F5F4]/70 mt-2">since {since}</p>}
        <p className="text-sm font-semibold mt-3">{formatPounds(data.averageMonthly)} a month on average</p>
        <p className="text-sm text-[#F2F5F4]/80 mt-3 pt-3 border-t border-[#F2F5F4]/15">{renewalLine(data)}</p>
      </div>

      {hasChart ? (
        <MonthlyChart months={data.months} />
      ) : (
        <div className="bg-white rounded-2xl p-5">
          <p className="text-sm text-sea font-semibold">{formatPounds(data.total)} this month</p>
          <p className="text-xs text-slate-brand mt-1">
            The month by month chart appears once there is more than a month of history.
          </p>
        </div>
      )}

      {data.top.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-sea px-1">Best savings</p>
          <TopSavings items={data.top} />
        </div>
      )}

      <p className="text-slate-brand text-xs px-1">{honestyNote(data.uncounted)}</p>
    </div>
  );
}
