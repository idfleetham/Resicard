import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User } from "lucide-react";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatTime } from "@/components/resident/format";
import { OutletBadge, benefitState, windowLabel, type LoyaltyMembership, type TierBenefit } from "@/components/resident/points-list";
import type { RewardClaimDetails } from "@/pages/resident/reward-claim";

/** Response of GET /api/loyalty/card/:merchantId. */
interface LoyaltyCardData {
  merchant: { id: string; name: string; logoUrl: string | null };
  resident: { firstName: string | null; surname: string | null; profilePhoto: string | null };
  points: number;
  statusPoints: number;
  tierWindowDays: number;
  tier: { name: string; color: string | null; discountPercent: number | null } | null;
  nextTier: { name: string; thresholdPoints: number } | null;
  memberSince: string | null;
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return <span className="font-display font-bold text-xl tabular-nums tracking-[0.02em]">{formatTime(now, true)}</span>;
}

/** The sea card shown to staff for a flat tier discount. */
function OutletCard({ card }: { card: LoyaltyCardData }) {
  const { merchant, resident, tier, statusPoints, tierWindowDays } = card;
  const name = [resident.firstName, resident.surname].filter(Boolean).join(" ") || "Resident";
  return (
    <div className="relative w-full aspect-[1.6/1] rounded-[20px] overflow-hidden bg-sea text-foam shadow-[0_18px_40px_rgba(15,59,71,0.35)]">
      <img src="/brand/west-sands.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-55" style={{ objectPosition: "60% 40%" }} />
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(180deg, rgba(15,59,71,0.15) 0%, rgba(15,59,71,0.55) 45%, #0F3B47 78%)" }} />

      <div className="absolute left-[22px] top-5 right-[22px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {merchant.logoUrl && <OutletBadge name={merchant.name} logoUrl={merchant.logoUrl} size="h-8 w-8" />}
          <p className="font-display font-bold text-lg leading-none truncate">{merchant.name}</p>
        </div>
        <Clock />
      </div>

      <div className="absolute left-[22px] right-[22px] top-[38%] -translate-y-1/2 sm:top-[42%]">
        {tier?.discountPercent ? (
          <p className="font-display font-extrabold text-[34px] sm:text-[40px] leading-[0.95] tracking-[-0.03em]">
            {tier.discountPercent}% off as a {tier.name} member
          </p>
        ) : (
          <p className="font-display font-extrabold text-[30px] sm:text-[36px] leading-[0.95] tracking-[-0.03em]">Show this card at the till</p>
        )}
      </div>

      <div className="absolute left-[22px] right-[22px] bottom-[22px] flex items-end gap-4">
        <div className="h-[64px] w-[64px] flex-none rounded-full bg-sand border-[3px] border-foam overflow-hidden flex items-center justify-center">
          {resident.profilePhoto ? (
            <img src={resident.profilePhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-7 w-7 text-[#7A8A8F]" strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <p className="font-display font-bold text-[24px] leading-none tracking-[-0.02em] truncate">{name}</p>
          {tier ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tier.color ?? "#E4572E" }} />
              {tier.name}
            </p>
          ) : (
            <p className="text-xs font-semibold text-[#F2F5F4]/70">No tier yet</p>
          )}
          <p className="text-[11px] opacity-80 tabular-nums">{statusPoints} points in the last {windowLabel(tierWindowDays)}</p>
        </div>
      </div>
    </div>
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

  const claim = useMutation({
    mutationFn: async (reward: TierBenefit) => {
      const res = await apiRequest("POST", "/api/loyalty/redeem-reward", { merchantId, rewardId: reward.id });
      return (await res.json()) as RewardClaimDetails;
    },
    onMutate: (reward) => setPendingId(reward.id),
    onSettled: () => setPendingId(null),
    onSuccess: (data) => {
      queryClient.setQueryData([`/api/reward-claims/${data.claim.id}`], data);
      void queryClient.invalidateQueries({ queryKey: ["/api/loyalty/mine"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/activity/mine"] });
      setLocation(`/reward-claims/${data.claim.id}`);
    },
    onError: (err) => toast({ title: "Could not claim benefit", description: errorMessage(err), variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-foam text-sea">
      <Navigation />
      <main className="max-w-md mx-auto px-5 py-6 flex flex-col gap-4">
        <Link href="/resident" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-brand self-start">
          <ArrowLeft className="h-4 w-4" /> My card
        </Link>

        {!ready || card.isLoading ? (
          <div className="aspect-[1.6/1] bg-white rounded-[20px] animate-pulse" />
        ) : card.error || !card.data ? (
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <p className="font-display font-bold text-2xl tracking-[-0.02em]">Card not available</p>
            <p className="text-sm text-slate-brand">{card.error ? errorMessage(card.error) : "This outlet has no loyalty programme."}</p>
          </div>
        ) : (
          <>
            <OutletCard card={card.data} />
            <p className="text-xs text-slate-brand text-center px-4">
              Show this to staff at {card.data.merchant.name}. Points are separate from your tier: you have {card.data.points} to spend.
            </p>

            <section className="bg-white rounded-2xl p-5 space-y-3">
              <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Tier benefits</h2>
              {benefits.length === 0 ? (
                <p className="text-sm text-slate-brand">
                  {card.data.tier ? "Nothing to claim at this tier yet." : "Earn points here to reach a tier and its benefits."}
                </p>
              ) : (
                <ul className="divide-y divide-[#E6E9E8]">
                  {benefits.map((b) => {
                    const state = benefitState(b);
                    return (
                      <li key={b.id} className="flex items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate">{b.name}</p>
                          {b.terms && <p className="text-xs text-slate-brand">{b.terms}</p>}
                        </div>
                        {b.claimable ? (
                          <Button variant="buoy" size="sm" className="h-10 px-5" disabled={claim.isPending} onClick={() => claim.mutate(b)}>
                            {pendingId === b.id ? "Claiming" : "Claim"}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-brand text-right">
                            {state.label}
                            {state.next && <span className="block">{state.next}</span>}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {card.data.nextTier && (
                <p className="text-xs text-slate-brand">
                  Next: {card.data.nextTier.name} at {card.data.nextTier.thresholdPoints} points
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
