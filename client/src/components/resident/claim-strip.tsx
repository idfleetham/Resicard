import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LoyaltyReward } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RewardClaimAnimation } from "@/components/loyalty/reward-animations";
import { errorMessage } from "@/components/resident/format";
import { OutletBadge, type LoyaltyMembership } from "@/components/resident/points-list";

interface RedeemResponse {
  balance: { points: number | null; stamps: number | null };
  code: string;
}

interface ClaimTarget {
  merchant: LoyaltyMembership["merchant"];
  reward: LoyaltyReward;
}

interface Claimed {
  rewardName: string;
  merchantName: string;
  code: string;
}

/** Sand panel listing every reward the resident can claim right now, one buoy button per row. */
export function ClaimStrip({ items }: { items: LoyaltyMembership[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claimed, setClaimed] = useState<Claimed | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const claim = useMutation({
    mutationFn: async ({ merchant, reward }: ClaimTarget) => {
      const res = await apiRequest("POST", "/api/loyalty/redeem-reward", { merchantId: merchant.id, rewardId: reward.id });
      return { merchant, reward, data: (await res.json()) as RedeemResponse };
    },
    onMutate: ({ reward }) => setPendingId(reward.id),
    onSettled: () => setPendingId(null),
    onSuccess: async ({ merchant, reward, data }) => {
      setClaimed({ rewardName: reward.name, merchantName: merchant.name, code: data.code });
      setShowAnimation(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/loyalty/mine"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/activity/mine"] }),
      ]);
    },
    onError: (err) => toast({ title: "Could not claim reward", description: errorMessage(err), variant: "destructive" }),
  });

  const rows = items.flatMap((m) => m.claimable.map((reward) => ({ merchant: m.merchant, reward })));
  // Stay mounted while the code dialog is open, even once the last reward has been claimed.
  if (rows.length === 0 && !claimed) return null;

  return (
    <section className="space-y-3">
      {rows.length > 0 && <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">Ready to claim</h2>}
      {rows.length > 0 && (
        <div className="bg-sand rounded-2xl p-2">
          <ul className="flex flex-col">
            {rows.map(({ merchant, reward }) => (
              <li key={`${merchant.id}:${reward.id}`} className="flex items-center gap-3 p-3">
                <OutletBadge name={merchant.name} logoUrl={merchant.logoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">{reward.name}</p>
                  <p className="text-xs text-slate-brand truncate">{merchant.name}</p>
                </div>
                <Button
                  variant="buoy"
                  size="sm"
                  className="h-10 px-5"
                  disabled={claim.isPending}
                  onClick={() => claim.mutate({ merchant, reward })}
                >
                  {pendingId === reward.id ? "Claiming" : "Claim"}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RewardClaimAnimation
        isVisible={showAnimation}
        rewardName={claimed?.rewardName ?? ""}
        onComplete={() => setShowAnimation(false)}
      />

      <Dialog open={Boolean(claimed) && !showAnimation} onOpenChange={(o) => !o && setClaimed(null)}>
        <DialogContent className="max-w-sm text-center rounded-2xl border-0 text-sea">
          <DialogHeader>
            <DialogTitle className="text-center font-display font-bold text-2xl tracking-[-0.02em]">Show this to staff</DialogTitle>
            <DialogDescription className="text-center text-slate-brand">
              {claimed?.rewardName} at {claimed?.merchantName}
            </DialogDescription>
          </DialogHeader>
          <p className="font-display font-extrabold text-[42px] tracking-[0.12em] py-4">{claimed?.code}</p>
          <Button className="w-full h-12" onClick={() => setClaimed(null)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
