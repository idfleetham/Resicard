import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/components/resident/format";
import { Pill, SectionTitle, TD, TH, TR } from "@/components/merchant/portal-ui";
import { monthLabel, pounds, type MerchantCliff, type ResidentCliff, type UpcomingRenewal } from "./types";

const PLAN_LABELS: Record<UpcomingRenewal["plan"], string> = { individual: "Individual", household: "Household", standard: "Standard", insight: "Insight" };

function Card({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5">
      <div className="mb-3">
        <SectionTitle>{title}</SectionTitle>
        <p className="text-xs text-slate-brand mt-1">{note}</p>
      </div>
      <div className="overflow-x-auto -mx-5 px-5">{children}</div>
    </div>
  );
}

function ResidentCliffs({ rows }: { rows: ResidentCliff[] }) {
  const visible = rows.filter((r) => r.count > 0);
  if (visible.length === 0) return <p className="py-6 text-center text-sm text-slate-brand">No memberships expire in the next 12 months.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#E6E9E8] hover:bg-transparent">
          <TableHead className={TH}>Month</TableHead>
          <TableHead className={`${TH} text-right`}>Count</TableHead>
          <TableHead className={`${TH} text-right`}>Individual</TableHead>
          <TableHead className={`${TH} text-right`}>Household</TableHead>
          <TableHead className={`${TH} text-right`}>£</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((r) => (
          <TableRow key={r.month} className={TR}>
            <TableCell className={`${TD} font-bold whitespace-nowrap`}>{monthLabel(r.month)}</TableCell>
            <TableCell className={`${TD} text-right`}>
              {r.count}
              {r.notRenewing > 0 && <span className="block text-[11px] leading-tight text-slate-brand whitespace-nowrap">of which {r.notRenewing} not renewing</span>}
            </TableCell>
            <TableCell className={`${TD} text-right`}>{r.individual}</TableCell>
            <TableCell className={`${TD} text-right`}>{r.household}</TableCell>
            <TableCell className={`${TD} text-right`}>{pounds(r.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MerchantCliffs({ rows }: { rows: MerchantCliff[] }) {
  const visible = rows.filter((r) => r.count > 0);
  if (visible.length === 0) return <p className="py-6 text-center text-sm text-slate-brand">No business plans are due to renew.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#E6E9E8] hover:bg-transparent">
          <TableHead className={TH}>Month</TableHead>
          <TableHead className={`${TH} text-right`}>Renewals</TableHead>
          <TableHead className={`${TH} text-right`}>£</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((r) => (
          <TableRow key={r.month} className={TR}>
            <TableCell className={`${TD} font-bold whitespace-nowrap`}>{monthLabel(r.month)}</TableCell>
            <TableCell className={`${TD} text-right`}>{r.count}</TableCell>
            <TableCell className={`${TD} text-right`}>{pounds(r.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Next30Days({ rows }: { rows: UpcomingRenewal[] }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-slate-brand">Nothing is due in the next 30 days.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#E6E9E8] hover:bg-transparent">
          <TableHead className={TH}>Name</TableHead>
          <TableHead className={TH}>Plan</TableHead>
          <TableHead className={TH}>Date</TableHead>
          <TableHead className={`${TH} text-right`}>£</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={`${r.kind}-${r.subjectId}`} className={TR}>
            <TableCell className={`${TD} font-bold`}>
              <Link href={r.kind === "resident_membership" ? "/admin?tab=users" : "/admin?tab=merchants"} className="hover:underline underline-offset-2">
                {r.name}
              </Link>
            </TableCell>
            <TableCell className={TD}><Pill tone={r.kind === "resident_membership" ? "sea" : "sand"}>{PLAN_LABELS[r.plan]}</Pill></TableCell>
            <TableCell className={`${TD} whitespace-nowrap`}>{formatDate(r.expiresAt)}</TableCell>
            <TableCell className={`${TD} text-right`}>{pounds(r.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface Props {
  residents: ResidentCliff[];
  merchants: MerchantCliff[];
  next30Days: UpcomingRenewal[];
}

/** Renewal cliffs: two month tables side by side, then everything due in the next 30 days. */
export default function CliffsTable({ residents, merchants, next30Days }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Resident expiries" note="Memberships ending each month, valued at current fees.">
          <ResidentCliffs rows={residents} />
        </Card>
        <Card title="Business renewals" note="Paid plans due each month.">
          <MerchantCliffs rows={merchants} />
        </Card>
      </div>
      <Card title="Next 30 days" note="Soonest first. Names open the Users or Businesses tab.">
        <Next30Days rows={next30Days} />
      </Card>
    </div>
  );
}
