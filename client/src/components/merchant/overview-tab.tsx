import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMerchantOffers } from "@/hooks/use-merchant-offers";
import { formatDate } from "@/components/resident/format";
import { Panel, SectionTitle, Tile } from "./portal-ui";
import { usePlan, type PlanInfo } from "./plan-tab";

export interface RedemptionSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  byOffer: { offerId: string; title: string; count: number }[];
}

/** "DD Mon" without the year. */
function shortDate(value: string): string {
  return formatDate(value).replace(/\s\d{4}$/, "");
}

function planLine(plan: PlanInfo | undefined): string {
  if (!plan) return "";
  if (plan.planStatus === "premium") {
    return `Premium plan${plan.planRenewsAt ? ` · renews ${shortDate(plan.planRenewsAt)}` : ""}`;
  }
  return "Free plan";
}

function planNote(plan: PlanInfo | undefined): string {
  if (!plan) return "";
  return plan.planStatus === "premium"
    ? "Unlimited live offers, loyalty programme and analytics."
    : `${plan.liveOfferCount} of ${plan.freeLiveOfferLimit} live offers. Premium adds unlimited offers, loyalty and analytics.`;
}

export default function OverviewTab({ onGoTo }: { onGoTo: (tab: string) => void }) {
  const { data: summary } = useQuery<RedemptionSummary>({ queryKey: ["/api/merchant/redemptions/summary"] });
  const { data: plan } = usePlan();
  const { data: offers = [] } = useMerchantOffers();
  const liveOffers = offers.filter((o) => o.active && !o.archived);
  const top = [...(summary?.byOffer ?? [])].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="space-y-5">
      {liveOffers.length === 0 && (
        <div className="bg-sand rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertCircle className="h-6 w-6 text-sea shrink-0" strokeWidth={2} />
          <div className="flex-1">
            <p className="font-bold text-sea">You have no live offer</p>
            <p className="text-sm text-sea">Residents who scan your code will see nothing to redeem.</p>
          </div>
          <Button variant="buoy" className="h-12 px-6 shrink-0" onClick={() => onGoTo("offers")}>Add an offer</Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Today" value={summary?.today} />
        <Tile label="This week" value={summary?.thisWeek} />
        <Tile label="This month" value={summary?.thisMonth} />
        <Tile label="All time" value={summary?.allTime} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Panel>
          <SectionTitle>Most redeemed</SectionTitle>
          {top.length === 0 ? (
            <p className="text-sm text-slate-brand mt-3">No redemptions yet.</p>
          ) : (
            <ol className="mt-3 divide-y divide-[#E6E9E8]">
              {top.map((o, i) => (
                <li key={o.offerId} className="flex items-center justify-between h-12 gap-3">
                  <span className="text-sea truncate">
                    <span className="text-slate-brand mr-2 text-sm">{i + 1}.</span>
                    {o.title}
                  </span>
                  <span className="font-display font-extrabold text-lg">{o.count}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <div className="bg-sand rounded-2xl p-5 flex flex-col gap-4">
          <SectionTitle>Plan</SectionTitle>
          <div className="flex-1">
            <p className="font-bold text-sea">{planLine(plan) || "Loading plan details."}</p>
            <p className="text-sm text-sea mt-1">{planNote(plan)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-12 px-6 bg-white" onClick={() => onGoTo("plan")}>Plan details</Button>
            <Button variant="outline" className="h-12 px-6 bg-white" onClick={() => onGoTo("qr")}>Print QR poster</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
