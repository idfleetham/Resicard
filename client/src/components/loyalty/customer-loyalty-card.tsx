import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown, Gift, Star } from "lucide-react";
import type { LoyaltyReward } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AnimatedPointCounter, PulsingBadge, RewardClaimAnimation } from "./reward-animations";
import { errorMessage } from "@/components/resident/format";

/** One entry of GET /api/loyalty/mine. */
export interface LoyaltyMembership {
  merchant: { id: string; name: string; logoUrl: string | null };
  points: number;
  stamps: number;
  tier: { name: string; color: string | null; discountPercent: number | null } | null;
  nextTier: { name: string; thresholdPoints: number } | null;
  rewards: LoyaltyReward[];
}

interface RedeemResponse {
  balance: { points: number | null; stamps: number | null };
  code: string;
}

interface CustomerLoyaltyCardProps {
  membership: LoyaltyMembership;
}

export function CustomerLoyaltyCard({ membership }: CustomerLoyaltyCardProps) {
  const { merchant, points, stamps, tier, nextTier, rewards } = membership;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claimed, setClaimed] = useState<{ name: string; code: string } | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const redeem = useMutation({
    mutationFn: async (reward: LoyaltyReward) => {
      const res = await apiRequest("POST", "/api/loyalty/redeem-reward", { merchantId: merchant.id, rewardId: reward.id });
      return { reward, data: (await res.json()) as RedeemResponse };
    },
    onSuccess: async ({ reward, data }) => {
      setClaimed({ name: reward.name, code: data.code });
      setShowAnimation(true);
      await queryClient.invalidateQueries({ queryKey: ["/api/loyalty/mine"] });
    },
    onError: (err) => toast({ title: "Could not use reward", description: errorMessage(err), variant: "destructive" }),
  });

  const progress = nextTier ? Math.min(100, Math.round((points / Math.max(1, nextTier.thresholdPoints)) * 100)) : 100;
  const activeRewards = rewards.filter((r) => r.active !== false);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {merchant.logoUrl ? (
              <img src={merchant.logoUrl} alt="" className="h-11 w-11 rounded-lg object-cover border border-slate-200" />
            ) : (
              <div className="h-11 w-11 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg">
                {merchant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">{merchant.name}</CardTitle>
              <p className="text-sm text-slate-500">Loyalty programme</p>
            </div>
            {tier && (
              <PulsingBadge isActive={progress === 100}>
                <Badge
                  className="text-white border-0"
                  style={{ backgroundColor: tier.color ?? "#f97316" }}
                >
                  <Crown className="h-3 w-3 mr-1" />
                  {tier.name}
                </Badge>
              </PulsingBadge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-6">
            <div>
              <div className="text-3xl font-bold text-slate-900 flex items-center gap-1">
                <Star className="h-6 w-6 text-amber-500" />
                <AnimatedPointCounter currentPoints={0} targetPoints={points} />
              </div>
              <p className="text-xs text-slate-500">points</p>
            </div>
            {stamps > 0 && (
              <div>
                <div className="text-3xl font-bold text-slate-900">{stamps}</div>
                <p className="text-xs text-slate-500">stamps</p>
              </div>
            )}
            {tier?.discountPercent ? (
              <p className="text-sm text-slate-600 ml-auto">{tier.discountPercent}% tier discount</p>
            ) : null}
          </div>

          {nextTier && (
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Progress to {nextTier.name}</span>
                <span>{Math.max(0, nextTier.thresholdPoints - points)} points to go</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {activeRewards.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rewards</p>
              {activeRewards.map((reward) => {
                const cost = reward.costPoints ?? 0;
                const canAfford = points >= cost && stamps >= (reward.costStamps ?? 0);
                return (
                  <div key={reward.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <Gift className="h-5 w-5 text-slate-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 text-sm">{reward.name}</p>
                      <p className="text-xs text-slate-500">
                        {cost > 0 ? `${cost} points` : ""}
                        {reward.costStamps ? `${cost > 0 ? " + " : ""}${reward.costStamps} stamps` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="h-10"
                      disabled={!canAfford || redeem.isPending}
                      onClick={() => redeem.mutate(reward)}
                    >
                      {canAfford ? "Use reward" : "Not yet"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <RewardClaimAnimation
        isVisible={showAnimation}
        rewardName={claimed?.name ?? ""}
        onComplete={() => setShowAnimation(false)}
      />

      <Dialog open={Boolean(claimed) && !showAnimation} onOpenChange={(o) => !o && setClaimed(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center">Show this to staff</DialogTitle>
            <DialogDescription className="text-center">
              {claimed?.name} at {merchant.name}
            </DialogDescription>
          </DialogHeader>
          <p className="font-mono text-4xl font-bold tracking-[0.3em] text-slate-900 py-4">{claimed?.code}</p>
          <Button className="w-full h-12" onClick={() => setClaimed(null)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
