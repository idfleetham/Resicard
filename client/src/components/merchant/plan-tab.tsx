import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { OFFERS_KEY } from "@/hooks/use-merchant-offers";
import { PROGRAM_KEY } from "./loyalty/types";
import { errorMessage, formatDate, formatPounds, trialLengthLabel } from "@/components/resident/format";
import { Pill, SectionTitle } from "./portal-ui";
import { PricingLink } from "@/components/pricing/mini-compare";
import {
  MERCHANT_INSIGHT_FEATURES,
  MERCHANT_PLAN_NAMES,
  MERCHANT_STANDARD_FEATURES,
  merchantFreeFeatures,
  type MerchantPlanKey,
} from "@/components/pricing/plan-features";

export type PaidPlanKey = Exclude<MerchantPlanKey, "free">;

export interface PlanOption {
  key: MerchantPlanKey;
  name: string;
  monthlyFee: number;
}

export interface PlanInfo {
  planStatus: MerchantPlanKey;
  planName: string;
  planStartedAt: string | null;
  planRenewsAt: string | null;
  /** True while a paid plan is running on the free trial (nothing paid yet). */
  inTrial: boolean;
  /** When the free trial ends and the first payment is taken. */
  trialEndsAt: string | null;
  /** Trial days this business would get if they upgraded now; 0 once they have paid. */
  trialDaysAvailable: number;
  /** What they pay today; 0 on Free. */
  monthlyFee: number;
  /** All three tiers and their prices, so nothing here hard-codes a fee. */
  plans: PlanOption[];
  currency: string;
  freeLiveOfferLimit: number;
  liveOfferCount: number;
  features: { unlimitedOffers: boolean; loyalty: boolean; analytics: boolean };
}

export const PLAN_KEY = ["/api/merchant/plan"] as const;

const RANK: Record<MerchantPlanKey, number> = { free: 0, standard: 1, insight: 2 };

export function usePlan() {
  return useQuery<PlanInfo>({ queryKey: [...PLAN_KEY] });
}

type ChangeResponse = { url: string } | { planStatus: MerchantPlanKey };
type CancelResponse = { planStatus: "free"; pausedOffers: number };

/** Invalidate everything the plan gates. Exported for the redirect handler in the portal. */
export async function invalidatePlanGated(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: [...PLAN_KEY] });
  await queryClient.invalidateQueries({ queryKey: [...OFFERS_KEY] });
  await queryClient.invalidateQueries({ queryKey: [...PROGRAM_KEY] });
}

function Feature({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-sea">
      <Check className="h-5 w-5 text-sea shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </li>
  );
}

