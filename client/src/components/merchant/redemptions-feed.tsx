import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPounds, formatTime } from "@/components/resident/format";
import { INPUT, Pill, SectionTitle, TD, TH, TR } from "./portal-ui";

/** One row of GET /api/merchant/redemptions: an offer redemption or a reward claim. */
export interface MerchantRedemption {
  kind: "redemption" | "reward";
  id: string;
  /** Null for a reward claim. */
  offerId: string | null;
  /** The offer title, or the reward name for a claim. */
  offerTitle: string;
  rewardId: string | null;
  pointsSpent: number | null;
  customerAlias: string;
  code: string;
  basketAmount: string | number | null;
  pointsAwarded: number | null;
  redeemedAt: string;
}

function buildUrl(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return `/api/merchant/redemptions${qs ? `?${qs}` : ""}`;
}

/**
 * The period filter was two bare `input type="date"` boxes, and they failed
 * three ways at once. On iOS an empty date input draws nothing at all, so a
 * merchant saw two empty rounded boxes with no hint that they were anything;
 * on desktop Chrome the native calendar button was clipped by the right edge of
 * a narrow column; and the placeholder came out as `mm/dd/yyyy`, because a
 * native date field takes its format from the browser locale and cannot be told
 * otherwise. None of that is fixable while the control stays a bare date input.
 *
 * It is also the wrong question. A merchant wants last week or last month, not
 * the third to the eleventh, so the presets are the control and a specific range
 * is the exception behind "Custom" — where two empty date fields are understood,
 * because you have just asked for them.
 */
const PRESETS = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All", days: null },
] as const;

type PeriodKey = (typeof PRESETS)[number]["key"] | "custom";

/** YYYY-MM-DD in the merchant's own timezone, which is what the API expects. */
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function presetFrom(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return isoDay(d);
}

/**
 * Says in words what is on screen. A native date field shows the browser's
 * format, which is `mm/dd/yyyy` for anyone on a US locale, so the range is
 * restated here in UK order where we control it.
 */
function describePeriod(period: PeriodKey, from: string, to: string): string {
  if (period === "all") return "Showing everything.";
  if (period !== "custom") {
    const preset = PRESETS.find((p) => p.key === period);
    return `Showing the last ${preset?.label ?? ""}.`;
  }
  if (!from && !to) return "Pick a start and an end date.";
  if (from && !to) return `Showing ${formatDate(from)} to today.`;
  if (!from && to) return `Showing everything up to ${formatDate(to)}.`;
  return `Showing ${formatDate(from)} to ${formatDate(to)}.`;
}

export default function RedemptionsFeed() {
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const preset = PRESETS.find((p) => p.key === period);
  const from = period === "custom" ? customFrom : preset?.days ? presetFrom(preset.days) : "";
  const to = period === "custom" ? customTo : "";
  const { data: rows = [], isLoading, dataUpdatedAt } = useQuery<MerchantRedemption[]>({
    queryKey: [buildUrl(from, to)],
    refetchInterval: 30_000,
    staleTime: 0,
  });

  return (
    <div className="bg-white rounded-2xl border border-hairline p-5">
      <div className="mb-4">
        <SectionTitle>Redemptions</SectionTitle>
        <p className="text-xs text-slate-brand mt-1">
          Updates every 30 seconds. Residents show the code on their green screen.
          {dataUpdatedAt ? ` Last updated ${formatTime(new Date(dataUpdatedAt))}.` : ""}
        </p>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Period">
          {[...PRESETS, { key: "custom" as const, label: "Custom" }].map((p) => {
            const on = period === p.key;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={on}
                onClick={() => setPeriod(p.key)}
                className={`h-9 px-4 rounded-full text-sm font-bold transition-colors ${
                  on ? "bg-sea text-foam" : "bg-white border border-hairline text-sea hover:bg-mist"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Stacked on a phone, side by side from sm. Two columns at 390px leaves
            about 145px a field, and a native date input needs its value and its
            calendar button in that space: the button ends up sliced by the edge
            of the box. */}
        {period === "custom" && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:flex sm:w-auto">
            <div className="min-w-0 sm:w-44">
              <Label htmlFor="from" className="text-xs text-slate-brand">From</Label>
              <Input
                id="from"
                type="date"
                max={customTo || undefined}
                className={`${INPUT} mt-1 w-full pr-2`}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div className="min-w-0 sm:w-44">
              <Label htmlFor="to" className="text-xs text-slate-brand">To</Label>
              <Input
                id="to"
                type="date"
                min={customFrom || undefined}
                className={`${INPUT} mt-1 w-full pr-2`}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-slate-brand mt-2">{describePeriod(period, from, to)}</p>
      </div>
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-brand">No redemptions in this period.</p>
      ) : (
        <>
        {/* A seven-column table is unreadable on a phone: the offer title wraps
            to three lines and the code falls off the edge. Below sm each
            redemption is a card instead. */}
        <ul className="sm:hidden divide-y divide-[#E6E9E8]">
          {rows.map((r) => (
            <li key={r.id} className="py-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-sea leading-tight">{r.offerTitle}</p>
                <p className="text-xs text-slate-brand mt-1">
                  {formatTime(r.redeemedAt)} · {formatDate(r.redeemedAt)} · {r.customerAlias}
                </p>
                <p className="text-xs text-slate-brand mt-1">
                  {r.kind === "reward"
                    ? `${r.pointsSpent ?? 0} points spent`
                    : `${r.basketAmount ? formatPounds(r.basketAmount) : "No bill entered"}${r.pointsAwarded ? ` · +${r.pointsAwarded} points` : ""}`}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                {r.kind === "reward" ? <Pill tone="sand">Reward</Pill> : <Pill tone="sea">Offer</Pill>}
                <span className="font-mono text-xs tracking-wider text-sea">{r.code}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden sm:block overflow-x-auto -mx-5 px-5">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E6E9E8] hover:bg-transparent">
                <TableHead className={TH}>When</TableHead>
                <TableHead className={TH}>Kind</TableHead>
                <TableHead className={TH}>Offer</TableHead>
                <TableHead className={TH}>Customer</TableHead>
                <TableHead className={TH}>Code</TableHead>
                <TableHead className={`${TH} text-right`}>Basket</TableHead>
                <TableHead className={`${TH} text-right`}>Points earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className={TR}>
                  <TableCell className={`${TD} whitespace-nowrap`}>
                    <span className="font-bold">{formatTime(r.redeemedAt)}</span>
                    <span className="text-xs text-slate-brand ml-2">{formatDate(r.redeemedAt)}</span>
                  </TableCell>
                  <TableCell className={TD}>
                    {r.kind === "reward" ? <Pill tone="sand">Reward</Pill> : <Pill tone="sea">Offer</Pill>}
                  </TableCell>
                  <TableCell className={TD}>{r.offerTitle}</TableCell>
                  <TableCell className={`${TD} text-slate-brand`}>{r.customerAlias}</TableCell>
                  <TableCell className={`${TD} font-mono tracking-wider`}>{r.code}</TableCell>
                  <TableCell className={`${TD} text-right whitespace-nowrap`}>
                    {r.kind === "reward" ? `${r.pointsSpent ?? 0} points spent` : r.basketAmount ? formatPounds(r.basketAmount) : "-"}
                  </TableCell>
                  <TableCell className={`${TD} text-right`}>{r.kind === "reward" ? "-" : r.pointsAwarded || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}
    </div>
  );
}
