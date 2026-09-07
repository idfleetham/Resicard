import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPounds, formatTime } from "@/components/resident/format";
import type { AdminRedemption } from "./types";

export default function RedemptionsTable() {
  const { data: rows = [], isLoading } = useQuery<AdminRedemption[]>({ queryKey: ["/api/admin/redemptions"] });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Latest redemptions</CardTitle>
        <p className="text-sm text-slate-500 mt-1">The most recent 200 across all outlets.</p>
      </CardHeader>
      <CardContent className="p-0 sm:p-4 sm:pt-0">
        {isLoading ? (
          <div className="p-4 animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}</div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No redemptions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Outlet</TableHead>
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
                    <TableCell>{r.merchantName}</TableCell>
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
