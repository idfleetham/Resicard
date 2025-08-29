import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import DealCard from "@/components/deal-card";
import { Card, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Ticket, CheckCircle, PiggyBank, Calendar, MapPin, Filter, Settings, User, AlertTriangle, X, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequestWithAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DealWithMerchant, Redemption, VoucherWithDeal } from "@shared/schema";
import mapImage from "@assets/Geddy-Map-smaller_1749767170608.jpeg";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DigitalMembershipCard from "@/components/digital-membership-card";
import DocumentVerification from "@/components/document-verification";
import SubscriptionManagement from "@/components/subscription-management";
import { CustomerLoyaltyCard } from "@/components/loyalty/customer-loyalty-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ResidentDashboard() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("deals");
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherWithDeal | null>(null);
  const [showRedemptionCard, setShowRedemptionCard] = useState(false);
  const [loadingDealId, setLoadingDealId] = useState<number | undefined>(undefined);
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

  // Fetch user's vouchers with better caching
  const { data: vouchers = [] } = useQuery({
    queryKey: ['/api/vouchers/user', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await apiRequestWithAuth('GET', `/api/vouchers/user/${user.id}`);
        return response.json() as Promise<VoucherWithDeal[]>;
      } catch (error) {
        console.warn('Failed to fetch vouchers:', error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds to catch redemptions
    retry: false, // Don't retry on auth failures
  });

  // Fetch subscription status
  const { data: subscription } = useQuery({
    queryKey: ['/api/subscription/status'],
    queryFn: async () => {
      try {
        const response = await apiRequestWithAuth('GET', '/api/subscription/status');
        return response.json();
      } catch (error) {
        console.warn('Failed to fetch subscription status:', error);
        return null;
      }
    },
    enabled: !!user && user.role === 'resident',
    retry: false, // Don't retry on auth failures
  });

  // Fetch subscription plans
  const { data: plans } = useQuery({
    queryKey: ['/api/subscription/plans'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/plans');
      return response.json();
    },
  });

  // Create voucher mutation
  const createVoucherMutation = useMutation({
    mutationFn: async ({ dealId }: { dealId: number }) => {
      setLoadingDealId(dealId);
      const response = await apiRequestWithAuth('POST', '/api/redemptions', { dealId });
      return response.json();
    },
    onSuccess: (data) => {
      setLoadingDealId(undefined);
      toast({
        title: "Voucher Created!",
        description: `Voucher ${data.voucherPosition} added to your wallet.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vouchers/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
    },
    onError: (error: any) => {
      setLoadingDealId(undefined);
      
      // Handle auth errors gracefully
      if (error.message?.includes('Authentication expired')) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue",
          variant: "destructive",
        });
        return;
      }
      
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
      const response = await apiRequestWithAuth('POST', '/api/subscription/create', {
        subscriptionType,
        subscriptionPlan,
      });
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
      // Handle auth errors gracefully
      if (error.message?.includes('Authentication expired')) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Subscription Failed",
        description: error.message || "Unable to create subscription",
        variant: "destructive",
      });
    },
  });

  const handleCreateVoucher = (dealId: number) => {
    if (!subscription?.isActive) {
      toast({
        title: "Subscription Required",
        description: "Please activate a subscription to create vouchers from deals.",
        variant: "destructive",
      });
      setActiveTab("subscription");
      return;
    }
    createVoucherMutation.mutate({ dealId });
  };

  // Separate active and used vouchers
  const activeVouchers = vouchers.filter(v => !v.isUsed && new Date(v.expiresAt) > new Date());
  const usedVouchers = vouchers.filter(v => v.isUsed);

  // Filter deals based on category and availability
  const filteredDeals = deals.filter(deal => {
    const matchesCategory = selectedCategory === "all" || deal.category === selectedCategory;
    const isAvailable = !availableOnly || (
      deal.isActive && 
      new Date(deal.expiryDate) > new Date() && 
      (deal.usageCount || 0) < deal.usageLimit
    );
    return matchesCategory && isAvailable;
  });

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "restaurant", label: "Restaurant" },
    { value: "bar", label: "Bar" },
    { value: "cafe", label: "Cafe" },
    { value: "pub", label: "Pub" },
    { value: "takeaway", label: "Takeaway" },
    { value: "fine-dining", label: "Fine Dining" },
    { value: "hotel", label: "Hotel" },
    { value: "retail", label: "Retail" },
    { value: "sports", label: "Sports" },
    { value: "transport", label: "Transport" },
    { value: "experience", label: "Experience" },
  ];

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        {/* Hero Section */}
        <div className="relative coastal-gradient text-white">
          <div 
            className="absolute inset-0 hero-overlay"
            style={{
              backgroundImage: `url("${mapImage}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3,
            }}
          />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4 text-white">Welcome back, {user.username}! 🎉</h1>
              <p className="text-xl opacity-90 mb-6">
                Discover exclusive local deals and build your savings with Resicard
              </p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <div className="flex items-center justify-center mb-2">
                    <Ticket className="h-8 w-8" />
                  </div>
                  <div className="text-2xl font-bold">{vouchers.length}</div>
                  <div className="text-sm opacity-90">Total Vouchers</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <div className="text-2xl font-bold">{activeVouchers.length}</div>
                  <div className="text-sm opacity-90">Active Vouchers</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <div className="flex items-center justify-center mb-2">
                    <PiggyBank className="h-8 w-8" />
                  </div>
                  <div className="text-2xl font-bold">{usedVouchers.length}</div>
                  <div className="text-sm opacity-90">Redeemed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Premium Tab Navigation - Redesigned UI */}
          <div className="relative mb-12">
            <div className="flex space-x-8 border-b border-gray-200 max-w-2xl">
              <button
                onClick={() => setActiveTab("deals")}
                className={`relative py-4 px-2 text-sm font-semibold transition-all duration-300 ${
                  activeTab === "deals"
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Browse Deals
                {activeTab === "deals" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("wallet")}
                className={`relative py-4 px-2 text-sm font-semibold transition-all duration-300 ${
                  activeTab === "wallet"
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                My Wallet
                {activeTab === "wallet" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("verification")}
                className={`relative py-4 px-2 text-sm font-semibold transition-all duration-300 ${
                  activeTab === "verification"
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Verification
                {activeTab === "verification" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("subscription")}
                className={`relative py-4 px-2 text-sm font-semibold transition-all duration-300 ${
                  activeTab === "subscription"
                    ? "text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Subscription
                {activeTab === "subscription" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Browse Deals Tab */}
          {activeTab === "deals" && (
            <>
              {/* Premium Filters */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Filter className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Filters</span>
                  </div>
                  
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48 border-gray-200 bg-gray-50 rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="available" 
                      checked={availableOnly}
                      onCheckedChange={(checked) => setAvailableOnly(checked === true)}
                      className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                    <label htmlFor="available" className="text-sm font-medium text-gray-600">
                      Available now only
                    </label>
                  </div>
                </div>
              </div>

              {/* Deal Cards */}
              {dealsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse">
                      <div className="aspect-video bg-gray-200 rounded-t-2xl" />
                      <div className="p-6 space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                        <div className="h-10 bg-gray-200 rounded-full w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredDeals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredDeals.map((deal) => {
                    const hasExistingVoucher = vouchers.some(v => v.dealId === deal.id && !v.isUsed);
                    return (
                      <DealCard 
                        key={deal.id} 
                        deal={deal} 
                        onRedeem={handleCreateVoucher}
                        isLoading={createVoucherMutation.isPending}
                        loadingDealId={loadingDealId}
                        hasExistingVoucher={hasExistingVoucher}
                        showMerchantInfo={true}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                  <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <Ticket className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No deals found</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {selectedCategory 
                      ? `No deals are currently available in the ${selectedCategory} category. Try browsing other categories or check back later.`
                      : 'No deals are currently available. Check back later for new offers from local merchants.'
                    }
                  </p>
                  {selectedCategory && (
                    <Button 
                      onClick={() => setSelectedCategory("all")}
                      className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-full px-8 py-3 font-semibold"
                    >
                      View All Categories
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Voucher Wallet Tab */}
          {activeTab === "wallet" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-900">My Voucher Wallet</h2>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-full px-6"
                    onClick={() => window.location.href = '/wallet/add'}
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Add to Apple Wallet
                  </Button>
                  <div className="text-sm text-gray-500 bg-gray-100 rounded-full px-4 py-2">
                    {activeVouchers.length} active • {usedVouchers.length} used
                  </div>
                </div>
              </div>

              {vouchers.length === 0 ? (
                <Card>
                  <CardBody className="p-12 text-center">
                    <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No vouchers yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start creating vouchers from available deals to build your wallet.
                    </p>
                    <Button onClick={() => setActiveTab("deals")}>
                      Browse Deals
                    </Button>
                  </CardBody>
                </Card>
              ) : (
                <>
                  {/* Active Vouchers Section */}
                  {activeVouchers.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Active Vouchers ({activeVouchers.length})
                      </h3>
                      <div className="grid gap-4">
                        {activeVouchers.map((voucher) => (
                          <Card key={voucher.id}>
                            <CardBody className="p-6">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold">{voucher.dealTitle}</h3>
                                    <Badge variant="default">Active</Badge>
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
                                  {new Date(voucher.expiresAt) < new Date() ? (
                                    <Badge variant="destructive">Expired</Badge>
                                  ) : !user?.profilePhoto ? (
                                    <div className="space-y-2">
                                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                                        Photo Required
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          toast({
                                            title: "Profile Photo Required",
                                            description: "Please add a profile photo to your account for merchant verification during redemption.",
                                            variant: "destructive",
                                          });
                                        }}
                                        className="block w-full"
                                      >
                                        Add Photo
                                      </Button>
                                    </div>
                                  ) : !user?.isResidencyVerified ? (
                                    <div className="space-y-2">
                                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                        Verification Required
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setActiveTab("verification")}
                                        className="block w-full"
                                      >
                                        Verify Residency
                                      </Button>
                                    </div>
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
                                        Show QR Code
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Redeemed Vouchers Section */}
                  {usedVouchers.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-gray-500" />
                        Redeemed Vouchers ({usedVouchers.length})
                      </h3>
                      <div className="grid gap-4">
                        {usedVouchers.map((voucher) => (
                          <Card key={voucher.id} className="opacity-60">
                            <CardBody className="p-6">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold">{voucher.dealTitle}</h3>
                                    <Badge variant="secondary">Used</Badge>
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
                                      Used: {formatDate(voucher.usedAt || '')}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                    {voucher.voucherNumber}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="secondary">Redeemed</Badge>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Verification Tab */}
          {activeTab === "verification" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Residency Verification</h2>
              </div>
              <DocumentVerification />
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

              <SubscriptionManagement 
                subscription={subscription}
                plans={plans}
                onSubscriptionChange={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                }}
              />

              {/* Legacy subscription creation for non-active users */}
              {!subscription?.isActive && (
                <Card>
                  <CardBody className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Choose Your Plan</h3>
                    <p className="text-muted-foreground mb-6">
                      Subscribe to create vouchers from deals and build your savings wallet.
                    </p>
                    
                    {/* Verification Status Check */}
                    {(!user?.profilePhoto || !user?.isResidencyVerified) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-amber-800">Verification Required</h4>
                            <p className="text-sm text-amber-700 mt-1">
                              Complete your account verification to purchase a subscription:
                            </p>
                            <ul className="text-sm text-amber-700 mt-2 space-y-1">
                              {!user?.profilePhoto && (
                                <li className="flex items-center">
                                  <X className="h-3 w-3 text-red-500 mr-2" />
                                  Add profile photo
                                </li>
                              )}
                              {!user?.isResidencyVerified && (
                                <li className="flex items-center">
                                  <X className="h-3 w-3 text-red-500 mr-2" />
                                  Complete residency verification
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Individual Plans */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-semibold mb-4">Individual Plans</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
                            <CardBody className="p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">Monthly</span>
                                <span className="text-lg font-bold">£{plans?.individual?.monthly.price}</span>
                              </div>
                              <Button 
                                className="w-full"
                                onClick={() => createSubscriptionMutation.mutate({ 
                                  subscriptionType: 'individual', 
                                  subscriptionPlan: 'monthly' 
                                })}
                                disabled={createSubscriptionMutation.isPending || !user?.profilePhoto || !user?.isResidencyVerified}
                              >
                                {createSubscriptionMutation.isPending ? 'Activating...' : 'Choose Monthly'}
                              </Button>
                            </CardBody>
                          </Card>
                          
                          <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
                            <CardBody className="p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">Annual</span>
                                <div className="text-right">
                                  <span className="text-lg font-bold">£{plans?.individual?.annual.price}</span>
                                  <div className="text-xs text-green-600">Save £20/year</div>
                                </div>
                              </div>
                              <Button 
                                className="w-full"
                                onClick={() => createSubscriptionMutation.mutate({ 
                                  subscriptionType: 'individual', 
                                  subscriptionPlan: 'annual' 
                                })}
                                disabled={createSubscriptionMutation.isPending || !user?.profilePhoto || !user?.isResidencyVerified}
                              >
                                {createSubscriptionMutation.isPending ? 'Activating...' : 'Choose Annual'}
                              </Button>
                            </CardBody>
                          </Card>
                        </div>
                      </div>

                      {/* Family Plans */}
                      <div>
                        <h4 className="text-md font-semibold mb-4">Family Plans</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
                            <CardBody className="p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">Monthly</span>
                                <span className="text-lg font-bold">£{plans?.family?.monthly.price}</span>
                              </div>
                              <Button 
                                className="w-full"
                                onClick={() => createSubscriptionMutation.mutate({ 
                                  subscriptionType: 'family', 
                                  subscriptionPlan: 'monthly' 
                                })}
                                disabled={createSubscriptionMutation.isPending || !user?.profilePhoto || !user?.isResidencyVerified}
                              >
                                {createSubscriptionMutation.isPending ? 'Activating...' : 'Choose Monthly'}
                              </Button>
                            </CardBody>
                          </Card>
                          
                          <Card className="border-2 hover:border-primary cursor-pointer transition-colors">
                            <CardBody className="p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">Annual</span>
                                <div className="text-right">
                                  <span className="text-lg font-bold">£{plans?.family?.annual.price}</span>
                                  <div className="text-xs text-green-600">Save £40/year</div>
                                </div>
                              </div>
                              <Button 
                                className="w-full"
                                onClick={() => createSubscriptionMutation.mutate({ 
                                  subscriptionType: 'family', 
                                  subscriptionPlan: 'annual' 
                                })}
                                disabled={createSubscriptionMutation.isPending || !user?.profilePhoto || !user?.isResidencyVerified}
                              >
                                {createSubscriptionMutation.isPending ? 'Activating...' : 'Choose Annual'}
                              </Button>
                            </CardBody>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Digital Membership Card Dialog for Redemption */}
        <Dialog open={showRedemptionCard} onOpenChange={setShowRedemptionCard}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Show QR Code to Merchant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedVoucher && (
                <DigitalMembershipCard 
                  voucher={selectedVoucher} 
                  showVoucherDetails={true} 
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}