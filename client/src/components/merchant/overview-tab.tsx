import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMerchantOffers } from "@/hooks/use-merchant-offers";
import { formatDate, formatPounds } from "@/components/resident/format";
import type { PlanInfo } from "./plan-tab";

export interface RedemptionSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  byOffer: { offerId: string; title: string; count: number }[];
}

function Tile({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{value ?? "-"}</p>
      </CardContent>
    </Card>
  );
}

function planLine(plan: PlanInfo | undefined): string {
  if (!plan) return "";
  switch (plan.planStatus) {
    case "trial":
      return plan.planRenewsAt
        ? `Free trial until ${formatDate(plan.planRenewsAt)}, then ${formatPounds(plan.monthlyFee)} a month.`
        : `Free trial (${plan.trialDays} days), then ${formatPounds(plan.monthlyFee)} a month.`;
    case "active":
      return `Plan active${plan.planRenewsAt ? `, renews ${formatDate(plan.planRenewsAt)}` : ""}. ${formatPounds(plan.monthlyFee)} a month.`;
    default:
      return "Plan inactive: residents cannot redeem your offers until payment is set up.";
  }
}

export default function OverviewTab({ onGoTo }: { onGoTo: (tab: string) => void }) {
  const { data: summary } = useQuery<RedemptionSummary>({ queryKey: ["/api/merchant/redemptions/summary"] });
  const { data: plan } = useQuery<PlanInfo>({ queryKey: ["/api/merchant/plan"] });
  const { data: offers = [] } = useMerchantOffers();
  const liveOffers = offers.filter((o) => o.active && !o.archived);
  const top = [...(summary?.byOffer ?? [])].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="space-y-5">
      {liveOffers.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">You have no live offer</p>
              <p className="text-sm text-amber-800">Residents who scan your code will see nothing to redeem.</p>
            </div>
            <Button className="h-11" onClick={() => onGoTo("offers")}>Add an offer</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Today" value={summary?.today} />
        <Tile label="This week" value={summary?.thisWeek} />
        <Tile label="This month" value={summary?.thisMonth} />
        <Tile label="All time" value={summary?.allTime} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">Most redeemed</CardTitle></CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <p className="text-sm text-slate-500">No redemptions yet.</p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {top.map((o, i) => (
                  <li key={o.offerId} className="flex items-center justify-between py-2">
                    <span className="text-slate-800"><span className="text-slate-400 mr-2">{i + 1}.</span>{o.title}</span>
                    <span className="font-semibold">{o.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">Plan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-700">{planLine(plan) || "Loading plan details."}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="h-11" onClick={() => onGoTo("plan")}>Plan details</Button>
              <Button variant="outline" className="h-11" onClick={() => onGoTo("qr")}>Print QR poster</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
