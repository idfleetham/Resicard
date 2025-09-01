import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import DealCard from "@/components/deal-card-new";
import { Card, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Ticket, CheckCircle, PiggyBank, Calendar, MapPin, Filter, Settings, User, AlertTriangle, X, Smartphone, Tag, Wallet, Shield, Crown, Trash2, CreditCard } from "lucide-react";
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

  // Fetch deals (legacy)
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['/api/deals', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory && selectedCategory !== "all" ? `/api/deals?category=${selectedCategory}` : '/api/deals';
      const response = await fetch(url);
      return response.json() as Promise<DealWithMerchant[]>;
    },
  });

  // Fetch modern offers
  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['/api/offers'],
    queryFn: async () => {
      const response = await fetch('/api/offers');
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

  // Delete voucher mutation
  const deleteVoucherMutation = useMutation({
    mutationFn: async (voucherId: number) => {
      const response = await apiRequestWithAuth('DELETE', `/api/vouchers/${voucherId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Voucher Deleted",
        description: "Voucher has been removed from your wallet.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vouchers/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Voucher",
        description: error.message || "Unable to delete voucher",
        variant: "destructive",
      });
    },
  });

  // Refresh expired voucher mutation
  const refreshVoucherMutation = useMutation({
    mutationFn: async (voucherId: number) => {
      const response = await apiRequestWithAuth('POST', '/api/vouchers/refresh', {
        voucherId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Offer Refreshed!",
        description: "Your voucher has been refreshed with a new expiration date.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vouchers/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Refresh Offer",
        description: error.message || "Unable to refresh voucher. The offer may no longer be available.",
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

  // Separate active, expired, and used vouchers
  const activeVouchers = vouchers.filter(v => !v.isUsed && new Date(v.expiresAt) > new Date());
  const expiredVouchers = vouchers.filter(v => !v.isUsed && new Date(v.expiresAt) <= new Date());
  const usedVouchers = vouchers.filter(v => v.isUsed);

  // Combine loading states
  const isLoadingOffers = dealsLoading || offersLoading;

  // Combine deals and offers, then filter based on category and availability
  const allOffers = [...deals, ...offers];
  const filteredDeals = allOffers.filter(deal => {
    const matchesCategory = selectedCategory === "all" || deal.category === selectedCategory;
    const isAvailable = !availableOnly || (
      (deal.isActive || deal.active) && 
      new Date(deal.expiryDate || deal.validUntil) > new Date() && 
      (deal.usageCount || 0) < (deal.usageLimit || deal.redeemLimit || Infinity)
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
          <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8 sm:py-12">
            <div className="text-center">
              <h1 className="text-2xl sm:text-4xl font-bold mb-4 text-white">Your Dashboard</h1>
              <p className="text-base sm:text-xl opacity-90 mb-6">
                Discover exclusive local deals and build your savings with Resicard
              </p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-4xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-6">
                  <div className="flex items-center justify-center mb-2">
                    <Ticket className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="text-lg sm:text-2xl font-bold">{vouchers.length}</div>
                  <div className="text-xs sm:text-sm opacity-90">Total Vouchers</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-6">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="text-lg sm:text-2xl font-bold">{activeVouchers.length}</div>
                  <div className="text-xs sm:text-sm opacity-90">Active Vouchers</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-6">
                  <div className="flex items-center justify-center mb-2">
                    <PiggyBank className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="text-lg sm:text-2xl font-bold">{usedVouchers.length}</div>
                  <div className="text-xs sm:text-sm opacity-90">Redeemed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          {/* Enhanced Tab Navigation */}
          <div className="relative mb-12">
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-100 p-2 max-w-4xl mx-auto">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab("deals")}
                  className={`group relative flex items-center space-x-3 px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex-1 ${
                    activeTab === "deals"
                      ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-xl transform scale-[1.02]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-[1.01]"
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    activeTab === "deals" 
                      ? "bg-white/20" 
                      : "bg-indigo-50 group-hover:bg-indigo-100"
                  }`}>
                    <Tag className={`h-5 w-5 ${
                      activeTab === "deals" ? "text-white" : "text-indigo-600"
                    }`} />
                  </div>
                  <span>Browse Offers</span>
                  {activeTab === "deals" && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/20 to-violet-500/20 animate-pulse" />
                  )}
                </button>
                
                <button
                  onClick={() => setActiveTab("wallet")}
                  className={`group relative flex items-center space-x-3 px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex-1 ${
                    activeTab === "wallet"
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-xl transform scale-[1.02]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-[1.01]"
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    activeTab === "wallet" 
                      ? "bg-white/20" 
                      : "bg-emerald-50 group-hover:bg-emerald-100"
                  }`}>
                    <Wallet className={`h-5 w-5 ${
                      activeTab === "wallet" ? "text-white" : "text-emerald-600"
                    }`} />
                  </div>
                  <span>My Wallet</span>
                  {activeTab === "wallet" && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 animate-pulse" />
                  )}
                </button>
                
                <button
                  onClick={() => setActiveTab("loyalty")}
                  className={`group relative flex items-center space-x-3 px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex-1 ${
                    activeTab === "loyalty"
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-xl transform scale-[1.02]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-[1.01]"
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    activeTab === "loyalty" 
                      ? "bg-white/20" 
                      : "bg-blue-50 group-hover:bg-blue-100"
                  }`}>
                    <CreditCard className={`h-5 w-5 ${
                      activeTab === "loyalty" ? "text-white" : "text-blue-600"
                    }`} />
                  </div>
                  <span>Loyalty Cards</span>
                  {activeTab === "loyalty" && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse" />
                  )}
                </button>
                
                <button
                  onClick={() => setActiveTab("verification")}
                  className={`group relative flex items-center space-x-3 px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex-1 ${
                    activeTab === "verification"
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl transform scale-[1.02]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-[1.01]"
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    activeTab === "verification" 
                      ? "bg-white/20" 
                      : "bg-amber-50 group-hover:bg-amber-100"
                  }`}>
                    <Shield className={`h-5 w-5 ${
                      activeTab === "verification" ? "text-white" : "text-amber-600"
                    }`} />
                  </div>
                  <span>Verification</span>
                  {activeTab === "verification" && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 animate-pulse" />
                  )}
                </button>
                
                <button
                  onClick={() => setActiveTab("subscription")}
                  className={`group relative flex items-center space-x-3 px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex-1 ${
                    activeTab === "subscription"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl transform scale-[1.02]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:scale-[1.01]"
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    activeTab === "subscription" 
                      ? "bg-white/20" 
                      : "bg-purple-50 group-hover:bg-purple-100"
                  }`}>
                    <Crown className={`h-5 w-5 ${
                      activeTab === "subscription" ? "text-white" : "text-purple-600"
                    }`} />
                  </div>
                  <span>Subscription</span>
                  {activeTab === "subscription" && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Browse Offers Tab */}
          {activeTab === "deals" && (
            <>
              {/* Premium Filters */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border-0 p-8 mb-8">
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
              {isLoadingOffers ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl shadow-xl border-0 animate-pulse">
                      <div className="aspect-video bg-gradient-to-br from-purple-200 to-pink-200 rounded-t-3xl" />
                      <div className="p-8 space-y-6">
                        <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-3/4" />
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/2" />
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-full" />
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-2/3" />
                        <div className="h-12 bg-gradient-to-r from-purple-200 to-pink-200 rounded-2xl w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredDeals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
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
            <div className="space-y-10">
              <div className="relative bg-gradient-to-br from-slate-800 to-indigo-900 rounded-3xl shadow-2xl border-0 p-10 overflow-hidden">
                {/* Subtle Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-4xl font-bold text-white mb-3">My Voucher Wallet</h2>
                      <p className="text-white/70 text-lg">Manage your active vouchers and redeem exclusive deals</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Button 
                        className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 rounded-2xl px-6 py-3 font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        onClick={() => window.location.href = '/wallet/add'}
                      >
                        <Smartphone className="w-5 h-5 mr-2" />
                        Add to Apple Wallet
                      </Button>
                    </div>
                  </div>
                  <div className="mt-8 flex items-center space-x-6 flex-wrap">
                    <div className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                      <div className="w-4 h-4 bg-emerald-400 rounded-full"></div>
                      <span className="text-white font-semibold">{activeVouchers.length} active</span>
                    </div>
                    {expiredVouchers.length > 0 && (
                      <div className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                        <div className="w-4 h-4 bg-amber-400 rounded-full"></div>
                        <span className="text-white font-semibold">{expiredVouchers.length} expired</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                      <div className="w-4 h-4 bg-white/60 rounded-full"></div>
                      <span className="text-white font-semibold">{usedVouchers.length} redeemed</span>
                    </div>
                  </div>
                </div>
              </div>

              {vouchers.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-xl border-0 p-16 text-center">
                  <div className="p-6 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                    <Ticket className="h-12 w-12 text-indigo-600" />
                  </div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">No vouchers yet</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                    Start creating vouchers from available deals to build your wallet.
                  </p>
                  <Button 
                    onClick={() => setActiveTab("deals")}
                    className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white rounded-2xl px-10 py-4 font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  >
                    Browse Offers
                  </Button>
                </div>
              ) : (
                <>
                  {/* Active Vouchers Section */}
                  {activeVouchers.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl">
                          <CheckCircle className="h-6 w-6 text-emerald-600" />
                        </div>
                        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                          Active Vouchers ({activeVouchers.length})
                        </span>
                      </h3>
                      <div className="grid gap-6">
                        {activeVouchers.map((voucher) => (
                          <div key={voucher.id} className="bg-white rounded-3xl shadow-xl border-0 p-8 ring-1 ring-gray-100 hover:shadow-2xl transition-all duration-300">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <h3 className="font-bold text-xl text-gray-900">{voucher.dealTitle}</h3>
                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1 rounded-full">Active</Badge>
                                  </div>
                                  <p className="text-gray-600 mb-4 font-medium">
                                    {voucher.merchantName && voucher.merchantName.trim() !== '' && voucher.merchantName !== 'luke' && voucher.merchantName !== 'kingdomchiro' 
                                      ? voucher.merchantName 
                                      : (voucher.merchantName === 'kingdomchiro' ? 'Kingdom Chiropractic Clinics' : 
                                         'Business Name Not Set')
                                    }
                                  </p>
                                  <div className="flex items-center gap-6 text-sm mb-4">
                                    {/* Only show discount badge for monetary discounts */}
                                    {(voucher.discountType === 'percentage' || voucher.discountType === 'fixed') && (
                                      <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-2xl">
                                        <span className="text-lg font-bold text-white">
                                          {voucher.discountType === 'percentage' 
                                            ? `${voucher.discountValue}% OFF`
                                            : `£${voucher.discountValue} OFF`
                                          }
                                        </span>
                                      </div>
                                    )}
                                    <span className="text-gray-600 font-medium">
                                      Expires: {formatDate(voucher.expiresAt)}
                                    </span>
                                  </div>
                                  <div className="mt-4 text-xs font-mono bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 rounded-xl border">
                                    <span className="text-gray-500">Voucher Code:</span> {voucher.voucherNumber}
                                  </div>
                                </div>
                                <div className="text-right">
                                  {!user?.profilePhoto ? (
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
                                    <div className="space-y-3">
                                      <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 px-3 py-1 rounded-full">Ready to use</Badge>
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => {
                                            setSelectedVoucher(voucher);
                                            setShowRedemptionCard(true);
                                          }}
                                          className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white rounded-2xl px-4 py-3 font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex-1"
                                        >
                                          <User className="h-4 w-4 mr-2" />
                                          Show QR Code
                                        </Button>
                                        <Button
                                          onClick={() => deleteVoucherMutation.mutate(voucher.id)}
                                          disabled={deleteVoucherMutation.isPending}
                                          variant="outline"
                                          size="sm"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-2xl px-3"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expired Vouchers Section */}
                  {expiredVouchers.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl">
                          <AlertTriangle className="h-6 w-6 text-amber-600" />
                        </div>
                        <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                          Expired Vouchers ({expiredVouchers.length})
                        </span>
                      </h3>
                      <div className="grid gap-6">
                        {expiredVouchers.map((voucher) => (
                          <div key={voucher.id} className="bg-white rounded-3xl shadow-xl border-0 p-8 ring-1 ring-amber-100 hover:shadow-2xl transition-all duration-300">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <h3 className="font-bold text-xl text-gray-900">{voucher.dealTitle}</h3>
                                    <Badge variant="destructive">Expired</Badge>
                                  </div>
                                  <p className="text-gray-600 mb-4 font-medium">
                                    {voucher.merchantName && voucher.merchantName.trim() !== '' && voucher.merchantName !== 'luke' && voucher.merchantName !== 'kingdomchiro' 
                                      ? voucher.merchantName 
                                      : (voucher.merchantName === 'kingdomchiro' ? 'Kingdom Chiropractic Clinics' : 
                                         'Business Name Not Set')
                                    }
                                  </p>
                                  <div className="flex items-center gap-6 text-sm mb-4">
                                    {/* Only show discount badge for monetary discounts */}
                                    {(voucher.discountType === 'percentage' || voucher.discountType === 'fixed') && (
                                      <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-300 to-gray-400 rounded-2xl">
                                        <span className="text-lg font-bold text-white">
                                          {voucher.discountType === 'percentage' 
                                            ? `${voucher.discountValue}% OFF`
                                            : `£${voucher.discountValue} OFF`
                                          }
                                        </span>
                                      </div>
                                    )}
                                    <span className="text-gray-600 font-medium">
                                      Expired: {formatDate(voucher.expiresAt)}
                                    </span>
                                  </div>
                                  <div className="mt-4 text-xs font-mono bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 rounded-xl border">
                                    <span className="text-gray-500">Voucher Code:</span> {voucher.voucherNumber}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="space-y-3">
                                    <Badge variant="destructive">Expired</Badge>
                                    <Button
                                      onClick={() => refreshVoucherMutation.mutate(voucher.id)}
                                      disabled={refreshVoucherMutation.isPending}
                                      variant="outline"
                                      size="sm"
                                      className="w-full bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 text-indigo-700 border-indigo-200 rounded-2xl px-4 py-2 font-semibold"
                                    >
                                      {refreshVoucherMutation.isPending ? (
                                        <div className="flex items-center gap-2">
                                          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                          Refreshing...
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                          Refresh Offer
                                        </div>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Redeemed Vouchers Section */}
                  {usedVouchers.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-xl">
                          <CheckCircle className="h-6 w-6 text-gray-500" />
                        </div>
                        <span className="bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">
                          Redeemed Vouchers ({usedVouchers.length})
                        </span>
                      </h3>
                      <div className="grid gap-6">
                        {usedVouchers.map((voucher) => (
                          <div key={voucher.id} className="bg-white rounded-3xl shadow-lg border-0 p-8 ring-1 ring-gray-200 opacity-75">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <h3 className="font-bold text-xl text-gray-700">{voucher.dealTitle}</h3>
                                    <Badge className="bg-gray-100 text-gray-600 border-gray-200 px-3 py-1 rounded-full">Used</Badge>
                                  </div>
                                  <p className="text-gray-500 mb-4 flex items-center">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    {voucher.merchantName}
                                  </p>
                                  <div className="flex items-center gap-6 text-sm mb-4">
                                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-300 to-gray-400 rounded-2xl">
                                      <span className="text-lg font-bold text-white">
                                        {voucher.discountType === 'percentage' 
                                          ? `${voucher.discountValue}% OFF`
                                          : voucher.discountType === 'fixed'
                                          ? `£${voucher.discountValue} OFF`
                                          : 'Special Offer'
                                        }
                                      </span>
                                    </div>
                                    <span className="text-gray-500 font-medium">
                                      Used: {formatDate(voucher.usedAt || '')}
                                    </span>
                                  </div>
                                  <div className="mt-4 text-xs font-mono bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 rounded-xl border">
                                    <span className="text-gray-400">Voucher Code:</span> {voucher.voucherNumber}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex flex-col items-end gap-3">
                                    <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border-gray-200 px-4 py-2 rounded-full">Redeemed</Badge>
                                    <Button
                                      onClick={() => deleteVoucherMutation.mutate(voucher.id)}
                                      disabled={deleteVoucherMutation.isPending}
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-2xl px-3"
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Loyalty Cards Tab */}
          {activeTab === "loyalty" && (
            <div className="space-y-10">
              <div className="relative bg-gradient-to-br from-slate-800 to-indigo-900 rounded-3xl shadow-2xl border-0 p-10 overflow-hidden">
                {/* Subtle Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-4xl font-bold text-white mb-3">Loyalty Cards</h2>
                      <p className="text-white/70 text-lg">Track your loyalty status with merchants you've visited</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                        <CreditCard className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold">
                          {Array.from(new Set(vouchers.filter(v => v.isUsed).map(v => v.merchantName))).length} merchants
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loyalty Cards Content */}
              <div className="bg-white rounded-3xl shadow-2xl border-0 p-10 ring-1 ring-gray-100">
                {(() => {
                  // Get unique merchants from redeemed vouchers
                  const usedVouchers = vouchers.filter(voucher => voucher.isUsed);
                  const merchantsMap = new Map();
                  
                  usedVouchers.forEach(voucher => {
                    const merchantName = voucher.merchantName && voucher.merchantName.trim() !== '' && voucher.merchantName !== 'luke' && voucher.merchantName !== 'kingdomchiro' 
                      ? voucher.merchantName 
                      : (voucher.merchantName === 'kingdomchiro' ? 'Kingdom Chiropractic Clinics' : 'Business Name Not Set');
                    
                    merchantsMap.set(voucher.merchantName, {
                      id: voucher.merchantName,
                      name: merchantName
                    });
                  });
                  
                  const redeemedMerchants = Array.from(merchantsMap.values());

                  if (redeemedMerchants.length === 0) {
                    return (
                      <div className="text-center py-16">
                        <div className="p-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                          <CreditCard className="h-12 w-12 text-blue-600" />
                        </div>
                        <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">No loyalty cards yet</h3>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                          Start redeeming vouchers to earn loyalty points and track your status with local merchants.
                        </p>
                        <Button 
                          onClick={() => setActiveTab("wallet")}
                          className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-600 text-white rounded-2xl px-10 py-4 font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                        >
                          View My Vouchers
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-8">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Loyalty Status</h3>
                        <p className="text-gray-600">
                          Track your points, rewards, and tier status with merchants you've visited
                        </p>
                      </div>
                      
                      <div className="grid gap-6">
                        {redeemedMerchants.map((merchant) => (
                          <CustomerLoyaltyCard
                            key={merchant.id}
                            merchantId={merchant.id.toString()}
                            merchantName={merchant.name}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Verification Tab */}
          {activeTab === "verification" && (
            <div className="space-y-10">
              <div className="relative bg-gradient-to-br from-slate-800 to-indigo-900 rounded-3xl shadow-2xl border-0 p-10 overflow-hidden text-center">
                {/* Subtle Decorative Elements */}
                <div className="absolute top-0 left-0 w-28 h-28 bg-white/10 rounded-full -translate-y-14 -translate-x-14"></div>
                <div className="absolute bottom-0 right-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 translate-x-10"></div>
                
                <div className="relative z-10">
                  <h2 className="text-4xl font-bold text-white mb-4">Residency Verification</h2>
                  <p className="text-white/70 text-lg max-w-2xl mx-auto">
                    Complete your verification to unlock exclusive local deals and prove you're a St Andrews resident.
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-3xl shadow-2xl border-0 p-10 ring-1 ring-gray-100">
                <DocumentVerification />
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === "subscription" && (
            <div className="space-y-10">
              <div className="relative bg-gradient-to-br from-slate-800 to-indigo-900 rounded-3xl shadow-2xl border-0 p-10 overflow-hidden">
                {/* Subtle Decorative Elements */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-18 translate-x-18"></div>
                <div className="absolute bottom-0 left-0 w-26 h-26 bg-white/5 rounded-full translate-y-13 -translate-x-13"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-4xl font-bold text-white mb-3">Subscription Management</h2>
                      <p className="text-white/70 text-lg">Manage your Resicard membership and unlock exclusive deals</p>
                    </div>
                    {subscription?.isActive && (
                      <div className="text-right">
                        <Badge className="bg-white/20 backdrop-blur-sm text-white border border-white/30 px-6 py-3 rounded-2xl text-lg font-bold shadow-lg">
                          {subscription.type} • {subscription.plan}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-2xl border-0 p-10 ring-1 ring-gray-100">
                <SubscriptionManagement 
                  subscription={subscription}
                  plans={plans}
                  onSubscriptionChange={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
                  }}
                />
              </div>

              {/* Legacy subscription creation for non-active users */}
              {!subscription?.isActive && (
                <div className="bg-white rounded-3xl shadow-xl border-0 p-8">
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
                </div>
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