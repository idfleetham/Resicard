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
import { generateCustomerAlias } from "@shared/schema";
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
  Shield,
  Edit,
  Save,
  X,
  Trash2,
  Target
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

// TierEditor component for inline editing
function TierEditor({ tier, index, onUpdate, onDelete }: {
  tier: any;
  index: number;
  onUpdate: (tier: any) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tier.name);
  const [editPoints, setEditPoints] = useState(tier.thresholdPoints);

  const handleSave = () => {
    onUpdate({
      ...tier,
      name: editName,
      thresholdPoints: parseInt(editPoints.toString())
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(tier.name);
    setEditPoints(tier.thresholdPoints);
    setIsEditing(false);
  };

  const getTierColor = (index: number) => {
    const colors = ['bg-orange-500', 'bg-gray-400', 'bg-yellow-500', 'bg-purple-500', 'bg-green-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="p-4 rounded-lg border border-border-dim bg-surface/30 hover:bg-surface/40 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-4 h-4 rounded-full ${getTierColor(index)} flex-shrink-0`}></div>
          {isEditing ? (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-bg border-border-dim text-fg"
                placeholder="Tier name"
              />
              <Input
                type="number"
                value={editPoints}
                onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                className="bg-bg border-border-dim text-fg"
                placeholder="Points required"
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white text-base">{tier.name}</h4>
              <p className="text-sm text-gray-300">{tier.thresholdPoints}+ points required</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            {tier.perks?.map((perk: any, i: number) => (
              <Badge key={i} variant="outline" className="text-xs border-gray-400 bg-gray-700/50 text-white">
                {perk.value}% off
              </Badge>
            ))}
          </div>
          {isEditing ? (
            <div className="flex items-center gap-1 ml-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSave}
                className="hover:bg-green-500/20 text-green-400 hover:text-green-300 border border-green-500/30"
              >
                <Save className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancel}
                className="hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 ml-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
                className="hover:bg-blue-500/20 text-fg hover:text-blue-300 border-border-dim bg-surface/50"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete} 
                className="hover:bg-red-500/20 text-red-400 hover:text-red-300 border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoyaltyDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddReward, setShowAddReward] = useState(false);

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

  // Add tier mutation
  const addTierMutation = useMutation({
    mutationFn: async () => {
      const newTier = {
        name: `Tier ${(loyaltyProgram?.tiers.length || 0) + 1}`,
        thresholdPoints: (loyaltyProgram?.tiers[loyaltyProgram.tiers.length - 1]?.thresholdPoints || 0) + 100,
        perks: [{ type: "discount", value: 5, note: "Discount on purchases" }]
      };
      const response = await apiRequest("POST", "/api/loyalty/tiers", newTier);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/program"] });
      toast({
        title: "Tier Added",
        description: "New loyalty tier has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Add Failed",
        description: "Failed to add new tier.",
        variant: "destructive",
      });
    },
  });

  // Update tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async (tier: any) => {
      const response = await apiRequest("PUT", `/api/loyalty/tiers/${tier.id}`, tier);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/program"] });
      toast({
        title: "Tier Updated",
        description: "Tier has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update tier.",
        variant: "destructive",
      });
    },
  });

  // Delete tier mutation
  const deleteTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const response = await apiRequest("DELETE", `/api/loyalty/tiers/${tierId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/program"] });
      toast({
        title: "Tier Deleted",
        description: "Tier has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete tier.",
        variant: "destructive",
      });
    },
  });

  const handleAddTier = () => {
    addTierMutation.mutate();
  };

  const handleUpdateTier = (updatedTier: any) => {
    updateTierMutation.mutate(updatedTier);
  };

  const handleDeleteTier = (tierId: string) => {
    if (loyaltyProgram?.tiers.length && loyaltyProgram.tiers.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "At least one tier must remain in the program.",
        variant: "destructive",
      });
      return;
    }
    deleteTierMutation.mutate(tierId);
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
    <div data-theme="dim" className="min-h-screen bg-bg text-fg">
      <div className="pointer-events-none absolute inset-0 -z-10
          bg-[radial-gradient(1000px_700px_at_10%_-10%,rgba(120,119,198,.12)_0%,transparent_55%),radial-gradient(900px_600px_at_110%_0%,rgba(147,51,234,.10)_0%,transparent_52%)]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 p-6"
      >
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600/30 via-purple-600/25 to-pink-600/20 border border-border-dim p-6 shadow-elev-1 backdrop-blur-sm">
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
              onCheckedChange={(checked) => {
                if (loyaltyProgram) {
                  updateProgramMutation.mutate({ ...loyaltyProgram, active: checked });
                }
              }}
              disabled={updateProgramMutation.isPending}
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Staff Tools
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
                <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1 hover:shadow-elev-2 transition-all duration-300 hover:-translate-y-1">
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
          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1 hover:shadow-elev-2 transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-600/20 via-purple-600/15 to-indigo-600/10 rounded-t-2xl border-b border-border-dim">
              <CardTitle className="text-fg">Quick Actions</CardTitle>
              <CardDescription className="text-soft">Common loyalty program tasks</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => setActiveTab("staff")}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white h-auto p-4 flex-col gap-2"
                >
                  <Zap className="w-6 h-6" />
                  <span>Award Points</span>
                  <span className="text-xs opacity-80">Staff tool for manual awards</span>
                </Button>
                <Button 
                  onClick={() => setActiveTab("rewards")}
                  variant="outline" 
                  className="h-auto p-4 flex-col gap-2 border-dim"
                >
                  <Plus className="w-6 h-6" />
                  <span>Add Reward</span>
                  <span className="text-xs opacity-80">Create new loyalty reward</span>
                </Button>
                <Button 
                  onClick={() => setActiveTab("setup")}
                  variant="outline" 
                  className="h-auto p-4 flex-col gap-2 border-dim"
                >
                  <Crown className="w-6 h-6" />
                  <span>Manage Tiers</span>
                  <span className="text-xs opacity-80">Configure customer tiers</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Program Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1 hover:shadow-elev-2 transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-orange-600/20 via-yellow-600/15 to-amber-600/10 rounded-t-2xl border-b border-border-dim">
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

            <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1 hover:shadow-elev-2 transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-green-600/20 via-emerald-600/15 to-teal-600/10 rounded-t-2xl border-b border-border-dim">
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
          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1 hover:shadow-elev-2 transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-indigo-600/20 via-blue-600/15 to-cyan-600/10 rounded-t-2xl border-b border-border-dim">
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
          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1 hover:shadow-elev-2 transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-yellow-600/20 via-orange-600/15 to-red-600/10 rounded-t-2xl border-b border-border-dim">
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
                  <TierEditor 
                    key={tier.id} 
                    tier={tier} 
                    index={index}
                    onUpdate={(updatedTier) => handleUpdateTier(updatedTier)}
                    onDelete={() => handleDeleteTier(tier.id)}
                  />
                ))}
                <Button 
                  variant="outline" 
                  className="w-full border-dashed border-border-dim hover:bg-surface/50"
                  onClick={handleAddTier}
                  disabled={addTierMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addTierMutation.isPending ? "Adding..." : "Add New Tier"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1 hover:shadow-elev-2 transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-pink-600/20 via-purple-600/15 to-indigo-600/10 rounded-t-2xl border-b border-border-dim">
              <CardTitle className="text-fg flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Rewards Catalog
              </CardTitle>
              <CardDescription className="text-soft">
                Manage rewards that customers can redeem with points or stamps
              </CardDescription>
              <Dialog open={showAddReward} onOpenChange={setShowAddReward}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Reward
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border-dim">
                  <DialogHeader>
                    <DialogTitle className="text-fg">Create New Reward</DialogTitle>
                    <DialogDescription className="text-soft">
                      Add a new reward that customers can redeem with their points or stamps
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-fg">Reward Name</Label>
                      <Input 
                        placeholder="e.g., Free Coffee, 20% Off Meal"
                        className="bg-surface border-border-dim"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-fg">Cost (Points)</Label>
                      <Input 
                        type="number"
                        placeholder="50"
                        className="bg-surface border-border-dim"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-fg">Description</Label>
                      <Input 
                        placeholder="Brief description of the reward"
                        className="bg-surface border-border-dim"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch />
                      <Label className="text-fg">Active (visible to customers)</Label>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button 
                        onClick={() => setShowAddReward(false)}
                        variant="outline" 
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => {
                          setShowAddReward(false);
                          toast({
                            title: "Reward Created",
                            description: "New reward has been added to your catalog.",
                          });
                        }}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                      >
                        Create Reward
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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

        <TabsContent value="staff" className="space-y-6">
          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1 hover:shadow-elev-2 transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-600/20 via-indigo-600/15 to-purple-600/10 rounded-t-2xl border-b border-border-dim">
              <CardTitle className="text-fg flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Staff Earning Tool
              </CardTitle>
              <CardDescription className="text-soft">
                Award points manually to customers for purchases or special events
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-fg font-medium">Customer Phone or Email</Label>
                    <Input 
                      placeholder="Enter customer phone or email"
                      className="bg-surface border-border-dim"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-fg font-medium">Purchase Amount (£)</Label>
                    <Input 
                      type="number"
                      placeholder="0.00"
                      className="bg-surface border-border-dim"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-fg font-medium">Earning Type</Label>
                    <Select>
                      <SelectTrigger className="bg-surface border-border-dim">
                        <SelectValue placeholder="Select earning type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">Purchase (auto-calculated points)</SelectItem>
                        <SelectItem value="visit">Visit (1 stamp)</SelectItem>
                        <SelectItem value="bonus">Bonus Points</SelectItem>
                        <SelectItem value="manual">Manual Award</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <Zap className="w-4 h-4 mr-2" />
                    Award Points
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-surface/30 border border-border-dim">
                    <h4 className="font-semibold text-fg mb-2">Current Customer</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-soft">No customer selected</p>
                      <p className="text-soft">Select a customer to view their loyalty status</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-surface/30 border border-border-dim">
                    <h4 className="font-semibold text-fg mb-2">Earning Preview</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-soft">Points to Award:</span>
                        <span className="text-fg font-medium">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-soft">Stamps to Award:</span>
                        <span className="text-fg font-medium">0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1 hover:shadow-elev-2 transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-green-600/20 via-emerald-600/15 to-teal-600/10 rounded-t-2xl border-b border-border-dim">
              <CardTitle className="text-fg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-soft">
                Latest loyalty transactions and awards
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-3">
                {[
                  { id: 201, username: "john_d", action: "Earned 25 points", amount: "£2.50 purchase", time: "2 minutes ago", type: "earn" },
                  { id: 202, username: "sarah_m", action: "Redeemed Free Coffee", amount: "-50 points", time: "15 minutes ago", type: "redeem" },
                  { id: 203, username: null, action: "Earned 1 stamp", amount: "Visit reward", time: "1 hour ago", type: "stamp" },
                  { id: 204, username: "emma_d", action: "Earned 30 points", amount: "£3.00 purchase", time: "2 hours ago", type: "earn" }
                ].map((activity, index) => {
                  const customerAlias = generateCustomerAlias({ id: activity.id, username: activity.username });
                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-surface/30 border border-border-dim">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          activity.type === 'earn' ? 'bg-green-500' :
                          activity.type === 'redeem' ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-fg">{customerAlias}</p>
                          <p className="text-sm text-soft">{activity.action}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-fg">{activity.amount}</p>
                        <p className="text-xs text-soft">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card className="bg-card/90 border-border-dim rounded-2xl shadow-elev-1 hover:shadow-elev-2 transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-emerald-600/20 via-teal-600/15 to-cyan-600/10 rounded-t-2xl border-b border-border-dim">
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
                {/* Mock customer data with privacy aliases */}
                {[
                  { id: 101, username: "sarah_j", tier: "Gold", points: 450, visits: 12 },
                  { id: 102, username: null, tier: "Silver", points: 180, visits: 8 },
                  { id: 103, username: "emily_d", tier: "Bronze", points: 75, visits: 5 },
                ].map((customer, index) => {
                  const customerAlias = generateCustomerAlias({ id: customer.id, username: customer.username });
                  return (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-surface/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {customerAlias.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-fg">{customerAlias}</p>
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
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </motion.div>
    </div>
  );
}