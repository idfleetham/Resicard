import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyNote, Skeleton, Tile } from "@/components/merchant/portal-ui";
import RevenueChart from "./revenue-chart";
import ForecastAssumptionsCard from "./forecast-assumptions";
import CliffsTable from "./cliffs-table";
import LedgerTable from "./ledger-table";
import { buildForecast, DEFAULT_ASSUMPTIONS, type ForecastAssumptions } from "./forecast";
import { pounds, type RevenueReport } from "./types";

/** The admin Revenue tab: run rate tiles, the 24-month chart, forecast controls, cliffs and the ledger. */
export default function RevenueTab() {
  const { data, isLoading, isError } = useQuery<RevenueReport>({ queryKey: ["/api/admin/revenue"] });
  const [assumptions, setAssumptions] = useState<ForecastAssumptions>(DEFAULT_ASSUMPTIONS);

  const forecast = useMemo(() => (data ? buildForecast(data.schedule, data.fees, assumptions) : []), [data, assumptions]);
  const expiringAmount = useMemo(() => (data?.cliffs.next30Days ?? []).filter((r) => r.kind === "resident_membership").reduce((s, r) => s + r.amount, 0), [data]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (isError || !data) return <EmptyNote>The revenue figures could not be loaded. Please try again.</EmptyNote>;

  const { now } = data;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label="Monthly run rate" value={pounds(now.runRate.monthly)} note="Business fees plus annual fees over 12" />
        <Tile label="Annual run rate" value={pounds(now.runRate.annual)} note="Monthly run rate times 12" />
        <Tile label="Active residents" value={now.residents.active} note={`${now.residents.individual} individual, ${now.residents.household} household`} />
        <Tile label="Paying businesses" value={now.merchants.paying} note={`${now.merchants.standard} Standard, ${now.merchants.insight} Insight, ${now.merchants.free} Free`} />
        <Tile label="Expiring in 30 days" value={now.residents.expiringIn30Days} note={`${pounds(expiringAmount)} to renew`} />
      </div>

      <RevenueChart history={data.history} forecast={forecast} />
      <ForecastAssumptionsCard value={assumptions} onChange={setAssumptions} />
      <CliffsTable residents={data.cliffs.residents} merchants={data.cliffs.merchants} next30Days={data.cliffs.next30Days} />
      <LedgerTable />
    </div>
  );
}
