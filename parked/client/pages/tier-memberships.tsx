import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Crown, Star, Award, Gem, Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

export default function TierMemberships() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);

  // For now, let's use a mock merchant ID - in a real app this would come from navigation or props
  const mockMerchantId = "52e9f857-5b2f-4164-b266-b7c1b86267dd"; // Seaton House merchant ID

  const { data: availableTiers = [], isLoading } = useQuery({
    queryKey: ["/api/tiers/available", mockMerchantId],
    enabled: !!mockMerchantId,
  });

  const getTierIcon = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'bronze': return <Award className="w-6 h-6" style={{color: '#cd7f32'}} />;
      case 'silver': return <Star className="w-6 h-6" style={{color: '#c0c0c0'}} />;
      case 'gold': return <Crown className="w-6 h-6" style={{color: '#ffd700'}} />;
      case 'platinum': return <Gem className="w-6 h-6" style={{color: '#e5e4e2'}} />;
      default: return <Award className="w-6 h-6" />;
    }
  };

  const getTierGradient = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'bronze': return 'from-amber-700 to-orange-600';
      case 'silver': return 'from-gray-400 to-gray-600';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'platinum': return 'from-gray-300 to-gray-500';
      default: return 'from-blue-500 to-purple-600';
    }
  };

  const handlePurchase = (tierId: string, price: number) => {
    // This will integrate with Stripe payment processing
    console.log('Purchasing tier:', tierId, 'for', price);
    // TODO: Implement Stripe payment flow
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Premium Tier Memberships
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Unlock exclusive benefits and enhanced rewards with annual tier memberships. 
            Skip the points requirements and enjoy premium perks immediately.
          </p>
        </motion.div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {availableTiers.map((tier: any, index: number) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden bg-white/10 backdrop-blur-lg border border-white/20 hover:border-white/40 transition-all duration-300 hover:transform hover:scale-105">
                {/* Tier Badge */}
                <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${getTierGradient(tier.name)}`} />
                
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    {getTierIcon(tier.name)}
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">
                    {tier.name} Tier
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    {tier.description || `Premium ${tier.name.toLowerCase()} benefits`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Price */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      £{parseFloat(tier.annualPrice).toFixed(2)}
                    </div>
                    <div className="text-sm text-slate-400">per year</div>
                  </div>

                  <Separator className="bg-white/20" />

                  {/* Benefits */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-slate-200">
                        {tier.discountPercent}% discount on all purchases
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-slate-200">
                        {tier.pointsMultiplier}x points multiplier
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-slate-200">
                        Access to tier-exclusive offers
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-slate-200">
                        Priority customer support
                      </span>
                    </div>
                    {tier.name.toLowerCase() === 'platinum' && (
                      <div className="flex items-center space-x-3">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-slate-200">
                          VIP event invitations
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-white/20" />

                  {/* Current Status */}
                  <div className="text-center">
                    <Badge variant="outline" className="border-slate-400 text-slate-300">
                      Requires {tier.thresholdPoints}+ points normally
                    </Badge>
                  </div>

                  {/* Purchase Button */}
                  <Button
                    onClick={() => handlePurchase(tier.id, parseFloat(tier.annualPrice))}
                    className={`w-full bg-gradient-to-r ${getTierGradient(tier.name)} hover:opacity-90 text-white font-semibold py-3 rounded-lg transition-all duration-200`}
                  >
                    Purchase Annual Membership
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {availableTiers.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              No Tier Memberships Available
            </h3>
            <p className="text-slate-300 max-w-md mx-auto">
              This merchant hasn't set up tier memberships for purchase yet. 
              Check back later or contact them directly.
            </p>
          </motion.div>
        )}

        {/* Benefits Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16"
        >
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white text-center">
                How Tier Memberships Work
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl mb-2">💳</div>
                <h4 className="font-semibold text-white mb-2">Purchase Annually</h4>
                <p className="text-slate-300 text-sm">
                  Buy a full year membership and get instant access to tier benefits
                </p>
              </div>
              <div>
                <div className="text-2xl mb-2">🎯</div>
                <h4 className="font-semibold text-white mb-2">Skip Points Requirements</h4>
                <p className="text-slate-300 text-sm">
                  No need to earn points first - get premium benefits immediately
                </p>
              </div>
              <div>
                <div className="text-2xl mb-2">🔄</div>
                <h4 className="font-semibold text-white mb-2">Auto-Renewal</h4>
                <p className="text-slate-300 text-sm">
                  Your membership renews automatically, or you can cancel anytime
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}