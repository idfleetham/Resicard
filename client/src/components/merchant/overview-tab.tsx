import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMerchantOffers } from "@/hooks/use-merchant-offers";
import { formatDate } from "@/components/resident/format";
import { Panel, SectionTitle, Tile } from "./portal-ui";
import { usePlan, type PlanInfo } from "./plan-tab";
import { MERCHANT_PLAN_NAMES } from "@/components/pricing/plan-features";

export interface RedemptionSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  rewardsAllTime: number;
  rewardsThisMonth: number;
  favourites: number;
  byOffer: { offerId: string; title: string; count: number }[];
}

/** "DD Mon" without the year. */
function shortDate(value: string): string {
  return formatDate(value).replace(/\s\d{4}$/, "");
}

function planLine(plan: PlanInfo | undefined): string {
  if (!plan) return "";
  const name = `${MERCHANT_PLAN_NAMES[plan.planStatus]} plan`;
  if (plan.planStatus === "free") return name;
  return `${name}${plan.planRenewsAt ? ` · renews ${shortDate(plan.planRenewsAt)}` : ""}`;
}

function planNote(plan: PlanInfo | undefined): string {
  if (!plan) return "";
  if (plan.planStatus === "insight") return "Unlimited live offers, the loyalty programme, analytics and town benchmarks.";
  if (plan.planStatus === "standard") return "Unlimited live offers and the loyalty programme. Insight adds analytics and town benchmarks.";
  return `${plan.liveOfferCount} of ${plan.freeLiveOfferLimit} live offers. Standard adds unlimited offers and the loyalty programme.`;
}

export default function OverviewTab({ onGoTo }: { onGoTo: (tab: string) => void }) {
  const { data: summary } = useQuery<RedemptionSummary>({ queryKey: ["/api/merchant/redemptions/summary"] });
  const { data: plan } = usePlan();
  const { data: offers = [] } = useMerchantOffers();
  const liveOffers = offers.filter((o) => o.active && !o.archived);
  const top = [...(summary?.byOffer ?? [])].sort((a, b) => b.count - a.count).slice(0, 5);
  const showRewards = Boolean(plan?.features.loyalty);

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

      <div className={`grid grid-cols-2 gap-3 ${showRewards ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
        <Tile label="Today" value={summary?.today} />
        <Tile label="This week" value={summary?.thisWeek} />
        <Tile label="This month" value={summary?.thisMonth} />
        <Tile label="All time" value={summary?.allTime} />
        <Tile label="Favourites" value={summary?.favourites} note="Residents who have starred you" />
        {showRewards && (
          <Tile
            label="Rewards claimed"
            value={summary ? `${summary.rewardsThisMonth}` : undefined}
            note={summary ? `${summary.rewardsAllTime} all time` : undefined}
          />
        )}
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
