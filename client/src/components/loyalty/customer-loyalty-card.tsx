import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  Star, 
  Gift, 
  History, 
  Crown, 
  Coffee, 
  TrendingUp,
  Award,
  Calendar
} from "lucide-react";

interface LoyaltyBalance {
  points: number;
  stamps: number;
  tier: {
    name: string;
    perks: Array<{ type: string; value: number; note?: string }>;
  } | null;
}

interface LoyaltyEvent {
  id: string;
  type: "earn_points" | "earn_stamp" | "redeem_reward" | "tier_change";
  amount: number;
  createdAt: string;
  metadata: any;
}

interface CustomerLoyaltyCardProps {
  merchantId: string;
  merchantName: string;
  merchantLogo?: string;
}

export function CustomerLoyaltyCard({ merchantId, merchantName, merchantLogo }: CustomerLoyaltyCardProps) {
  const [activeTab, setActiveTab] = useState("balance");

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["/api/loyalty/balance", merchantId],
    queryFn: () => apiRequest("GET", `/api/loyalty/balance/${merchantId}`).then(res => res.json()) as Promise<LoyaltyBalance>
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/loyalty/events", merchantId],
    queryFn: () => apiRequest("GET", `/api/loyalty/events/${merchantId}`).then(res => res.json()) as Promise<LoyaltyEvent[]>
  });

  const { data: program } = useQuery({
    queryKey: ["/api/loyalty/program", merchantId],
    queryFn: () => apiRequest("GET", "/api/loyalty/program").then(res => res.json())
  });

  const getNextTier = () => {
    if (!program?.tiers || !balance) return null;
    
    const currentPoints = balance.points;
    const nextTier = program.tiers.find((tier: any) => tier.thresholdPoints > currentPoints);
    return nextTier;
  };

  const getTierProgress = () => {
    if (!balance || !program?.tiers) return 0;
    
    const currentTier = program.tiers
      .filter((tier: any) => tier.thresholdPoints <= balance.points)
      .sort((a: any, b: any) => b.thresholdPoints - a.thresholdPoints)[0];
    
    const nextTier = getNextTier();
    
    if (!nextTier) return 100; // Already at highest tier
    
    const currentBase = currentTier?.thresholdPoints || 0;
    const nextThreshold = nextTier.thresholdPoints;
    const progress = ((balance.points - currentBase) / (nextThreshold - currentBase)) * 100;
    
    return Math.min(progress, 100);
  };

  if (balanceLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-surface rounded w-3/4"></div>
            <div className="h-4 bg-surface rounded w-1/2"></div>
            <div className="h-8 bg-surface rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 shadow-elev-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {merchantLogo ? (
                <img src={merchantLogo} alt={merchantName} className="w-10 h-10 rounded-lg" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg text-fg">{merchantName}</CardTitle>
                <p className="text-sm text-soft">Loyalty Member</p>
              </div>
            </div>
            {balance?.tier && (
              <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/30">
                <Crown className="w-3 h-3 mr-1" />
                {balance.tier.name}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="balance" className="flex items-center gap-2 text-xs">
                <Star className="w-3 h-3" />
                Balance
              </TabsTrigger>
              <TabsTrigger value="rewards" className="flex items-center gap-2 text-xs">
                <Gift className="w-3 h-3" />
                Rewards
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 text-xs">
                <History className="w-3 h-3" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="balance" className="space-y-4">
              {/* Points/Stamps Display */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-fg">{balance?.points || 0}</div>
                  <div className="text-xs text-soft">Points</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-fg">{balance?.stamps || 0}</div>
                  <div className="text-xs text-soft">Stamps</div>
                </div>
              </div>

              {/* Tier Progress */}
              {getNextTier() && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-soft">Progress to {getNextTier()?.name}</span>
                    <span className="text-fg font-medium">
                      {balance?.points}/{getNextTier()?.thresholdPoints} pts
                    </span>
                  </div>
                  <Progress value={getTierProgress()} className="h-2" />
                  <p className="text-xs text-soft">
                    {(getNextTier()?.thresholdPoints || 0) - (balance?.points || 0)} points to go
                  </p>
                </div>
              )}

              {/* Perks */}
              {balance?.tier?.perks && balance.tier.perks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-fg text-sm">Your Perks</h4>
                  <div className="space-y-1">
                    {balance.tier.perks.map((perk, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Award className="w-3 h-3 text-yellow-500" />
                        <span className="text-soft">
                          {perk.value}% off {perk.note || 'all items'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="rewards" className="space-y-4">
              <div className="space-y-3">
                {program?.rewards?.filter((reward: any) => reward.active).map((reward: any) => {
                  const canAfford = (balance?.points || 0) >= reward.costPoints;
                  return (
                    <div key={reward.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <Coffee className="w-5 h-5 text-brown-500" />
                        <div>
                          <p className="font-medium text-fg text-sm">{reward.name}</p>
                          <p className="text-xs text-soft">{reward.costPoints} points</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        disabled={!canAfford}
                        className={canAfford 
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs"
                          : "text-xs"
                        }
                      >
                        {canAfford ? "Redeem" : "Need More"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {events?.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      {event.type === 'earn_points' ? (
                        <Star className="w-4 h-4 text-yellow-500" />
                      ) : event.type === 'redeem_reward' ? (
                        <Gift className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-fg">
                          {event.type === 'earn_points' ? 'Earned Points' :
                           event.type === 'redeem_reward' ? 'Redeemed Reward' :
                           'Activity'}
                        </p>
                        <p className="text-xs text-soft">
                          {format(new Date(event.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        event.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {event.amount > 0 ? '+' : ''}{event.amount}
                      </p>
                    </div>
                  </div>
                ))}
                {!events?.length && (
                  <div className="text-center py-6 text-soft">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No loyalty activity yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}