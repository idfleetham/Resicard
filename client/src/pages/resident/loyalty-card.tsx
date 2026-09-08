import { useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { LoyaltyReward } from "@shared/schema";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "@/components/resident/format";
import { benefitState, windowLabel, type LoyaltyMembership, type TierBenefit } from "@/components/resident/points-list";
import CardHero, { type LoyaltyCardData } from "@/components/loyalty/card-hero";
import type { RewardClaimDetails } from "@/pages/resident/reward-claim";

function ClaimRow({
  title,
  note,
  action,
}: {
  title: string;
  note: string | null;
  action: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-bold truncate">{title}</p>
        {note && <p className="text-xs text-slate-brand">{note}</p>}
      </div>
      {action}
    </li>
  );
}

export default function LoyaltyCardPage() {
  const { merchantId = "" } = useParams<{ merchantId: string }>();
  const { ready } = useRequireRole("resident");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const card = useQuery<LoyaltyCardData>({ queryKey: [`/api/loyalty/card/${merchantId}`], enabled: ready && merchantId.length > 0 });
  const mine = useQuery<LoyaltyMembership[]>({ queryKey: ["/api/loyalty/mine"], enabled: ready });
  const membership = mine.data?.find((m) => m.merchant.id === merchantId);
  const benefits: TierBenefit[] = membership?.benefits ?? [];
  const claimable: LoyaltyReward[] = membership?.claimable ?? [];

  const claim = useMutation({
    mutationFn: async (reward: { id: string }) => {
      const res = await apiRequest("POST", "/api/loyalty/redeem-reward", { merchantId, rewardId: reward.id });
      return (await res.json()) as RewardClaimDetails;
    },
    onMutate: (reward) => setPendingId(reward.id),
    onSettled: () => setPendingId(null),
    onSuccess: (data) => {
      queryClient.setQueryData([`/api/reward-claims/${data.claim.id}`], data);
      void queryClient.invalidateQueries({ queryKey: ["/api/loyalty/mine"] });
      void queryClient.invalidateQueries({ queryKey: [`/api/loyalty/card/${merchantId}`] });
      void queryClient.invalidateQueries({ queryKey: ["/api/activity/mine"] });
      setLocation(`/reward-claims/${data.claim.id}`);
    },
    onError: (err) => toast({ title: "Could not claim benefit", description: errorMessage(err), variant: "destructive" }),
  });

  if (!ready || card.isLoading) {
    return (
      <div className="min-h-screen bg-foam text-sea">
        <Navigation />
        <div className="h-[320px] bg-white animate-pulse" />
      </div>
    );
  }

  if (card.error || !card.data) {
    return (
      <div className="min-h-screen bg-foam text-sea">
        <Navigation />
        <main className="max-w-md mx-auto px-5 py-6 flex flex-col gap-4">
          <Link href="/resident?tab=cards" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-brand self-start">
            <ArrowLeft className="h-4 w-4" /> Cards
          </Link>
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <p className="font-display font-bold text-2xl tracking-[-0.02em]">Card not available</p>
            <p className="text-sm text-slate-brand">{card.error ? errorMessage(card.error) : "This outlet has no loyalty programme."}</p>
          </div>
        </main>
      </div>
    );
  }

  const data = card.data;

  return (
    <div className="min-h-screen bg-foam text-sea">
      <Navigation />
      <CardHero card={data} />

      <main className="max-w-md mx-auto px-5 py-5 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-5 flex items-center gap-4">
          <div>
            <p className="font-display font-extrabold text-3xl leading-none tabular-nums tracking-[-0.02em]">{data.points}</p>
            <p className="text-[11px] uppercase font-bold tracking-[0.12em] text-slate-brand mt-1">points to spend</p>
          </div>
          <div className="ml-auto text-right text-xs text-slate-brand">
            <p>
              {data.statusPoints} points in the last {windowLabel(data.tierWindowDays)}
            </p>
            {data.nextTier && (
              <p className="mt-1">
                Next: {data.nextTier.name} at {data.nextTier.thresholdPoints} points
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-brand text-center px-4">
          Points are separate from your tier at {data.merchant.name}.
          {data.pointsExpiresAt && (
            <>
              {" "}
              They run out on{" "}
              <span className="font-semibold text-sea">
                {new Date(data.pointsExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>{" "}
              if you do not use the card here before then. Any visit resets it.
            </>
          )}
        </p>

        <section className="bg-white rounded-2xl p-5 space-y-3">
          <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Tier benefits</h2>
          {benefits.length === 0 ? (
            <p className="text-sm text-slate-brand">
              {data.tier ? "Nothing to claim at this tier yet." : "Earn points here to reach a tier and its benefits."}
            </p>
          ) : (
            <ul className="divide-y divide-[#E6E9E8]">
              {benefits.map((b) => {
                const state = benefitState(b);
                return (
                  <ClaimRow
                    key={b.id}
                    title={b.name}
                    note={b.terms}
                    action={
                      b.claimable ? (
                        <Button variant="buoy" size="sm" className="h-10 px-5" disabled={claim.isPending} onClick={() => claim.mutate(b)}>
                          {pendingId === b.id ? "Claiming" : "Claim"}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-brand text-right">
                          {state.label}
                          {state.next && <span className="block">{state.next}</span>}
                        </span>
                      )
                    }
                  />
                );
              })}
            </ul>
          )}
        </section>

        {claimable.length > 0 && (
          <section className="bg-white rounded-2xl p-5 space-y-3">
            <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Rewards you can claim</h2>
            <ul className="divide-y divide-[#E6E9E8]">
              {claimable.map((r) => (
                <ClaimRow
                  key={r.id}
                  title={r.name}
                  note={r.costPoints ? `${r.costPoints} points` : r.terms}
                  action={
                    <Button size="sm" className="h-10 px-5" disabled={claim.isPending} onClick={() => claim.mutate(r)}>
                      {pendingId === r.id ? "Claiming" : "Claim"}
                    </Button>
                  }
                />
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
