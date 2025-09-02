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
              {merchantLogo || merchantDetails?.logoUrl ? (
                <img 
                  src={merchantLogo || merchantDetails?.logoUrl} 
                  alt={merchantName} 
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
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
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, 0, -2, 0]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <PulsingBadge isActive={true}>
                  <Badge className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white border-2 border-amber-300 shadow-xl shadow-amber-500/50 px-4 py-2 font-bold text-sm">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="mr-2"
                    >
                      <Crown className="w-4 h-4" />
                    </motion.div>
                    <ShimmerText>
                      <span className="drop-shadow-lg">{balance.tier} Tier</span>
                    </ShimmerText>
                  </Badge>
                </PulsingBadge>
              </motion.div>
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
              {/* Balance Display - Show only points OR stamps based on program type */}
              <div className="text-center">
                {program?.model === 'stamps' ? (
                  <motion.div 
                    className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <PulsingBadge isActive={balance && balance.stamps > 0}>
                      <div className="text-4xl font-bold text-fg mb-2">
                        <AnimatedPointCounter 
                          currentPoints={0}
                          targetPoints={balance?.stamps || 0}
                        />
                      </div>
                    </PulsingBadge>
                    <div className="text-sm text-soft font-medium">Stamps Collected</div>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="relative p-8 rounded-3xl bg-gradient-to-br from-amber-400/20 via-orange-500/20 to-red-500/20 border-2 border-amber-400/40 shadow-xl shadow-amber-500/20 overflow-hidden backdrop-blur-sm"
                    whileHover={{ scale: 1.05, rotateY: 5 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  >
                    {/* Animated background glow */}
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-orange-500/10 to-yellow-400/10 rounded-3xl"
                      animate={{ 
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    
                    <div className="relative z-10">
                      <PulsingBadge isActive={balance && balance.points > 0}>
                        <motion.div 
                          className="text-6xl font-black text-white mb-3 drop-shadow-2xl"
                          animate={{ 
                            textShadow: [
                              "0 0 20px rgba(251, 191, 36, 0.8)",
                              "0 0 40px rgba(251, 191, 36, 0.4)",
                              "0 0 20px rgba(251, 191, 36, 0.8)"
                            ]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <AnimatedPointCounter 
                            currentPoints={0}
                            targetPoints={balance?.points || 0}
                          />
                        </motion.div>
                      </PulsingBadge>
                      <motion.div 
                        className="text-lg text-amber-100 font-bold tracking-wide uppercase"
                        animate={{ opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        Points Earned
                      </motion.div>
                    </div>
                    
                    {/* Sparkle effects */}
                    <motion.div
                      className="absolute top-2 right-2 w-2 h-2 bg-yellow-300 rounded-full"
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-amber-200 rounded-full"
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                    />
                    <motion.div
                      className="absolute top-1/2 right-1/4 w-1 h-1 bg-orange-300 rounded-full"
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                    />
                  </motion.div>
                )}
              </div>

              {/* Premium Tier Display */}
              {balance?.tier && (
                <motion.div 
                  className="mt-6 p-6 rounded-3xl bg-gradient-to-r from-yellow-600/30 via-amber-500/30 to-orange-600/30 border-2 border-amber-400/50 shadow-2xl shadow-amber-500/25 backdrop-blur-sm relative overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* Animated shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ 
                            rotate: [0, 10, 0, -10, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Crown className="w-6 h-6 text-amber-300 drop-shadow-lg" />
                        </motion.div>
                        <motion.span 
                          className="text-xl font-bold text-white tracking-wide drop-shadow-lg"
                          animate={{ 
                            textShadow: [
                              "0 0 10px rgba(251, 191, 36, 0.8)",
                              "0 0 20px rgba(251, 191, 36, 0.4)",
                              "0 0 10px rgba(251, 191, 36, 0.8)"
                            ]
                          }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          {balance.tier} Tier
                        </motion.span>
                      </div>
                      <motion.div
                        animate={{ 
                          boxShadow: [
                            "0 0 20px rgba(34, 197, 94, 0.5)",
                            "0 0 30px rgba(34, 197, 94, 0.3)",
                            "0 0 20px rgba(34, 197, 94, 0.5)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold px-4 py-2 shadow-lg">
                          ✨ Active
                        </Badge>
                      </motion.div>
                    </div>
                    
                    {/* Enhanced progression hint */}
                    <motion.div 
                      className="mt-4 text-sm text-amber-100 font-medium"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {balance.tier === 'Bronze' && balance.points >= 100 && (
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          </motion.div>
                          <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent font-bold">
                            🚀 Almost there! Silver tier is within reach!
                          </span>
                        </div>
                      )}
                      {balance.tier === 'Bronze' && balance.points < 100 && (
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ 
                              y: [0, -2, 0],
                              rotate: [0, 5, -5, 0]
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                          </motion.div>
                          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent font-bold">
                            💎 {100 - (balance.points || 0)} more points for Silver tier!
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </div>
                  
                  {/* Floating particles */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-amber-300 rounded-full"
                      style={{
                        top: `${20 + i * 30}%`,
                        right: `${10 + i * 15}%`
                      }}
                      animate={{
                        y: [0, -10, 0],
                        opacity: [0.3, 1, 0.3],
                        scale: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 2 + i * 0.5,
                        repeat: Infinity,
                        delay: i * 0.3
                      }}
                    />
                  ))}
                </motion.div>
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