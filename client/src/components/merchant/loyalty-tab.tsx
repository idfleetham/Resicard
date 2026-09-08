import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatPounds } from "@/components/resident/format";
import { StaffEarningTool } from "@/components/loyalty/staff-earning-tool";
import { PROGRAM_KEY, type LoyaltyProgramData } from "./loyalty/types";
import { LoyaltyUpgradeCard, isPlanRequired } from "./loyalty/upgrade-card";
import { usePlan } from "./plan-tab";
import { Pill, SectionTitle } from "./portal-ui";

function Fact({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-brand">{label}</dt>
      <dd className="font-display font-extrabold text-2xl leading-none tracking-[-0.02em] text-sea mt-1 capitalize">{value ?? "-"}</dd>
    </div>
  );
}

export default function LoyaltyTab() {
  const { data: plan, isLoading: planLoading } = usePlan();
  const gated = !!plan && !plan.features.loyalty;
  const { data, isLoading, error } = useQuery<LoyaltyProgramData | null>({ queryKey: [...PROGRAM_KEY], enabled: !!plan && !gated });
  const program = data?.program;

  if (planLoading) return <div className="h-40 bg-white rounded-2xl animate-pulse max-w-xl" />;
  if (gated || isPlanRequired(error)) return <LoyaltyUpgradeCard />;

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>Loyalty programme</SectionTitle>
          {program && (program.active ? <Pill tone="live">Running</Pill> : <Pill tone="sand">Paused</Pill>)}
        </div>
        {isLoading ? (
          <div className="h-16 bg-foam rounded-xl animate-pulse" />
        ) : !program ? (
          <p className="text-sm text-slate-brand">
            You have not set up a loyalty programme. Residents earn points automatically each time they redeem, and you can add tiers and rewards.
          </p>
        ) : (
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Fact label="Points per £1" value={program.pointsPerCurrency} />
            <Fact label="Points per scan" value={program.pointsPerRedemption} />
            <Fact label="Minimum spend to earn" value={formatPounds(program.minBasketEarn)} />
            <Fact label="Tiers" value={data?.tiers.length ?? 0} />
            <Fact label="Rewards" value={`${data?.rewards.filter((r) => r.active).length ?? 0} active`} />
          </dl>
        )}
        <Button asChild variant="buoy" className="h-12 px-6">
          <Link href="/merchant/loyalty">{program ? "Manage programme" : "Set up loyalty"}</Link>
        </Button>
      </div>

      {program?.active && <StaffEarningTool />}
    </div>
  );
}
