import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import CreateDealModal from "@/components/create-deal-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Ticket, 
  Users, 
  ChartLine, 
  Percent, 
  Plus, 
  BarChart3, 
  Download, 
  Edit, 
  Pause, 
  Play, 
  Trash2, 
  Copy,
  MapPin
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequestWithAuth } from "@/lib/auth";
import { formatCurrency, formatDate, formatRelativeTime, getDealCategoryColor, getStatusColor } from "@/lib/utils";
import type { Deal, Redemption } from "@shared/schema";

export default function MerchantDashboard() {
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch merchant's deals
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['/api/deals/merchant', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequestWithAuth('GET', `/api/deals/merchant/${user.id}`);
      return response.json() as Promise<Deal[]>;
    },
    enabled: !!user,
  });

  // Fetch merchant's revenue
  const { data: revenueData } = useQuery({
    queryKey: ['/api/analytics/merchant', user?.id, 'revenue'],
    queryFn: async () => {
      if (!user) return { revenue: 0 };
      const response = await apiRequestWithAuth('GET', `/api/analytics/merchant/${user.id}/revenue`);
      return response.json() as Promise<{ revenue: number }>;
    },
    enabled: !!user,
  });

  // Fetch merchant's redemptions
  const { data: redemptions = [] } = useQuery({
    queryKey: ['/api/redemptions/merchant', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequestWithAuth('GET', `/api/redemptions/merchant/${user.id}`);
      return response.json() as Promise<Redemption[]>;
    },
    enabled: !!user,
  });

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async ({ dealId, updates }: { dealId: number; updates: Partial<Deal> }) => {
      const response = await apiRequestWithAuth('PUT', `/api/deals/${dealId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Updated",
        description: "Deal has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deals/merchant'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update deal",
        variant: "destructive",
      });
    },
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: number) => {
      const response = await apiRequestWithAuth('DELETE', `/api/deals/${dealId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Deleted",
        description: "Deal has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deals/merchant'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete deal",
        variant: "destructive",
      });
    },
  });

  const handleToggleDeal = (dealId: number, isActive: boolean) => {
    updateDealMutation.mutate({ dealId, updates: { isActive: !isActive } });
  };

  const handleDeleteDeal = (dealId: number) => {
    if (confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
      deleteDealMutation.mutate(dealId);
    }
  };

  const getDealStatus = (deal: Deal) => {
    const isExpired = new Date(deal.expiryDate) < new Date();
    const isFullyUsed = deal.usageCount >= deal.usageLimit;
    
    if (isExpired) return 'expired';
    if (isFullyUsed) return 'fully-used';
    if (!deal.isActive) return 'paused';
    return 'active';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'fully-used': return 'Fully Used';
      case 'paused': return 'Paused';
      default: return 'Unknown';
    }
  };

  // Calculate stats
  const activeDeals = deals.filter(d => d.isActive && new Date(d.expiryDate) > new Date());
  const totalRedemptions = redemptions.length;
  const thisWeekRedemptions = redemptions.filter(r => {
    const redemptionDate = new Date(r.redeemedAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return redemptionDate > weekAgo;
  });

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Please log in to access your dashboard.</p>
          </div>
        </div>
      </>
    );
  }

  if (!user.isVerified) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8 text-center">
              <div className="bg-amber-100 p-4 rounded-full inline-block mb-4">
                <Users className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Pending Verification</h2>
              <p className="text-muted-foreground mb-4">
                Your business application is currently under review by our admin team. 
                You'll receive an email notification once your account is verified.
              </p>
              <Badge className="bg-amber-100 text-amber-800">
                Verification Pending
              </Badge>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Merchant Header */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <img 
                    src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop" 
                    alt="Business" 
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="ml-4">
                    <h1 className="text-2xl font-bold text-foreground">
                      {user.businessName || user.username}
                    </h1>
                    <p className="text-muted-foreground">Verified Business • Member since 2023</p>
                    {user.businessAddress && (
                      <div className="flex items-center mt-1">
                        <MapPin className="h-4 w-4 text-muted-foreground mr-1" />
                        <span className="text-sm text-muted-foreground">{user.businessAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(revenueData?.revenue || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Revenue this month</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Ticket className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Active Deals</p>
                    <p className="text-2xl font-bold text-foreground">{activeDeals.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Total Redemptions</p>
                    <p className="text-2xl font-bold text-foreground">{totalRedemptions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <ChartLine className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold text-foreground">{thisWeekRedemptions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-amber-100 p-3 rounded-lg">
                    <Percent className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Commission Rate</p>
                    <p className="text-2xl font-bold text-foreground">12%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => setShowCreateDeal(true)}
                  className="coastal-gradient p-4 h-auto text-left"
                >
                  <div className="flex items-start">
                    <Plus className="h-6 w-6 mr-4 mt-1" />
                    <div>
                      <div className="font-semibold">Create New Deal</div>
                      <div className="text-sm opacity-90">Add a new offer for customers</div>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  variant="secondary"
                  className="bg-slate-600 text-white hover:bg-slate-700 p-4 h-auto text-left"
                >
                  <div className="flex items-start">
                    <BarChart3 className="h-6 w-6 mr-4 mt-1" />
                    <div>
                      <div className="font-semibold">View Analytics</div>
                      <div className="text-sm opacity-90">Detailed performance reports</div>
                    </div>
                  </div>
                </Button>
                
                <Button 
                  variant="secondary"
                  className="bg-green-600 text-white hover:bg-green-700 p-4 h-auto text-left"
                >
                  <div className="flex items-start">
                    <Download className="h-6 w-6 mr-4 mt-1" />
                    <div>
                      <div className="font-semibold">Export Data</div>
                      <div className="text-sm opacity-90">Download redemption data</div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Deals Management */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Manage Your Deals</h2>
                <Button 
                  onClick={() => setShowCreateDeal(true)}
                  className="coastal-gradient"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Deal
                </Button>
              </div>

              {dealsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="h-6 bg-muted rounded w-1/4" />
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-4 bg-muted rounded w-1/2" />
                        </div>
                        <div className="flex space-x-2">
                          <div className="h-8 w-8 bg-muted rounded" />
                          <div className="h-8 w-8 bg-muted rounded" />
                          <div className="h-8 w-8 bg-muted rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : deals.length > 0 ? (
                <div className="space-y-4">
                  {deals.map((deal) => {
                    const status = getDealStatus(deal);
                    const usagePercentage = (deal.usageCount / deal.usageLimit) * 100;
                    
                    return (
                      <div key={deal.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-lg font-semibold text-foreground">{deal.title}</h3>
                              <Badge className={`ml-3 ${getStatusColor(status)}`}>
                                {getStatusText(status)}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground mb-2">{deal.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>
                                <Users className="h-4 w-4 inline mr-1" />
                                {deal.usageCount} of {deal.usageLimit} used
                              </span>
                              <span>
                                <Badge className={getDealCategoryColor(deal.category)}>
                                  {deal.category}
                                </Badge>
                              </span>
                              <span>{formatRelativeTime(deal.expiryDate)}</span>
                              {deal.originalValue && (
                                <span>{formatCurrency(Number(deal.originalValue))} value</span>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleToggleDeal(deal.id, deal.isActive)}
                              className={deal.isActive ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}
                              disabled={updateDealMutation.isPending}
                            >
                              {deal.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteDeal(deal.id)}
                              className="text-destructive hover:text-destructive/80"
                              disabled={deleteDealMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 bg-muted rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Usage Progress</span>
                            <span className="text-sm font-medium text-foreground">
                              {Math.round(usagePercentage)}%
                            </span>
                          </div>
                          <div className="mt-2">
                            <Progress 
                              value={usagePercentage} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No deals yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first deal to start attracting customers.
                  </p>
                  <Button 
                    onClick={() => setShowCreateDeal(true)}
                    className="coastal-gradient"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Deal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateDealModal 
        isOpen={showCreateDeal} 
        onClose={() => setShowCreateDeal(false)} 
      />
    </>
  );
}
