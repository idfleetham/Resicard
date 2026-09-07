import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPounds, formatTime } from "@/components/resident/format";

export interface MerchantRedemption {
  id: string;
  offerId: string;
  offerTitle: string;
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
          <div>
            <CardTitle className="text-lg">Redemptions</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Updates every 30 seconds. Residents show the code on their green screen.
              {dataUpdatedAt ? ` Last updated ${formatTime(new Date(dataUpdatedAt))}.` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <div>
              <Label htmlFor="from" className="text-xs">From</Label>
              <Input id="from" type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs">To</Label>
              <Input id="to" type="date" className="h-11" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-4 sm:pt-0">
        {isLoading ? (
          <div className="p-4 animate-pulse space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No redemptions in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Offer</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Basket</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">{formatTime(r.redeemedAt)}</div>
                      <div className="text-xs text-slate-500">{formatDate(r.redeemedAt)}</div>
                    </TableCell>
                    <TableCell>{r.offerTitle}</TableCell>
                    <TableCell className="text-slate-600">{r.customerAlias}</TableCell>
                    <TableCell className="font-mono tracking-wider">{r.code}</TableCell>
                    <TableCell className="text-right">{r.basketAmount ? formatPounds(r.basketAmount) : "-"}</TableCell>
                    <TableCell className="text-right">{r.pointsAwarded || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
