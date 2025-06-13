import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import DealCard from "@/components/deal-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Ticket, CheckCircle, PiggyBank, Calendar, MapPin, Filter, Settings, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequestWithAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DealWithMerchant, Redemption, VoucherWithDeal } from "@shared/schema";
import mapImage from "@assets/Geddy-Map-smaller_1749767170608.jpeg";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DigitalMembershipCard from "@/components/digital-membership-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ResidentDashboard() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("deals");
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherWithDeal | null>(null);
  const [showRedemptionCard, setShowRedemptionCard] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch deals
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['/api/deals', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory && selectedCategory !== "all" ? `/api/deals?category=${selectedCategory}` : '/api/deals';
      const response = await fetch(url);
      return response.json() as Promise<DealWithMerchant[]>;
    },
  });

  // Fetch user's vouchers
  const { data: vouchers = [] } = useQuery({
    queryKey: ['/api/vouchers/user', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequestWithAuth('GET', `/api/vouchers/user/${user.id}`);
      return response.json() as Promise<VoucherWithDeal[]>;
    },
    enabled: !!user,
  });

  // Fetch subscription status
  const { data: subscription } = useQuery({
    queryKey: ['/api/subscription/status'],
    queryFn: async () => {
      const response = await apiRequestWithAuth('GET', '/api/subscription/status');
      return response.json();
    },
    enabled: !!user && user.role === 'resident',
  });

  // Fetch subscription plans
  const { data: plans } = useQuery({
    queryKey: ['/api/subscription/plans'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/plans');
      return response.json();
    },
  });

  // Create voucher mutation (replaces deal redemption)
  const createVoucherMutation = useMutation({
    mutationFn: async ({ dealId }: { dealId: number }) => {
      const response = await apiRequestWithAuth('POST', '/api/redemptions', { dealId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Voucher Created!",
        description: `Voucher ${data.voucherPosition} added to your wallet.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vouchers/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Voucher",
        description: error.message || "Unable to create voucher",
        variant: "destructive",
      });
    },
  });

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionType, subscriptionPlan }: { subscriptionType: string; subscriptionPlan: string }) => {
      const response = await apiRequestWithAuth('POST', '/api/subscription/create', { subscriptionType, subscriptionPlan });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Activated!",
        description: "You can now create vouchers from deals.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Failed",
        description: error.message || "Unable to activate subscription",
        variant: "destructive",
      });
    },
  });

  const handleCreateVoucher = (dealId: number) => {
    if (!subscription?.isActive) {
      toast({
        title: "Subscription Required",
        description: "Please activate a subscription to create vouchers.",
        variant: "destructive",
      });
      return;
    }
    createVoucherMutation.mutate({ dealId });
  };

  // Filter deals
  const filteredDeals = deals.filter(deal => {
    // Category filter
    if (selectedCategory !== "all" && deal.category !== selectedCategory) {
      return false;
    }
    
    // Availability filter
    if (availableOnly) {
      const isExpired = new Date(deal.expiryDate) < new Date();
      const isFullyUsed = (deal.usageCount || 0) >= deal.usageLimit;
      return !isExpired && !isFullyUsed && deal.isActive;
    }
    return true;
  });

  // Calculate stats from vouchers
  const totalVouchers = vouchers.length;
  const usedVouchers = vouchers.filter(v => v.isUsed);
  const activeVouchers = vouchers.filter(v => !v.isUsed && new Date(v.expiresAt) > new Date());
  const thisMonthVouchers = vouchers.filter(v => {
    const voucherDate = new Date(v.createdAt || new Date());
    const now = new Date();
    return voucherDate.getMonth() === now.getMonth() && 
           voucherDate.getFullYear() === now.getFullYear();
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

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50">
        {/* Hero Section */}
        <div className="relative coastal-gradient text-white">
          <div 
            className="absolute inset-0 hero-overlay"
            style={{
              backgroundImage: `url("${mapImage}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">
                Welcome back, {user.username}!
              </h1>
              <p className="text-xl opacity-90 mb-6">
                Your Resicard for exclusive St Andrews community deals
              </p>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 inline-block">
                <div className="flex items-center text-white">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>Verified local resident</span>
                  <CheckCircle className="h-4 w-4 text-green-400 ml-2" />
                </div>
              </div>
              <div className="mt-6">
                <Link href="/edit-profile">
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Ticket className="h-6 w-6 text-primary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Available Deals</p>
                    <p className="text-2xl font-bold text-foreground">
                      {filteredDeals.filter(d => {
                        const isExpired = new Date(d.expiryDate) < new Date();
                        const isFullyUsed = (d.usageCount || 0) >= d.usageLimit;
                        return !isExpired && !isFullyUsed && d.isActive;
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Vouchers This Month</p>
                    <p className="text-2xl font-bold text-foreground">
                      {thisMonthVouchers.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-amber-100 p-3 rounded-lg">
                    <PiggyBank className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Active Vouchers</p>
                    <p className="text-2xl font-bold text-foreground">
                      {activeVouchers.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Membership</p>
                    <p className="text-sm font-medium text-foreground">
                      {user.membershipExpiry 
                        ? `Valid until ${formatDate(user.membershipExpiry)}`
                        : 'Active'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("deals")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "deals"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Available Deals
                </button>
                <button
                  onClick={() => setActiveTab("wallet")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "wallet"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  My Voucher Wallet ({activeVouchers.length})
                </button>
                <button
                  onClick={() => setActiveTab("subscription")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "subscription"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Subscription
                </button>
              </nav>
            </div>
          </div>

          {/* Deals Tab */}
          {activeTab === "deals" && (
            <>
              {/* Filters */}
              <Card className="mb-8">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-foreground">Filter Deals</h3>
                    </div>
                    
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="restaurant">Restaurants</SelectItem>
                        <SelectItem value="bar">Bars</SelectItem>
                        <SelectItem value="cafe">Cafes</SelectItem>
                        <SelectItem value="pub">Pubs</SelectItem>
                        <SelectItem value="takeaway">Takeaway</SelectItem>
                        <SelectItem value="fine-dining">Fine Dining</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="available"
                        checked={availableOnly}
                        onCheckedChange={(checked) => setAvailableOnly(checked === true)}
                      />
                      <label htmlFor="available" className="text-sm text-muted-foreground">
                        Available now only
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deal Cards */}
              {dealsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-48 bg-muted" />
                      <CardContent className="p-6 space-y-3">
                        <div className="h-4 bg-muted rounded w-1/4" />
                        <div className="h-6 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-full" />
                        <div className="h-4 bg-muted rounded w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredDeals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDeals.map((deal) => (
                    <DealCard 
                      key={deal.id} 
                      deal={deal} 
                      onRedeem={handleCreateVoucher}
                      isLoading={createVoucherMutation.isPending}
                      showMerchantInfo={true}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No deals found</h3>
                    <p className="text-muted-foreground">
                      {selectedCategory 
                        ? `No deals available in the ${selectedCategory} category.`
                        : 'No deals are currently available.'
                      }
                    </p>
                    {selectedCategory && (
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedCategory("all")}
                        className="mt-4"
                      >
                        View All Deals
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Membership Renewal Prompt */}
              {user.membershipExpiry && new Date(user.membershipExpiry) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) && (
                <Card className="mt-12 coastal-bg border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-foreground">
                            Membership expires soon
                          </h3>
                          <p className="text-muted-foreground">
                            Renew now to continue accessing exclusive local deals
                          </p>
                        </div>
                      </div>
                      <Button 
                        className="coastal-gradient"
                        onClick={() => toast({
                          title: "Payment System Coming Soon",
                          description: "Membership renewal will be available once payment processing is set up.",
                        })}
                      >
                        Renew Membership
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Voucher Wallet Tab */}
          {activeTab === "wallet" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">My Voucher Wallet</h2>
                <div className="text-sm text-muted-foreground">
                  {activeVouchers.length} active • {usedVouchers.length} used
                </div>
              </div>

              {vouchers.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No vouchers yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start creating vouchers from available deals to build your wallet.
                    </p>
                    <Button onClick={() => setActiveTab("deals")}>
                      Browse Deals
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {vouchers.map((voucher) => (
                    <Card key={voucher.id} className={`${voucher.isUsed ? 'opacity-60' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{voucher.dealTitle}</h3>
                              <Badge variant={voucher.isUsed ? "secondary" : "default"}>
                                {voucher.isUsed ? "Used" : "Active"}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground mb-2">{voucher.merchantName}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium">
                                {voucher.discountType === 'percentage' 
                                  ? `${voucher.discountValue}% off`
                                  : `£${voucher.discountValue} off`
                                }
                              </span>
                              <span className="text-muted-foreground">
                                Expires: {formatDate(voucher.expiresAt)}
                              </span>
                            </div>
                            <div className="mt-2 text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                              {voucher.voucherNumber}
                            </div>
                          </div>
                          <div className="text-right">
                            {voucher.isUsed ? (
                              <div className="text-sm text-muted-foreground">
                                Used: {formatDate(voucher.usedAt || '')}
                              </div>
                            ) : new Date(voucher.expiresAt) < new Date() ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : (
                              <div className="space-y-2">
                                <Badge variant="outline">Ready to use</Badge>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedVoucher(voucher);
                                    setShowRedemptionCard(true);
                                  }}
                                  className="block w-full"
                                >
                                  <User className="h-4 w-4 mr-2" />
                                  Show for Redemption
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === "subscription" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Subscription Management</h2>
                {subscription?.isActive && (
                  <Badge variant="default">
                    {subscription.type} • {subscription.plan}
                  </Badge>
                )}
              </div>

              {subscription?.isActive ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Active Subscription</h3>
                        <p className="text-muted-foreground">
                          {subscription.type} plan ({subscription.plan})
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {subscription.expiresAt && (
                        <p>Expires: {formatDate(subscription.expiresAt)}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Choose Your Plan</h3>
                    <p className="text-muted-foreground mb-6">
                      Subscribe to create vouchers from deals and build your savings wallet.
                    </p>
                    
                    {plans && (
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Individual Plans */}
                        <div className="space-y-4">
                          <h4 className="font-medium">Individual</h4>
                          <div className="space-y-3">
                            <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium">Monthly</span>
                                  <span className="text-lg font-bold">£{plans.individual?.monthly.price}</span>
                                </div>
                                <Button 
                                  className="w-full"
                                  onClick={() => createSubscriptionMutation.mutate({ 
                                    subscriptionType: 'individual', 
                                    subscriptionPlan: 'monthly' 
                                  })}
                                  disabled={createSubscriptionMutation.isPending}
                                >
                                  {createSubscriptionMutation.isPending ? 'Activating...' : 'Choose Monthly'}
                                </Button>
                              </CardContent>
                            </Card>
                            
                            <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium">Annual</span>
                                  <div className="text-right">
                                    <span className="text-lg font-bold">£{plans.individual?.annual.price}</span>
                                    <div className="text-xs text-green-600">Save £20/year</div>
                                  </div>
                                </div>
                                <Button 
                                  className="w-full"
                                  onClick={() => createSubscriptionMutation.mutate({ 
                                    subscriptionType: 'individual', 
                                    subscriptionPlan: 'annual' 
                                  })}
                                  disabled={createSubscriptionMutation.isPending}
                                >
                                  {createSubscriptionMutation.isPending ? 'Activating...' : 'Choose Annual'}
                                </Button>
                              </CardContent>
                            </Card>
                          </div>
                        </div>

                        {/* Family Plans */}
                        <div className="space-y-4">
                          <h4 className="font-medium">Family</h4>
                          <div className="space-y-3">
                            <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium">Monthly</span>
                                  <span className="text-lg font-bold">£{plans.family?.monthly.price}</span>
                                </div>
                                <Button 
                                  className="w-full"
                                  onClick={() => createSubscriptionMutation.mutate({ 
                                    subscriptionType: 'family', 
                                    subscriptionPlan: 'monthly' 
                                  })}
                                  disabled={createSubscriptionMutation.isPending}
                                >
                                  {createSubscriptionMutation.isPending ? 'Activating...' : 'Choose Monthly'}
                                </Button>
                              </CardContent>
                            </Card>
                            
                            <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium">Annual</span>
                                  <div className="text-right">
                                    <span className="text-lg font-bold">£{plans.family?.annual.price}</span>
                                    <div className="text-xs text-green-600">Save £40/year</div>
                                  </div>
                                </div>
                                <Button 
                                  className="w-full"
                                  onClick={() => createSubscriptionMutation.mutate({ 
                                    subscriptionType: 'family', 
                                    subscriptionPlan: 'annual' 
                                  })}
                                  disabled={createSubscriptionMutation.isPending}
                                >
                                  {createSubscriptionMutation.isPending ? 'Activating...' : 'Choose Annual'}
                                </Button>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Digital Membership Card Dialog for Redemption */}
        <Dialog open={showRedemptionCard} onOpenChange={setShowRedemptionCard}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Show to Merchant for Redemption</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedVoucher && (
                <DigitalMembershipCard 
                  voucher={selectedVoucher} 
                  showVoucherDetails={true} 
                />
              )}
              <div className="text-center text-sm text-muted-foreground">
                Present this screen to the merchant to redeem your voucher
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}