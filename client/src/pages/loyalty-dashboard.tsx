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
import { useLocation } from "wouter";
import Hero from "@/ui/Hero";
import MetricTile from "@/ui/MetricTile";
import { GradientPanel } from "@/ui/GradientPanel";
import { StatCard } from "@/ui/StatCard";
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
  Target,
  ArrowLeft,
  Home
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface LoyaltyProgramme {
  id: number;
  merchantId: number;
  model: "points" | "stamps";
  pointsPerCurrency: number;
  minBasketEarn: string; // Database stores as text
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
  const [editColor, setEditColor] = useState(tier.color || getDefaultTierColor(index));
  const [editBenefits, setEditBenefits] = useState<Array<{ type: string; value: number; note?: string }>>(
    tier.perks || [{ type: 'discount', value: 5, note: '' }]
  );

  const handleSave = () => {
    onUpdate({
      ...tier,
      name: editName,
      thresholdPoints: parseInt(editPoints.toString()),
      color: editColor,
      perks: editBenefits
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(tier.name);
    setEditPoints(tier.thresholdPoints);
    setEditColor(tier.color || getDefaultTierColor(index));
    setEditBenefits(tier.perks || [{ type: 'discount', value: 5, note: '' }]);
    setIsEditing(false);
  };

  const addBenefit = () => {
    setEditBenefits([...editBenefits, { type: 'discount', value: 5, note: '' }]);
  };

  const updateBenefit = (index: number, field: string, value: any) => {
    const updated = [...editBenefits];
    updated[index] = { ...updated[index], [field]: value };
    setEditBenefits(updated);
  };

  const removeBenefit = (index: number) => {
    setEditBenefits(editBenefits.filter((_, i) => i !== index));
  };

  const getDefaultTierColor = (index: number) => {
    const colors = ['#f97316', '#9ca3af', '#eab308', '#a855f7', '#22c55e']; // orange, gray, yellow, purple, green
    return colors[index % colors.length];
  };

  const getTierColor = (tier: any, index: number) => {
    return tier.color || getDefaultTierColor(index);
  };

  return (
    <div className="p-4 rounded-lg border border-border-dim bg-surface/30 hover:bg-surface/40 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div 
            className="w-4 h-4 rounded-full flex-shrink-0" 
            style={{ backgroundColor: getTierColor(tier, index) }}
          ></div>
          {isEditing ? (
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <div className="flex items-center gap-2">
                  <Label className="text-fg text-sm whitespace-nowrap">Color:</Label>
                  <Input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="bg-bg border-border-dim text-fg w-16 h-10 p-1 cursor-pointer"
                  />
                </div>
              </div>
              
              {/* Benefits Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-fg font-medium text-sm">Tier Benefits</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addBenefit}
                    className="text-xs bg-surface border-border-dim text-fg hover:bg-surface/80"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Benefit
                  </Button>
                </div>
                
                {editBenefits.map((benefit, benefitIndex) => (
                  <div key={benefitIndex} className="grid grid-cols-12 gap-2 items-center p-2 bg-bg/50 rounded border border-border-dim">
                    <div className="col-span-4">
                      <Select 
                        value={benefit.type} 
                        onValueChange={(value) => updateBenefit(benefitIndex, 'type', value)}
                      >
                        <SelectTrigger className="bg-bg border-border-dim text-fg text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discount">% Discount</SelectItem>
                          <SelectItem value="free_item">Free Item</SelectItem>
                          <SelectItem value="early_access">Early Access</SelectItem>
                          <SelectItem value="bonus_points">Bonus Points</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-3">
                      <Input
                        type="number"
                        value={benefit.value}
                        onChange={(e) => updateBenefit(benefitIndex, 'value', parseInt(e.target.value) || 0)}
                        className="bg-bg border-border-dim text-fg text-xs h-8"
                        placeholder="Value"
                      />
                    </div>
                    
                    <div className="col-span-4">
                      <Input
                        value={benefit.note || ''}
                        onChange={(e) => updateBenefit(benefitIndex, 'note', e.target.value)}
                        className="bg-bg border-border-dim text-fg text-xs h-8"
                        placeholder="Description (optional)"
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeBenefit(benefitIndex)}
                        className="hover:bg-red-500/20 text-red-400 hover:text-red-300 h-8 w-8 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddReward, setShowAddReward] = useState(false);

  const { data: loyaltyProgramme, isLoading } = useQuery({
    queryKey: ["/api/loyalty/program"],
    queryFn: () => apiRequest("GET", "/api/loyalty/program").then(res => res.json()) as Promise<LoyaltyProgram>
  });

  const updateProgramMutation = useMutation({
    mutationFn: (data: Partial<LoyaltyProgram>) => 
      apiRequest("POST", "/api/loyalty/program", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/program"] });
      toast({ title: "Loyalty programme updated successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating programme",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleProgram = () => {
    if (loyaltyProgramme) {
      updateProgramMutation.mutate({
        ...loyaltyProgramme,
        active: !loyaltyProgramme.active
      });
    }
  };

  const handleModelChange = (model: "points" | "stamps") => {
    if (loyaltyProgramme) {
      updateProgramMutation.mutate({
        ...loyaltyProgramme,
        model
      });
    }
  };

  const handlePointsPerCurrencyChange = (value: string) => {
    if (loyaltyProgramme) {
      updateProgramMutation.mutate({
        ...loyaltyProgramme,
        pointsPerCurrency: parseInt(value) || 10
      });
    }
  };

  const handleMinBasketChange = (value: string) => {
    if (loyaltyProgramme) {
      updateProgramMutation.mutate({
        ...loyaltyProgramme,
        minBasketEarn: value || "0.00"
      });
    }
  };

  const handleCooldownChange = (value: string) => {
    if (loyaltyProgramme) {
      updateProgramMutation.mutate({
        ...loyaltyProgramme,
        earnCooldownMinutes: parseInt(value) || 30
      });
    }
  };

  const handleDailyCapChange = (value: string) => {
    if (loyaltyProgramme) {
      updateProgramMutation.mutate({
        ...loyaltyProgramme,
        dailyEarnCap: parseInt(value) || 3
      });
    }
  };

  // Add tier mutation
  const addTierMutation = useMutation({
    mutationFn: async () => {
      const tierIndex = loyaltyProgramme?.tiers.length || 0;
      const defaultColors = ['#f97316', '#9ca3af', '#eab308', '#a855f7', '#22c55e']; // orange, gray, yellow, purple, green
      const newTier = {
        name: `Tier ${tierIndex + 1}`,
        thresholdPoints: (loyaltyProgramme?.tiers[loyaltyProgramme.tiers.length - 1]?.thresholdPoints || 0) + 100,
        perks: [{ type: "discount", value: 5, note: "Discount on purchases" }],
        color: defaultColors[tierIndex % defaultColors.length]
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
    if (loyaltyProgramme?.tiers.length && loyaltyProgramme.tiers.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "At least one tier must remain in the programme.",
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
    <div className="min-h-screen bg-app text-fg relative">
      <div className="pointer-events-none absolute inset-0 -z-10
          bg-[radial-gradient(1200px_600px_at_-10%_-10%,rgba(120,119,198,.12)_0%,transparent_55%),radial-gradient(900px_600px_at_110%_0%,rgba(236,72,153,.10)_0%,transparent_52%)]" />
      
      {/* Navigation Bar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 border-b border-white/10 bg-surface/80 backdrop-blur-xl"
      >
        <div className="mx-auto w-full max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/merchant")}
                className="btn btn-ghost text-muted hover:text-fg"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Portal
              </motion.button>
              <div className="w-px h-6 bg-white/10"></div>
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
                  <Star className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h1 className="font-semibold text-fg text-lg">Loyalty Dashboard</h1>
                  <p className="text-xs text-muted">Customer engagement platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${loyaltyProgramme?.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {loyaltyProgramme?.active ? 'Active' : 'Inactive'}
              </div>
              <Switch
                checked={loyaltyProgramme?.active || false}
                onCheckedChange={(checked) => {
                  if (loyaltyProgramme) {
                    updateProgramMutation.mutate({ ...loyaltyProgramme, active: checked });
                  }
                }}
                disabled={updateProgramMutation.isPending}
              />
            </div>
          </div>
        </div>
      </motion.nav>

      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        {/* Header */}
        <Hero 
          title="Loyalty Programme" 
          subtitle="Build customer loyalty with points, stamps, and rewards" 
          right={
            <Switch 
              checked={loyaltyProgramme?.active} 
              className="data-[state=checked]:bg-emerald-500"
            />
          } 
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <TabsList className="grid w-full grid-cols-5 p-1 card"
              style={{ background: 'rgba(18, 20, 30, 0.8)' }}
            >
              <TabsTrigger value="overview" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:text-white data-[state=active]:bg-white/10 data-[state=active]:border-b-2 data-[state=active]:border-brand1 transition-all duration-200">
                <TrendingUp className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="setup" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:text-white data-[state=active]:bg-white/10 data-[state=active]:border-b-2 data-[state=active]:border-brand1 transition-all duration-200">
                <Settings className="w-4 h-4" />
                Setup
              </TabsTrigger>
              <TabsTrigger value="tiers" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:text-white data-[state=active]:bg-white/10 data-[state=active]:border-b-2 data-[state=active]:border-brand1 transition-all duration-200">
                <Crown className="w-4 h-4" />
                Tiers
              </TabsTrigger>
              <TabsTrigger value="rewards" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:text-white data-[state=active]:bg-white/10 data-[state=active]:border-b-2 data-[state=active]:border-brand1 transition-all duration-200">
                <Gift className="w-4 h-4" />
                Rewards
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2 text-white/70 hover:text-white data-[state=active]:text-white data-[state=active]:bg-white/10 data-[state=active]:border-b-2 data-[state=active]:border-brand1 transition-all duration-200">
                <Users className="w-4 h-4" />
                Members
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <motion.div 
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <MetricTile label="Active Members" value="0" delta="0%" icon={<Users className="h-4 w-4 text-white/80" />} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <MetricTile label="Points Earned" value="0" delta="0%" icon={<Star className="h-4 w-4 text-white/80" />} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <MetricTile label="Rewards Claimed" value="0" delta="0%" icon={<Gift className="h-4 w-4 text-white/80" />} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <MetricTile label="Revenue Impact" value="£0" delta="0%" icon={<TrendingUp className="h-4 w-4 text-white/80" />} />
            </motion.div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <GradientPanel>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                <div className="flex gap-3">
                  <motion.button 
                    className="btn btn-primary focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    onClick={() => setActiveTab("staff")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Award Points
                  </motion.button>
                  <motion.button 
                    className="btn btn-ghost focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    onClick={() => setActiveTab("rewards")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reward
                  </motion.button>
                  <motion.button 
                    className="btn btn-ghost focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    onClick={() => setActiveTab("tiers")}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Manage Tiers
                  </motion.button>
                </div>
              </div>
            </GradientPanel>
          </motion.div>

          {/* Program Performance */}
          <motion.div 
            className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <StatCard 
              title="Tier Distribution"
              subtitle="Customer distribution across tiers"
            >
                <div className="space-y-4">
                  {loyaltyProgramme?.tiers.map((tier, index) => (
                    <div key={tier.id} className="flex items-center justify-between py-4 px-3 rounded-lg bg-surface/50 border-b border-white/5 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-orange-500' : 
                          index === 1 ? 'bg-gray-400' : 'bg-yellow-500'
                        }`}></div>
                        <span className="font-medium text-white">{tier.name}</span>
                        <Badge variant="outline" className="text-xs text-white/80 border-white/20">
                          {tier.thresholdPoints}+ pts
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">0</p>
                        <p className="text-xs text-white/70">customers</p>
                      </div>
                    </div>
                  ))}
                </div>
            </StatCard>

            <StatCard 
              title="Popular Rewards"
              subtitle="Most redeemed rewards this month"
            >
              <div className="space-y-4">
                {loyaltyProgramme?.rewards.slice(0, 3).map((reward, index) => (
                  <div key={reward.id} className="flex items-center justify-between py-4 px-3 rounded-lg bg-surface/50 border-b border-white/5 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <Coffee className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="font-medium text-white">{reward.name}</p>
                        <p className="text-xs text-white/70">{reward.costPoints} points</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">0</p>
                      <p className="text-xs text-white/70">redeemed</p>
                    </div>
                  </div>
                ))}
              </div>
            </StatCard>
          </motion.div>
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <StatCard 
            title="Programme Configuration"
            subtitle="Configure your loyalty programme rules and earning mechanics"
          >
            <div className="space-y-6">
              {/* Program Model */}
              <div className="space-y-3">
                <Label className="text-fg font-medium">Programme Model</Label>
                <Select 
                  value={loyaltyProgramme?.model} 
                  onValueChange={handleModelChange}
                >
                  <SelectTrigger className="bg-surface border-dim">
                    <SelectValue placeholder="Select programme type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">Points (£1 = X points)</SelectItem>
                    <SelectItem value="stamps">Stamps (visit-based)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-soft">
                  Points reward spending, stamps reward visits
                </p>
              </div>

              {/* Earning Rules */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loyaltyProgramme?.model !== 'stamps' && (
                  <div className="space-y-3">
                    <Label className="text-fg font-medium">Points per £1</Label>
                    <Input 
                      type="number" 
                      value={loyaltyProgramme?.pointsPerCurrency || 10}
                      onChange={(e) => handlePointsPerCurrencyChange(e.target.value)}
                      className="bg-surface border-dim"
                      placeholder="e.g. 10"
                    />
                  </div>
                )}
                
                {loyaltyProgramme?.model === 'stamps' && (
                  <div className="space-y-3">
                    <Label className="text-fg font-medium">£ Spending per Stamp</Label>
                    <Input 
                      type="number" 
                      value={loyaltyProgramme?.minBasketEarn || "5.00"}
                      onChange={(e) => handleMinBasketChange(e.target.value)}
                      className="bg-surface border-dim"
                      placeholder="e.g. 5.00"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-fg font-medium">
                    {loyaltyProgramme?.model === 'stamps' ? 'Minimum Visit Spend (£)' : 'Minimum Basket (£)'}
                  </Label>
                  <Input 
                    type="number" 
                    value={loyaltyProgramme?.minBasketEarn || "0.00"}
                    onChange={(e) => handleMinBasketChange(e.target.value)}
                    className="bg-surface border-dim"
                    placeholder="e.g. 0.00"
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
                      value={loyaltyProgramme?.earnCooldownMinutes || 30}
                      onChange={(e) => handleCooldownChange(e.target.value)}
                      className="bg-surface border-dim"
                      placeholder="e.g. 30"
                    />
                    <p className="text-xs text-soft">Prevent rapid successive earning</p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-fg font-medium">Daily Earn Cap</Label>
                    <Input 
                      type="number" 
                      value={loyaltyProgramme?.dailyEarnCap || 3}
                      onChange={(e) => handleDailyCapChange(e.target.value)}
                      className="bg-surface border-dim"
                      placeholder="e.g. 3"
                    />
                    <p className="text-xs text-soft">Max times per customer per day</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => updateProgramMutation.mutate(loyaltyProgramme!)}
                disabled={updateProgramMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
              >
                {updateProgramMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </StatCard>

        </TabsContent>

        <TabsContent value="tiers" className="space-y-6">
          <StatCard 
            title="Customer Tiers"
            subtitle="Set up tiers with point thresholds and exclusive perks"
          >
              <div className="space-y-4">
                {loyaltyProgramme?.tiers.map((tier, index) => (
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
                  className="w-full border-dashed border-border-dim hover:bg-surface/50 text-fg bg-surface/20 hover:text-fg"
                  onClick={handleAddTier}
                  disabled={addTierMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addTierMutation.isPending ? "Adding..." : "Add New Tier"}
                </Button>
              </div>
          </StatCard>

          {/* Tier Benefits Preview */}
          <StatCard 
            title="Tier Benefits Preview"
            subtitle="Preview what customers see for each tier"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loyaltyProgramme?.tiers.map((tier, index) => {
                const getDefaultTierColor = (index: number) => {
                  const colors = ['#f97316', '#9ca3af', '#eab308', '#a855f7', '#22c55e']; // orange, gray, yellow, purple, green
                  return colors[index % colors.length];
                };
                const tierColor = tier.color || getDefaultTierColor(index);

                return (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    <div 
                      className="p-6 rounded-xl text-white shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${tierColor}, ${tierColor}dd)` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <Crown className="w-8 h-8 opacity-80" />
                        <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                          {tier.thresholdPoints}+ pts
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                      <p className="text-white/90 text-sm mb-4">
                        Unlock at {tier.thresholdPoints} points
                      </p>
                      
                      {/* Perks List */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-white/80 uppercase tracking-wide">Benefits</p>
                        {tier.perks && tier.perks.length > 0 ? (
                          <ul className="space-y-1">
                            {tier.perks.slice(0, 3).map((perk, perkIndex) => (
                              <li key={perkIndex} className="text-sm text-white/90 flex items-center gap-2">
                                <Percent className="w-3 h-3" />
                                {perk.type === 'discount' ? `${perk.value}% off all orders` : 
                                 perk.type === 'free_item' ? `Free ${perk.note || 'item'}` :
                                 perk.type === 'early_access' ? 'Early access to offers' :
                                 `${perk.value} bonus points`}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-white/70 italic">No benefits configured</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </StatCard>

          {/* Tier Analytics */}
          <StatCard 
            title="Tier Performance"
            subtitle="Customer distribution and engagement by tier"
          >
            <div className="space-y-6">
              {loyaltyProgramme?.tiers.map((tier, index) => {
                const customerCount = 0;
                const avgSpend = "0.00";
                const progressPercentage = Math.min(100, (customerCount / 120) * 100);

                return (
                  <div key={tier.id} className="p-4 rounded-lg bg-surface/30 border border-border-dim">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${
                          index === 0 ? 'bg-orange-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-yellow-500' : 'bg-purple-500'
                        }`}></div>
                        <h4 className="font-semibold text-white">{tier.name}</h4>
                        <Badge variant="outline" className="text-xs text-white/80 border-white/20">
                          {tier.thresholdPoints}+ pts
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{customerCount}</p>
                        <p className="text-xs text-white/70">customers</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">£{avgSpend}</p>
                        <p className="text-xs text-white/70">Avg. monthly spend</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">0</p>
                        <p className="text-xs text-white/70">Visits per month</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">0</p>
                        <p className="text-xs text-white/70">Rewards redeemed</p>
                      </div>
                    </div>

                    {/* Progress bar showing tier distribution */}
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          index === 0 ? 'bg-orange-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-yellow-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </StatCard>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          <StatCard 
            title="Rewards Catalog"
            subtitle="Manage rewards that customers can redeem with points or stamps"
          >
            <div className="mb-6">
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
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loyaltyProgramme?.rewards.map((reward) => (
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
          </StatCard>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <StatCard 
            title="Staff Earning Tool"
            subtitle="Award points manually to customers for purchases or special events"
          >
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
          </StatCard>

          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <StatCard 
              title="Recent Activity"
              subtitle="Latest loyalty transactions and awards"
            >
              <div className="space-y-3">
                {[].map((activity, index) => {
                  const customerAlias = generateCustomerAlias({ id: activity.id, username: activity.username });
                  return (
                    <div key={index} className="flex items-center justify-between py-4 px-3 rounded-lg bg-surface/30 border border-border-dim divide-y divide-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          activity.type === 'earn' ? 'bg-green-500' :
                          activity.type === 'redeem' ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-white">{customerAlias}</p>
                          <p className="text-sm text-white/80">{activity.action}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{activity.amount}</p>
                        <p className="text-xs text-white/70">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </StatCard>
          </motion.div>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="card card-hover p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20">
                <Users className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Loyalty Members</h3>
                <p className="text-white/80 text-sm">View and manage your loyalty programme members</p>
              </div>
            </div>
            <div className="space-y-4">
              {/* No customer data yet - will populate when real loyalty members join */}
              {[].map((customer, index) => {
                const customerAlias = generateCustomerAlias({ id: customer.id, username: customer.username });
                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center justify-between py-4 px-6 rounded-xl bg-surface/40 border border-white/5 hover:bg-surface/60 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                        {customerAlias.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-lg">{customerAlias}</p>
                        <p className="text-sm text-white/80">{customer.tier} tier • {customer.visits} visits</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white text-xl">{customer.points}</p>
                      <p className="text-xs text-white/70 mb-2">points</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn btn-ghost text-xs px-3 py-1 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                      >
                        Award Points
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}