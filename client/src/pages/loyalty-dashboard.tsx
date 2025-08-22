import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  Star, 
  Award, 
  TrendingUp, 
  Users, 
  Gift, 
  Settings, 
  Plus,
  Crown,
  Zap,
  Coffee,
  Percent,
  Clock,
  Shield
} from "lucide-react";

interface LoyaltyProgram {
  id: string;
  merchantId: string;
  model: "points" | "stamps" | "hybrid";
  pointsPerCurrency: number;
  minBasketEarn: number;
  earnCooldownMinutes: number;
  dailyEarnCap: number;
  active: boolean;
  tiers: Array<{
    id: string;
    name: string;
    thresholdPoints: number;
    perks: Array<{ type: string; value: number; note?: string }>;
  }>;
  rewards: Array<{
    id: string;
    name: string;
    costPoints: number;
    active: boolean;
  }>;
}

export default function LoyaltyDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: loyaltyProgram, isLoading } = useQuery({
    queryKey: ["/api/loyalty/program"],
    queryFn: () => apiRequest("GET", "/api/loyalty/program").then(res => res.json()) as Promise<LoyaltyProgram>
  });

  const updateProgramMutation = useMutation({
    mutationFn: (data: Partial<LoyaltyProgram>) => 
      apiRequest("POST", "/api/loyalty/program", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/program"] });
      toast({ title: "Loyalty program updated successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating program",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleProgram = () => {
    if (loyaltyProgram) {
      updateProgramMutation.mutate({
        ...loyaltyProgram,
        active: !loyaltyProgram.active
      });
    }
  };

  const handleModelChange = (model: "points" | "stamps" | "hybrid") => {
    if (loyaltyProgram) {
      updateProgramMutation.mutate({
        ...loyaltyProgram,
        model
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-surface rounded w-1/4"></div>
                <div className="h-8 bg-surface rounded w-3/4"></div>
                <div className="h-4 bg-surface rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 p-6"
    >
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-500/25 via-blue-500/20 to-teal-500/25 border border-border-dim p-6 shadow-elev-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-fg flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-400" />
              Loyalty Program
            </h1>
            <p className="text-soft mt-2">Build customer loyalty with points, stamps, and rewards</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className={`${loyaltyProgram?.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} border-0`}>
              {loyaltyProgram?.active ? 'Active' : 'Inactive'}
            </Badge>
            <Switch
              checked={loyaltyProgram?.active || false}
              onCheckedChange={handleToggleProgram}
              disabled={updateProgramMutation.isPending}
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Rewards
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { 
                title: "Active Members", 
                value: "247", 
                icon: Users, 
                change: "+12%",
                gradient: "from-blue-500/70 to-blue-600/70" 
              },
              { 
                title: "Points Earned", 
                value: "12,450", 
                icon: Star, 
                change: "+8%",
                gradient: "from-yellow-500/70 to-yellow-600/70" 
              },
              { 
                title: "Rewards Claimed", 
                value: "89", 
                icon: Gift, 
                change: "+15%",
                gradient: "from-green-500/70 to-green-600/70" 
              },
              { 
                title: "Revenue Impact", 
                value: "£2,340", 
                icon: TrendingUp, 
                change: "+22%",
                gradient: "from-purple-500/70 to-purple-600/70" 
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-soft text-sm">{stat.title}</p>
                        <p className="text-2xl font-bold text-fg mt-1">{stat.value}</p>
                        <Badge className="bg-green-500/20 text-green-400 border-0 mt-2">
                          {stat.change}
                        </Badge>
                      </div>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-elev-1`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1">
            <CardHeader>
              <CardTitle className="text-fg">Quick Actions</CardTitle>
              <CardDescription className="text-soft">Common loyalty program tasks</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white h-auto p-4 flex-col gap-2">
                  <Zap className="w-6 h-6" />
                  <span>Award Points</span>
                  <span className="text-xs opacity-80">Staff tool for manual awards</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex-col gap-2 border-dim">
                  <Plus className="w-6 h-6" />
                  <span>Add Reward</span>
                  <span className="text-xs opacity-80">Create new loyalty reward</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex-col gap-2 border-dim">
                  <Crown className="w-6 h-6" />
                  <span>Manage Tiers</span>
                  <span className="text-xs opacity-80">Configure customer tiers</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Program Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1">
              <CardHeader>
                <CardTitle className="text-fg">Tier Distribution</CardTitle>
                <CardDescription className="text-soft">Customer distribution across tiers</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-4">
                  {loyaltyProgram?.tiers.map((tier, index) => (
                    <div key={tier.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-orange-500' : 
                          index === 1 ? 'bg-gray-400' : 'bg-yellow-500'
                        }`}></div>
                        <span className="font-medium text-fg">{tier.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {tier.thresholdPoints}+ pts
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-fg">{Math.floor(Math.random() * 100) + 20}</p>
                        <p className="text-xs text-soft">customers</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1">
              <CardHeader>
                <CardTitle className="text-fg">Popular Rewards</CardTitle>
                <CardDescription className="text-soft">Most redeemed rewards this month</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="space-y-4">
                  {loyaltyProgram?.rewards.slice(0, 3).map((reward, index) => (
                    <div key={reward.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                      <div className="flex items-center gap-3">
                        <Coffee className="w-5 h-5 text-brown-500" />
                        <div>
                          <p className="font-medium text-fg">{reward.name}</p>
                          <p className="text-xs text-soft">{reward.costPoints} points</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-fg">{Math.floor(Math.random() * 50) + 10}</p>
                        <p className="text-xs text-soft">redeemed</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1">
            <CardHeader>
              <CardTitle className="text-fg">Program Configuration</CardTitle>
              <CardDescription className="text-soft">
                Configure your loyalty program rules and earning mechanics
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-6">
              {/* Program Model */}
              <div className="space-y-3">
                <Label className="text-fg font-medium">Program Model</Label>
                <Select 
                  value={loyaltyProgram?.model} 
                  onValueChange={handleModelChange}
                >
                  <SelectTrigger className="bg-surface border-dim">
                    <SelectValue placeholder="Select program type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">Points (£1 = X points)</SelectItem>
                    <SelectItem value="stamps">Stamps (visit-based)</SelectItem>
                    <SelectItem value="hybrid">Hybrid (points + stamps)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-soft">
                  Points reward spending, stamps reward visits, hybrid combines both
                </p>
              </div>

              {/* Earning Rules */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-fg font-medium">Points per £1</Label>
                  <Input 
                    type="number" 
                    value={loyaltyProgram?.pointsPerCurrency || 10}
                    className="bg-surface border-dim"
                    disabled={loyaltyProgram?.model === 'stamps'}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-fg font-medium">Minimum Basket (£)</Label>
                  <Input 
                    type="number" 
                    value={loyaltyProgram?.minBasketEarn || 0}
                    className="bg-surface border-dim"
                  />
                </div>
              </div>

              {/* Anti-Gaming Rules */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-fg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Anti-Gaming Protection
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-fg font-medium">Earn Cooldown (minutes)</Label>
                    <Input 
                      type="number" 
                      value={loyaltyProgram?.earnCooldownMinutes || 30}
                      className="bg-surface border-dim"
                    />
                    <p className="text-xs text-soft">Prevent rapid successive earning</p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-fg font-medium">Daily Earn Cap</Label>
                    <Input 
                      type="number" 
                      value={loyaltyProgram?.dailyEarnCap || 3}
                      className="bg-surface border-dim"
                    />
                    <p className="text-xs text-soft">Max times per customer per day</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => updateProgramMutation.mutate(loyaltyProgram!)}
                disabled={updateProgramMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
              >
                {updateProgramMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>

          {/* Tiers Configuration */}
          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1">
            <CardHeader>
              <CardTitle className="text-fg flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Customer Tiers
              </CardTitle>
              <CardDescription className="text-soft">
                Set up tiers with point thresholds and exclusive perks
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                {loyaltyProgram?.tiers.map((tier, index) => (
                  <div key={tier.id} className="p-4 rounded-lg border-border-dim bg-surface/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${
                          index === 0 ? 'bg-orange-500' : 
                          index === 1 ? 'bg-gray-400' : 'bg-yellow-500'
                        }`}></div>
                        <div>
                          <h4 className="font-semibold text-fg">{tier.name}</h4>
                          <p className="text-sm text-soft">{tier.thresholdPoints}+ points required</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {tier.perks.map((perk, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {perk.value}% off
                          </Badge>
                        ))}
                        <Button variant="ghost" size="sm">Edit</Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full border-dashed border-dim">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Tier
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1">
            <CardHeader>
              <CardTitle className="text-fg flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Rewards Catalog
              </CardTitle>
              <CardDescription className="text-soft">
                Manage rewards that customers can redeem with points or stamps
              </CardDescription>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add New Reward
              </Button>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loyaltyProgram?.rewards.map((reward) => (
                  <div key={reward.id} className="p-4 rounded-lg border-border-dim bg-surface/30">
                    <div className="flex items-start justify-between mb-3">
                      <Coffee className="w-8 h-8 text-brown-500" />
                      <Switch checked={reward.active} />
                    </div>
                    <h4 className="font-semibold text-fg mb-1">{reward.name}</h4>
                    <p className="text-sm text-soft mb-3">{reward.costPoints} points required</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">
                        Stats
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1">
            <CardHeader>
              <CardTitle className="text-fg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Loyalty Members
              </CardTitle>
              <CardDescription className="text-soft">
                View and manage your loyalty program members
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                {/* Mock customer data */}
                {[
                  { name: "Sarah Johnson", tier: "Gold", points: 450, visits: 12 },
                  { name: "Mike Chen", tier: "Silver", points: 180, visits: 8 },
                  { name: "Emily Davis", tier: "Bronze", points: 75, visits: 5 },
                ].map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-surface/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {customer.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-fg">{customer.name}</p>
                        <p className="text-sm text-soft">{customer.tier} tier • {customer.visits} visits</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-fg">{customer.points} points</p>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Award Points
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}