import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate, formatPounds, monthlyFromAnnual, trialLengthLabel } from "./format";
import { HouseholdJoinPanel, HouseholdMemberPanel, HouseholdPrimaryPanel } from "./household-panel";
import { CancelNowLink, DowngradeButton, DowngradeScheduledNote, KeepPremiumButton } from "./membership-actions";
import { FreePlanCompare, PremiumIncludes } from "./plan-reminder";
import { isMembershipLive, useMembership, useRefreshMembership, type MembershipInfo, type MembershipPlan } from "./use-membership";

export type { MembershipInfo } from "./use-membership";

type CheckoutResponse = { url: string } | { activated: true };

function StatusPill({ tone, children }: { tone: "green" | "muted" | "buoy" | "sand"; children: string }) {
  const cls =
    tone === "green"
      ? "bg-[#1F8A5B] text-white"
      : tone === "buoy"
        ? "bg-buoy text-white"
        : tone === "sand"
          ? "bg-sand text-sea ring-1 ring-sea/20"
          : "bg-white/70 text-slate-brand";
  return <span className={`text-[11px] font-bold tracking-[0.06em] uppercase px-2.5 py-1 rounded-full leading-none ${cls}`}>{children}</span>;
}

function PlanOption({ selected, title, price, note, onSelect }: {
  selected: boolean; title: string; price: string; note: string; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`text-left bg-white rounded-2xl p-4 flex flex-col gap-1 border-2 transition-colors ${selected ? "border-sea" : "border-transparent"}`}
    >
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-brand">{title}</span>
      <span className="font-display font-extrabold text-[28px] leading-none tracking-[-0.02em] text-sea">{price}</span>
      <span className="text-xs text-slate-brand">{note}</span>
    </button>
  );
}

function ChoosePlan({ data, expired }: { data: MembershipInfo; expired: boolean }) {
  const { toast } = useToast();
  const refresh = useRefreshMembership();
  const [plan, setPlan] = useState<MembershipPlan>(data.plan === "household" ? "household" : "individual");

  const checkout = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/membership/checkout", { plan })).json() as Promise<CheckoutResponse>,
    onSuccess: async (res) => {
      if ("url" in res) {
        window.location.href = res.url;
        return;
      }
      await refresh();
      toast({ title: "Membership active", description: "Your annual membership is now active." });
    },
    onError: (err) => toast({ title: "Payment could not start", description: errorMessage(err), variant: "destructive" }),
  });

  const trial = data.trialDaysAvailable > 0 ? trialLengthLabel(data.trialDaysAvailable) : null;

  return (
    <>
      <p className="text-sm">Free lets you browse every offer and see what it is worth. Premium is the card itself.</p>
      <FreePlanCompare />
      <div>
        <h3 className="font-display font-bold text-xl tracking-[-0.02em]">Go Premium to redeem offers</h3>
        <p className="text-sm text-slate-brand mt-1">
          {expired ? "Your Premium membership has run out. Renew to redeem offers again." : "One flat fee, billed once a year. No per-offer charges."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PlanOption
          selected={plan === "individual"}
          title="Individual"
          price={monthlyFromAnnual(data.fees.individual)}
          note={`a month · ${formatPounds(data.fees.individual)} billed yearly`}
          onSelect={() => setPlan("individual")}
        />
        <PlanOption
          selected={plan === "household"}
          title="Household"
          price={monthlyFromAnnual(data.fees.household)}
          note={`a month · ${formatPounds(data.fees.household)} billed yearly · two adults, children free`}
          onSelect={() => setPlan("household")}
        />
      </div>
      {trial && (
        <p className="text-sm text-slate-brand -mt-1">
          Free until your first payment in {trial}. Cancel any time before then.
        </p>
      )}
      <Button variant="default" className="w-full h-12 text-base" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
        {checkout.isPending ? "Starting payment" : trial ? `Start ${trial} free` : expired ? "Renew Premium" : "Go Premium"}
      </Button>
    </>
  );
}

export default function MembershipStatus() {
  const { data, isLoading } = useMembership();

  if (isLoading || !data) {
    return (
      <div className="bg-sand rounded-2xl p-5 animate-pulse space-y-3">
        <div className="h-6 bg-white/50 rounded w-1/3" />
        <div className="h-4 bg-white/50 rounded w-2/3" />
        <div className="h-12 bg-white/50 rounded-full" />
      </div>
    );
  }

  const live = isMembershipLive(data);
  const premium = data.tier === "premium" && live;
  const expired = data.status === "active" && !live;
  const role = data.household.role;
  const title = premium ? "Premium membership" : "Free membership";

  return (
    <section className="bg-sand rounded-2xl p-5 text-sea flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">{title}</h2>
        {premium && data.inTrial && data.renews ? (
          <StatusPill tone="sand">Free trial</StatusPill>
        ) : premium ? (
          <StatusPill tone={data.renews ? "green" : "muted"}>{data.renews ? "Active" : "Ending"}</StatusPill>
        ) : data.status === "cancelled" ? (
          <StatusPill tone="muted">Cancelled</StatusPill>
        ) : expired ? (
          <StatusPill tone="buoy">Expired</StatusPill>
        ) : null}
      </div>

      {role === "member" ? (
        <>
          {premium && !data.renews && <DowngradeScheduledNote data={data} />}
          <HouseholdMemberPanel data={data} />
        </>
      ) : premium && data.renews ? (
        <>
          {data.inTrial ? (
            <p className="text-sm">
              Free until <span className="font-bold">{formatDate(data.trialEndsAt)}</span>, then{" "}
              {monthlyFromAnnual(data.plan === "household" ? data.fees.household : data.fees.individual)} a month, billed yearly.
            </p>
          ) : (
            <p className="text-sm">
              Renews on <span className="font-bold">{formatDate(data.expiry)}</span>.
            </p>
          )}
          <PremiumIncludes />
          {role === "primary" && <HouseholdPrimaryPanel data={data} />}
          <DowngradeButton data={data} />
          <CancelNowLink />
        </>
      ) : premium ? (
        <>
          <DowngradeScheduledNote data={data} />
          <PremiumIncludes />
          {role === "primary" && <HouseholdPrimaryPanel data={data} />}
          <KeepPremiumButton />
        </>
      ) : (
        <>
          <ChoosePlan data={data} expired={expired} />
          {role !== "primary" && <HouseholdJoinPanel />}
        </>
      )}
    </section>
  );
}
