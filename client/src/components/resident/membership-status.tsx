import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatDate, formatPounds } from "./format";
import { HouseholdJoinPanel, HouseholdMemberPanel, HouseholdPrimaryPanel } from "./household-panel";
import { isMembershipLive, useMembership, useRefreshMembership, type MembershipInfo, type MembershipPlan } from "./use-membership";

export type { MembershipInfo } from "./use-membership";

type CheckoutResponse = { url: string } | { activated: true };

function StatusPill({ tone, children }: { tone: "green" | "muted" | "buoy"; children: string }) {
  const cls =
    tone === "green"
      ? "bg-[#1F8A5B] text-white"
      : tone === "buoy"
        ? "bg-buoy text-white"
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

  return (
    <>
      <p className="text-sm">
        {expired ? "Your membership has run out. Renew to keep using Resicard." : "One flat fee for the year. No per-offer charges."}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <PlanOption
          selected={plan === "individual"}
          title="Individual"
          price={formatPounds(data.fees.individual)}
          note="a year"
          onSelect={() => setPlan("individual")}
        />
        <PlanOption
          selected={plan === "household"}
          title="Household"
          price={formatPounds(data.fees.household)}
          note="a year · two adults, children free"
          onSelect={() => setPlan("household")}
        />
      </div>
      <Button variant="default" className="w-full h-12 text-base" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
        {checkout.isPending ? "Starting payment" : expired ? "Renew membership" : "Pay membership"}
      </Button>
    </>
  );
}

function CancelButton() {
  const { toast } = useToast();
  const refresh = useRefreshMembership();
  const cancel = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/membership/cancel")).json(),
    onSuccess: async () => {
      await refresh();
      toast({ title: "Membership cancelled", description: "You can rejoin at any time." });
    },
    onError: (err) => toast({ title: "Could not cancel", description: errorMessage(err), variant: "destructive" }),
  });
  return (
    <Button
      variant="outline"
      className="w-full h-11 bg-transparent border-[#0F3B47]/30"
      disabled={cancel.isPending}
      onClick={() => {
        if (window.confirm("Cancel your membership? You will lose access to offers when it ends.")) cancel.mutate();
      }}
    >
      Cancel membership
    </Button>
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
  const expired = data.status === "active" && !live;
  const role = data.household.role;
  const title = live && data.plan === "household" ? "Household membership" : "Membership";

  return (
    <section className="bg-sand rounded-2xl p-5 text-sea flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">{title}</h2>
        {live ? (
          <StatusPill tone="green">Active</StatusPill>
        ) : data.status === "cancelled" ? (
          <StatusPill tone="muted">Cancelled</StatusPill>
        ) : expired ? (
          <StatusPill tone="buoy">Expired</StatusPill>
        ) : (
          <StatusPill tone="muted">Not active</StatusPill>
        )}
      </div>

      {role === "member" ? (
        <>
          {live && (
            <p className="text-sm">
              Valid until <span className="font-bold">{formatDate(data.expiry)}</span>.
            </p>
          )}
          <HouseholdMemberPanel data={data} />
        </>
      ) : live ? (
        <>
          <p className="text-sm">
            Valid until <span className="font-bold">{formatDate(data.expiry)}</span>.
          </p>
          {role === "primary" && <HouseholdPrimaryPanel data={data} />}
          <CancelButton />
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
