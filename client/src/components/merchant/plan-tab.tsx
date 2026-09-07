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
import { errorMessage, formatDate, formatPounds } from "@/components/resident/format";
import { Pill, SectionTitle } from "./portal-ui";

export interface PlanInfo {
  planStatus: "free" | "premium";
  planStartedAt: string | null;
  planRenewsAt: string | null;
  premiumMonthlyFee: number;
  currency: string;
  freeLiveOfferLimit: number;
  liveOfferCount: number;
  features: { unlimitedOffers: boolean; loyalty: boolean; analytics: boolean };
}

export const PLAN_KEY = ["/api/merchant/plan"] as const;

export function usePlan() {
  return useQuery<PlanInfo>({ queryKey: [...PLAN_KEY] });
}

type CheckoutResponse = { url: string } | { activated: true };
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

function PlanCard({ title, price, current, features, children }: {
  title: string; price: string; current: boolean; features: string[]; children?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 flex flex-col gap-4 ${current ? "" : "border border-[#E6E9E8]"}`}>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>{title}</SectionTitle>
        {current && <Pill tone="sea">Current plan</Pill>}
      </div>
      <p className="font-display font-extrabold text-[32px] leading-none tracking-[-0.03em] text-sea">{price}</p>
      <ul className="space-y-2 flex-1">
        {features.map((f) => <Feature key={f}>{f}</Feature>)}
      </ul>
      {children}
    </div>
  );
}

export default function PlanTab() {
  const { toast } = useToast();
  const { refresh } = useAuth();
  const queryClient = useQueryClient();
  const { data: plan, isLoading } = usePlan();
  const [confirmFree, setConfirmFree] = useState(false);

  const checkout = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/merchant/plan/checkout")).json() as Promise<CheckoutResponse>,
    onSuccess: async (res) => {
      if ("url" in res) {
        window.location.href = res.url;
        return;
      }
      await invalidatePlanGated(queryClient);
      await refresh();
      toast({ title: "Premium is active", description: "Loyalty and analytics are now available." });
    },
    onError: (err) => toast({ title: "Payment could not start", description: errorMessage(err), variant: "destructive" }),
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
        <div className="h-72 bg-white rounded-2xl animate-pulse" />
        <div className="h-72 bg-white rounded-2xl animate-pulse" />
      </div>
    );
  }

  const isFree = plan.planStatus === "free";
  const limit = plan.freeLiveOfferLimit;
  const freeFeatures = [
    "Listing in the residents' app",
    `Up to ${limit} live offer${limit === 1 ? "" : "s"} at a time`,
    "Day and time scheduling",
    "QR poster for the till",
    "Redemption feed and counts",
  ];
  const premiumFeatures = ["Unlimited live offers", "Loyalty programme", "Analytics"];

  return (
    <div className="max-w-3xl space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PlanCard title="Free" price="£0" current={isFree} features={freeFeatures}>
          {isFree ? (
            <p className="text-xs text-slate-brand">
              {plan.liveOfferCount} of {limit} live offers used.
            </p>
          ) : (
            <Button variant="outline" className="h-12 w-full bg-white" onClick={() => setConfirmFree(true)} disabled={cancel.isPending}>
              Move to Free
            </Button>
          )}
        </PlanCard>

        <PlanCard title="Premium" price={`${formatPounds(plan.premiumMonthlyFee)} a month`} current={!isFree} features={premiumFeatures}>
          {isFree ? (
            <Button variant="buoy" className="h-12 w-full" onClick={() => checkout.mutate()} disabled={checkout.isPending}>
              {checkout.isPending ? "Starting" : "Upgrade to Premium"}
            </Button>
          ) : (
            <p className="text-xs text-slate-brand">
              {plan.planRenewsAt ? `Renews ${formatDate(plan.planRenewsAt)}.` : "Billed monthly."}
              {plan.planStartedAt ? ` Started ${formatDate(plan.planStartedAt)}.` : ""}
            </p>
          )}
        </PlanCard>
      </div>

      <AlertDialog open={confirmFree} onOpenChange={setConfirmFree}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-2xl tracking-[-0.02em]">Move to the Free plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Free allows {limit} live offer{limit === 1 ? "" : "s"}. If you have more, the newest ones will be paused. The loyalty programme and analytics will no longer be available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-full">Keep Premium</AlertDialogCancel>
            <AlertDialogAction className="h-11 rounded-full" onClick={() => cancel.mutate()}>Move to Free</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
