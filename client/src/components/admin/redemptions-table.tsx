import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPounds, formatTime } from "@/components/resident/format";
import type { AdminRedemption } from "./types";
import { SectionTitle, TD, TH, TR } from "@/components/merchant/portal-ui";

export default function RedemptionsTable() {
  const { data: rows = [], isLoading } = useQuery<AdminRedemption[]>({ queryKey: ["/api/admin/redemptions"] });

  return (
    <div className="bg-white rounded-2xl border border-hairline p-5">
      <div className="mb-4">
        <SectionTitle>Latest redemptions</SectionTitle>
        <p className="text-xs text-slate-brand mt-1">The most recent 200 across all outlets.</p>
      </div>
      {isLoading ? (
        <div className="animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-brand">No redemptions yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E6E9E8] hover:bg-transparent">
                <TableHead className={TH}>When</TableHead>
                <TableHead className={TH}>Outlet</TableHead>
                <TableHead className={TH}>Offer</TableHead>
                <TableHead className={TH}>Customer</TableHead>
                <TableHead className={TH}>Code</TableHead>
                <TableHead className={`${TH} text-right`}>Basket</TableHead>
                <TableHead className={`${TH} text-right`}>Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className={TR}>
                  <TableCell className={`${TD} whitespace-nowrap`}>
                    <span className="font-bold">{formatTime(r.redeemedAt)}</span>
                    <span className="text-xs text-slate-brand ml-2">{formatDate(r.redeemedAt)}</span>
                  </TableCell>
                  <TableCell className={TD}>{r.merchantName}</TableCell>
                  <TableCell className={TD}>{r.offerTitle}</TableCell>
                  <TableCell className={`${TD} text-slate-brand`}>{r.customerAlias}</TableCell>
                  <TableCell className={`${TD} font-mono tracking-wider`}>{r.code}</TableCell>
                  <TableCell className={`${TD} text-right`}>{r.basketAmount ? formatPounds(r.basketAmount) : "-"}</TableCell>
                  <TableCell className={`${TD} text-right`}>{r.pointsAwarded || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
