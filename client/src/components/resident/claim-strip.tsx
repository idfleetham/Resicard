import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LoyaltyReward } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage } from "@/components/resident/format";
import { OutletBadge, type LoyaltyMembership } from "@/components/resident/points-list";
import type { RewardClaimDetails } from "@/pages/resident/reward-claim";

interface ClaimTarget {
  merchant: LoyaltyMembership["merchant"];
  reward: LoyaltyReward;
  /** True for a tier benefit, which costs nothing. */
  free: boolean;
}

function costLabel(r: LoyaltyReward): string {
  const parts: string[] = [];
  if (r.costPoints) parts.push(`${r.costPoints} points`);
  if (r.costStamps) parts.push(`${r.costStamps} stamps`);
  return parts.join(" + ") || "Free";
}

/** Sand panel listing every reward and tier benefit the resident can claim right now, one buoy button per row. */
export function ClaimStrip({ items }: { items: LoyaltyMembership[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const claim = useMutation({
    mutationFn: async ({ merchant, reward }: ClaimTarget) => {
      const res = await apiRequest("POST", "/api/loyalty/redeem-reward", { merchantId: merchant.id, rewardId: reward.id });
      return (await res.json()) as RewardClaimDetails;
    },
    onMutate: ({ reward }) => setPendingId(reward.id),
    onSettled: () => setPendingId(null),
    onSuccess: (data) => {
      // Seed the claim page so the green screen appears without a second fetch.
      queryClient.setQueryData([`/api/reward-claims/${data.claim.id}`], data);
      void queryClient.invalidateQueries({ queryKey: ["/api/loyalty/mine"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/activity/mine"] });
      setLocation(`/reward-claims/${data.claim.id}`);
    },
    onError: (err) => toast({ title: "Could not claim reward", description: errorMessage(err), variant: "destructive" }),
  });

  const rows: ClaimTarget[] = items.flatMap((m) => [
    ...m.benefits.filter((b) => b.claimable).map((reward) => ({ merchant: m.merchant, reward, free: true })),
    ...m.claimable.map((reward) => ({ merchant: m.merchant, reward, free: false })),
  ]);
  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Ready to claim</h2>
      <div className="bg-sand rounded-2xl p-2">
        <ul className="flex flex-col">
          {rows.map(({ merchant, reward, free }) => (
            <li key={`${merchant.id}:${reward.id}`} className="flex items-center gap-3 p-3">
              <OutletBadge name={merchant.name} logoUrl={merchant.logoUrl} />
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">{reward.name}</p>
                <p className="text-xs text-slate-brand truncate">
                  {merchant.name} · {free ? "Free" : costLabel(reward)}
                </p>
              </div>
              <Button
                variant="buoy"
                size="sm"
                className="h-10 px-5"
                disabled={claim.isPending}
                onClick={() => claim.mutate({ merchant, reward, free })}
              >
                {pendingId === reward.id ? "Claiming" : "Claim"}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
