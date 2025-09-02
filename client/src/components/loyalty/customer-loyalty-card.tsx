import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { PulsingBadge, AnimatedPointCounter, ShimmerText } from "./reward-animations";
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
  tier: string | null;
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

  // Get merchant details for logo
  const { data: merchantDetails } = useQuery({
    queryKey: ["/api/merchants", merchantName],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/merchants");
        const merchants = await response.json();
        return merchants.find((m: any) => m.name === merchantName);
      } catch (error) {
        console.warn('Failed to fetch merchant details:', error);
        return null;
      }
    }
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
      <Card className="bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 border-2 border-purple-400/30 shadow-2xl shadow-purple-500/20 backdrop-blur-sm overflow-hidden relative">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {merchantLogo || merchantDetails?.logoUrl || merchantDetails?.profilePhoto ? (
                <img 
                  src={merchantLogo || merchantDetails?.logoUrl || merchantDetails?.profilePhoto} 
                  alt={merchantName} 
                  className="w-12 h-12 rounded-xl object-cover border-2 border-white/20 shadow-lg"
                />
              ) : merchantDetails?.logo ? (
                <img 
                  src={merchantDetails.logo} 
                  alt={merchantName} 
                  className="w-12 h-12 rounded-xl object-cover border-2 border-white/20 shadow-lg"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center border-2 border-white/20 shadow-lg">
                  <span className="text-white font-bold text-xl">
                    {merchantName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <CardTitle className="text-lg text-fg">{merchantName}</CardTitle>
                <p className="text-sm text-soft">Loyalty Member</p>
              </div>
            </div>
            {balance?.tier && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border border-amber-300 shadow-lg px-3 py-1 font-bold text-sm">
                <Crown className="w-3 h-3 mr-1" />
                <span>{balance.tier} Tier</span>
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
              {/* Horizontal Layout: Points, Tier, Progress */}
              <div className="grid grid-cols-3 gap-4">
                {/* Points/Stamps Card */}
                <div className="bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-xl p-4 border border-purple-400/20">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      <AnimatedPointCounter 
                        currentPoints={0}
                        targetPoints={program?.model === 'stamps' ? (balance?.stamps || 0) : (balance?.points || 0)}
                      />
                    </div>
                    <div className="text-xs text-white/70 font-medium">
                      {program?.model === 'stamps' ? 'Stamps' : 'Points'}
                    </div>
                  </div>
                </div>

                {/* Tier Status Card */}
                {balance?.tier && (
                  <div className="bg-gradient-to-br from-amber-600/30 to-orange-600/30 rounded-xl p-4 border border-amber-400/20">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Crown className="w-4 h-4 text-amber-300" />
                        <span className="text-sm font-bold text-white">{balance.tier}</span>
                      </div>
                      <div className="text-xs text-amber-100/70 font-medium">Current Tier</div>
                    </div>
                  </div>
                )}

                {/* Progress Card */}
                {balance?.tier && (
                  <div className="bg-gradient-to-br from-green-600/30 to-emerald-600/30 rounded-xl p-4 border border-green-400/20">
                    <div className="text-center">
                      {balance.tier === 'Bronze' && balance.points < 100 && (
                        <>
                          <div className="text-sm font-bold text-white mb-1">
                            {100 - (balance.points || 0)} pts to Silver
                          </div>
                          <div className="text-xs text-green-100/70 font-medium">Progress</div>
                        </>
                      )}
                      {balance.tier === 'Bronze' && balance.points >= 100 && (
                        <>
                          <div className="text-sm font-bold text-green-300 mb-1">Ready!</div>
                          <div className="text-xs text-green-100/70 font-medium">For Silver</div>
                        </>
                      )}
                      {balance.tier !== 'Bronze' && (
                        <>
                          <div className="text-sm font-bold text-white mb-1">Max</div>
                          <div className="text-xs text-white/70 font-medium">Tier</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

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