function PlanCard({ title, price, current, features, pill, children }: {
  title: string; price: string; current: boolean; features: string[]; pill?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 flex flex-col gap-4 ${current ? "" : "border border-[#E6E9E8]"}`}>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>{title}</SectionTitle>
        {pill ?? (current && <Pill tone="sea">Current plan</Pill>)}
      </div>
      <p className="font-display font-extrabold text-[32px] leading-none tracking-[-0.03em] text-sea">{price}</p>
      <ul className="space-y-2 flex-1">
        {features.map((f) => <Feature key={f}>{f}</Feature>)}
      </ul>
      {children}
    </div>
  );
}

/** What a paid card says under its button once the business is on it. */
function BillingNote({ plan }: { plan: PlanInfo }) {
  if (plan.inTrial) {
    return (
      <p className="text-xs text-slate-brand">
        Free until {formatDate(plan.trialEndsAt)}, then {formatPounds(plan.monthlyFee)} a month.
      </p>
    );
  }
  return (
    <p className="text-xs text-slate-brand">
      {plan.planRenewsAt ? `Renews ${formatDate(plan.planRenewsAt)}.` : "Billed monthly."}
      {plan.planStartedAt ? ` Started ${formatDate(plan.planStartedAt)}.` : ""}
    </p>
  );
}

/** The next tier up is the one action worth pushing; everything else is a plain outline. */
function PaidCard({ plan, planKey, features, trial, busy, onChange }: {
  plan: PlanInfo;
  planKey: PaidPlanKey;
  features: string[];
  trial: string | null;
  busy: boolean;
  onChange: (target: PaidPlanKey) => void;
}) {
  const current = plan.planStatus;
  const isCurrent = current === planKey;
  const isUpgrade = RANK[planKey] > RANK[current];
  const isNextStep = RANK[planKey] === RANK[current] + 1;
  const fee = plan.plans.find((p) => p.key === planKey)?.monthlyFee ?? 0;
  const startFree = isUpgrade && trial && current === "free";

  return (
    <PlanCard
      title={MERCHANT_PLAN_NAMES[planKey]}
      price={`${formatPounds(fee)} a month`}
      current={isCurrent}
      features={features}
      pill={isCurrent && plan.inTrial ? <Pill tone="sand">Free trial</Pill> : undefined}
    >
      {isCurrent ? (
        <BillingNote plan={plan} />
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            variant={isNextStep ? "buoy" : "outline"}
            className={`h-12 w-full ${isNextStep ? "" : "bg-white"}`}
            onClick={() => onChange(planKey)}
            disabled={busy}
          >
            {startFree ? `Start ${trial} free on ${MERCHANT_PLAN_NAMES[planKey]}` : `Move to ${MERCHANT_PLAN_NAMES[planKey]}`}
          </Button>
          {startFree && <p className="text-xs text-slate-brand">Card details taken now, first payment in {trial}.</p>}
          {!isUpgrade && <p className="text-xs text-slate-brand">Your loyalty programme carries on. Analytics stops.</p>}
        </div>
      )}
      <PricingLink>Compare in detail</PricingLink>
    </PlanCard>
  );
}

export default function PlanTab() {
  const { toast } = useToast();
  const { refresh } = useAuth();
  const queryClient = useQueryClient();
  const { data: plan, isLoading } = usePlan();
  const [confirmFree, setConfirmFree] = useState(false);

  const change = useMutation({
    mutationFn: async (target: PaidPlanKey) =>
      (await apiRequest("POST", "/api/merchant/plan/checkout", { plan: target })).json() as Promise<ChangeResponse>,
    onSuccess: async (res, target) => {
      if ("url" in res) {
        window.location.href = res.url;
        return;
      }
      await invalidatePlanGated(queryClient);
      await refresh();
      toast({
        title: `You are on ${MERCHANT_PLAN_NAMES[target]}`,
        description: target === "insight"
          ? "Analytics and town benchmarks are now available."
          : "The loyalty programme and unlimited offers are now available.",
      });
    },
    onError: (err) => toast({ title: "Could not change plan", description: errorMessage(err), variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/merchant/plan/cancel")).json() as Promise<CancelResponse>,
    onSuccess: async (res) => {
      await invalidatePlanGated(queryClient);
      await refresh();
      const paused = res.pausedOffers ?? 0;
      toast({
        title: "You are on the Free plan",
        description: paused > 0
          ? `${paused} live offer${paused === 1 ? " was" : "s were"} paused to fit the Free limit.`
          : "No offers were paused.",
      });
    },
    onError: (err) => toast({ title: "Could not change plan", description: errorMessage(err), variant: "destructive" }),
  });

  if (isLoading || !plan) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-5xl">
        {[0, 1, 2].map((i) => <div key={i} className="h-80 bg-white rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const current = plan.planStatus;
  const limit = plan.freeLiveOfferLimit;
  const trial = plan.trialDaysAvailable > 0 ? trialLengthLabel(plan.trialDaysAvailable) : null;
  const busy = change.isPending || cancel.isPending;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <PlanCard title={MERCHANT_PLAN_NAMES.free} price="£0" current={current === "free"} features={merchantFreeFeatures(limit)}>
          {current === "free" ? (
            <p className="text-xs text-slate-brand">
              {plan.liveOfferCount} of {limit} live offers used.
            </p>
          ) : (
            <Button variant="outline" className="h-12 w-full bg-white" onClick={() => setConfirmFree(true)} disabled={busy}>
              Move to Free
            </Button>
          )}
          <PricingLink>Compare in detail</PricingLink>
        </PlanCard>

        <PaidCard plan={plan} planKey="standard" features={MERCHANT_STANDARD_FEATURES} trial={trial} busy={busy} onChange={change.mutate} />
        <PaidCard plan={plan} planKey="insight" features={MERCHANT_INSIGHT_FEATURES} trial={trial} busy={busy} onChange={change.mutate} />
      </div>

      <AlertDialog open={confirmFree} onOpenChange={setConfirmFree}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">Move to the Free plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Free allows {limit} live offer{limit === 1 ? "" : "s"}. If you have more, the newest ones will be paused. The loyalty programme and analytics stop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-full">Stay on {plan.planName}</AlertDialogCancel>
            <AlertDialogAction className="h-11 rounded-full" onClick={() => cancel.mutate()}>Move to Free</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
