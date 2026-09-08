import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatTime } from "@/components/resident/format";
import { Pill, SectionTitle, TD, TH, TR, type PillTone } from "@/components/merchant/portal-ui";
import { apiRequest } from "@/lib/queryClient";
import { pounds, type LedgerEvent } from "./types";

const ACTION_LABELS: Record<LedgerEvent["action"], string> = { started: "Started", renewed: "Renewed", cancelled: "Cancelled", lapsed: "Lapsed" };
const ACTION_TONES: Record<LedgerEvent["action"], PillTone> = { started: "live", renewed: "sea", cancelled: "red", lapsed: "slate" };
const PLAN_LABELS: Record<string, string> = { individual: "Individual", household: "Household", premium: "Standard", standard: "Standard", insight: "Insight" };

async function downloadCsv(): Promise<void> {
  const res = await apiRequest("GET", "/api/admin/revenue/export.csv");
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "resicard-revenue.csv";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** The most recent 200 ledger rows and a CSV export of the full ledger. */
export default function LedgerTable() {
  const { data: rows = [], isLoading } = useQuery<LedgerEvent[]>({ queryKey: ["/api/admin/revenue/events"] });
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadCsv();
    } catch {
      setError("The CSV could not be downloaded. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <SectionTitle>Ledger</SectionTitle>
          <p className="text-xs text-slate-brand mt-1">The last 200 subscription events. The CSV includes up to 1,000.</p>
        </div>
        <Button variant="outline" className="h-12 px-6 bg-white" onClick={onDownload} disabled={downloading}>
          <Download className="h-5 w-5 mr-2" strokeWidth={2} />
          {downloading ? "Preparing" : "Download CSV"}
        </Button>
      </div>
      {error && <p className="text-sm text-[#B5321A] mb-3">{error}</p>}
      {isLoading ? (
        <div className="animate-pulse space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 bg-foam rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-brand">No events yet. Run the backfill to seed the ledger from current memberships.</p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E6E9E8] hover:bg-transparent">
                <TableHead className={TH}>Date</TableHead>
                <TableHead className={TH}>Kind</TableHead>
                <TableHead className={TH}>Name</TableHead>
                <TableHead className={TH}>Plan</TableHead>
                <TableHead className={TH}>Action</TableHead>
                <TableHead className={`${TH} text-right`}>£</TableHead>
                <TableHead className={TH}>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className={TR}>
                  <TableCell className={`${TD} whitespace-nowrap`}>
                    <span className="font-bold">{formatDate(r.createdAt)}</span>
                    <span className="text-xs text-slate-brand ml-2">{formatTime(r.createdAt)}</span>
                  </TableCell>
                  <TableCell className={TD}>
                    <Pill tone={r.kind === "resident_membership" ? "sea" : "sand"}>{r.kind === "resident_membership" ? "Resident" : "Merchant"}</Pill>
                  </TableCell>
                  <TableCell className={TD}>{r.subjectName ?? r.subjectId}</TableCell>
                  <TableCell className={`${TD} text-slate-brand`}>{r.plan ? PLAN_LABELS[r.plan] ?? r.plan : "-"}</TableCell>
                  <TableCell className={TD}><Pill tone={ACTION_TONES[r.action]}>{ACTION_LABELS[r.action]}</Pill></TableCell>
                  <TableCell className={`${TD} text-right`}>{r.amountGbp ? pounds(r.amountGbp) : "-"}</TableCell>
                  <TableCell className={`${TD} text-slate-brand`}>{r.source ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
