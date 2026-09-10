import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { formatPounds } from "@/components/resident/format";
import { StaffEarningTool } from "@/components/loyalty/staff-earning-tool";
import { PROGRAM_KEY, type LoyaltyProgramData } from "./loyalty/types";
import { LoyaltyUpgradeCard, isPlanRequired } from "./loyalty/upgrade-card";
import { usePlan } from "./plan-tab";
import { LoyaltyCard } from "@/components/loyalty/loyalty-card";
import { CARD, Pill, SectionTitle } from "./portal-ui";

function Fact({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-brand">{label}</dt>
      <dd className="font-display font-extrabold text-2xl leading-none tracking-[-0.02em] text-sea mt-1 capitalize">{value ?? "-"}</dd>
    </div>
  );
}

export default function LoyaltyTab({ merchantName }: { merchantName: string }) {
  const { data: plan, isLoading: planLoading } = usePlan();
  const gated = !!plan && !plan.features.loyalty;
  const { data, isLoading, error } = useQuery<LoyaltyProgramData | null>({ queryKey: [...PROGRAM_KEY], enabled: !!plan && !gated });
  const program = data?.program;

  if (planLoading) return <div className="h-40 bg-white rounded-2xl border border-hairline animate-pulse max-w-xl" />;
  if (gated || isPlanRequired(error)) return <LoyaltyUpgradeCard />;

  const topTier = data?.tiers?.[data.tiers.length - 1] ?? null;

  return (
    <div className="space-y-3">
      {/*
        The tab opens with the card itself rather than a list of settings. It is
        the thing a merchant is actually buying on the Standard plan, it is what
        their customers will see, and it is the only object on this screen that is
        not a white box with text in it.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr] gap-3 items-start">
        <div className={`${CARD} p-4`}>
          {isLoading ? (
            <div className="w-full aspect-[1.6/1] rounded-[20px] bg-foam animate-pulse" />
          ) : (
            <LoyaltyCard
              name={merchantName}
              theme={program?.cardTheme}
              pattern={program?.cardPattern}
              points={program ? 240 : 0}
              tier={topTier ? { name: topTier.name, color: topTier.color ?? null, discountPercent: topTier.discountPercent ?? null } : null}
              size="full"
            />
          )}
          <p className="text-xs text-slate-brand mt-3 px-1">
            {program ? "How your card looks in a resident's wallet." : "How your card would look in a resident's wallet."}
          </p>
        </div>

        <div className={`${CARD} p-5 space-y-4`}>
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
      </div>

      {program?.active && <StaffEarningTool />}
    </div>
  );
}
