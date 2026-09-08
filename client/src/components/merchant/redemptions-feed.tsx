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

export default function RedemptionsFeed() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: rows = [], isLoading, dataUpdatedAt } = useQuery<MerchantRedemption[]>({
    queryKey: [buildUrl(from, to)],
    refetchInterval: 30_000,
    staleTime: 0,
  });

  return (
    <div className="bg-white rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between mb-4">
        <div>
          <SectionTitle>Redemptions</SectionTitle>
          <p className="text-xs text-slate-brand mt-1">
            Updates every 30 seconds. Residents show the code on their green screen.
            {dataUpdatedAt ? ` Last updated ${formatTime(new Date(dataUpdatedAt))}.` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <div>
            <Label htmlFor="from" className="text-xs text-slate-brand">From</Label>
            <Input id="from" type="date" className={`${INPUT} mt-1`} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="to" className="text-xs text-slate-brand">To</Label>
            <Input id="to" type="date" className={`${INPUT} mt-1`} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-brand">No redemptions in this period.</p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
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
      )}
    </div>
  );
}
