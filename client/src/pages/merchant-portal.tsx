import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  QrCode, 
  CreditCard, 
  Users, 
  Settings, 
  Plus, 
  Filter,
  Download,
  Eye,
  Edit,
  Archive,
  Play,
  Pause,
  Building2,
  Star,
  Gift
} from "lucide-react";

// Import components for each tab
import OffersManager from "../components/merchant/offers-manager";
import RedemptionsFeed from "../components/merchant/redemptions-feed";
import QRRedemption from "../components/merchant/qr-redemption";
import BillingPreview from "../components/merchant/billing-preview";
import TeamManagement from "../components/merchant/team-management";
import MerchantSettings from "../components/merchant/merchant-settings";
import { StaffEarningTool } from "../components/loyalty/staff-earning-tool";

export default function MerchantPortal() {
  const { user, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("offers");

  // Fetch merchant's redemptions for stats
  const { data: redemptionsResponse } = useQuery<any>({
    queryKey: ["/api/redemptions/merchant", user?.id],
    queryFn: async () => {
      console.log('MerchantPortal: Fetching redemptions for merchant:', user?.id);
      const response = await apiRequest('GET', `/api/redemptions/merchant/${user?.id}`);
      const data = await response.json();
      console.log('MerchantPortal: API Response:', data);
      return data;
    },
    enabled: !!user?.id,
  });

  // Handle the response structure - it could be an array or an object with rows
  const redemptions = Array.isArray(redemptionsResponse) 
    ? redemptionsResponse 
    : redemptionsResponse?.rows || [];

  console.log('MerchantPortal: Total redemptions count:', redemptions.length);

  // Fetch loyalty data for the overview cards
  const { data: membersData } = useQuery({
    queryKey: ["/api/loyalty/members"],
  });

  const { data: revenueData } = useQuery({
    queryKey: ["/api/loyalty/revenue-impact"],
  });

  const { data: loyaltyProgramme } = useQuery({
    queryKey: ["/api/loyalty/program"],
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "merchant")) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div data-theme="dim" className="min-h-screen bg-bg text-fg relative">
        <div className="pointer-events-none absolute inset-0 -z-10
            bg-[radial-gradient(1000px_700px_at_10%_-10%,rgba(120,119,198,.12)_0%,transparent_55%),radial-gradient(900px_600px_at_110%_0%,rgba(147,51,234,.10)_0%,transparent_52%)]" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="space-y-4 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-brand1 border-t-transparent rounded-full mx-auto" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 mx-auto bg-surface" />
              <Skeleton className="h-3 w-24 mx-auto bg-surface" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "merchant") {
    return null;
  }

  return (
    <div data-theme="dim" className="min-h-screen bg-bg text-fg relative">
      <div className="pointer-events-none absolute inset-0 -z-10
          bg-[radial-gradient(1000px_700px_at_10%_-10%,rgba(120,119,198,.12)_0%,transparent_55%),radial-gradient(900px_600px_at_110%_0%,rgba(147,51,234,.10)_0%,transparent_52%)]" />
      
      <div className="mx-auto max-w-7xl px-5 py-6">
        {/* Hero Header Card */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="border-b border-border-dim"
        >
          <Card className="bg-card border border-border-dim shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-black/30 hover:border-border-dim/80 transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand1 to-brand2 rounded-xl flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-fg">
                      {user.businessName || "Merchant Portal"}
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Manage your offers, track redemptions, and grow your business
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Verified Business
                  </Badge>
                  <Button variant="outline" onClick={logout} className="border-border-dim hover:bg-surface text-black">
                    Logout
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Main Content */}
        <main className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 bg-surface border-border-border-dim">
            <TabsTrigger value="offers" className="flex items-center space-x-2 text-slate-300 hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xl">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Offers</span>
            </TabsTrigger>
            <TabsTrigger value="redemptions" className="flex items-center space-x-2 text-slate-300 hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xl">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Redemptions</span>
            </TabsTrigger>
            <TabsTrigger value="qr-redemption" className="flex items-center space-x-2 text-slate-300 hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xl">
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR Scan</span>
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="flex items-center space-x-2 text-slate-300 hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xl">
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">Loyalty</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center space-x-2 text-slate-300 hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xl">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center space-x-2 text-slate-300 hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xl">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2 text-slate-300 hover:text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xl">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offers" className="mt-6">
            <OffersManager totalRedemptions={redemptions.length} />
          </TabsContent>

          <TabsContent value="redemptions" className="mt-6">
            <RedemptionsFeed />
          </TabsContent>

          <TabsContent value="qr-redemption" className="mt-6">
            <QRRedemption />
          </TabsContent>

          <TabsContent value="loyalty" className="mt-6">
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-border-dim shadow-xl shadow-black/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-fg">
                      <Star className="w-5 h-5 text-yellow-400" />
                      Loyalty Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-fg/80 text-lg">Active Members</span>
                        <span className="font-semibold text-fg">{membersData?.members?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg/80 text-lg">Points Earned</span>
                        <span className="font-semibold text-fg">{Math.floor(membersData?.members?.reduce((sum, member) => sum + (parseFloat(member.points) || 0), 0) || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fg/80 text-lg">Rewards Claimed</span>
                        <span className="font-semibold text-fg">0</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-border-dim shadow-xl shadow-black/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-fg">
                      <Gift className="w-5 h-5 text-green-400" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <StaffEarningTool 
                        merchantId={user?.id?.toString() || ""}
                        program={{
                          model: loyaltyProgramme?.model || "points",
                          pointsPerCurrency: loyaltyProgramme?.pointsPerCurrency || 10,
                          minBasketEarn: parseFloat(loyaltyProgramme?.minBasketEarn || "5.00"),
                          earnCooldownMinutes: loyaltyProgramme?.earnCooldownMinutes || 30,
                          dailyEarnCap: loyaltyProgramme?.dailyEarnCap || 3
                        }}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => navigate("/loyalty-dashboard")}
                      >
                        Full Dashboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-border-dim shadow-xl shadow-black/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-fg">Program Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Badge className={`${loyaltyProgramme?.active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                        {loyaltyProgramme?.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <p className="text-lg text-soft">{loyaltyProgramme?.model === 'points' ? 'Points Model' : 'Stamps Model'}</p>
                      <p className="text-base text-soft">{loyaltyProgramme?.pointsPerCurrency || 10} points per £1 spent</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-border-dim shadow-xl shadow-black/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-fg">This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-soft text-base">New Members</span>
                        <span className="font-semibold text-green-400">{membersData?.members?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-soft text-base">Repeat Visits</span>
                        <span className="font-semibold text-blue-400">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-soft text-base">Revenue Impact</span>
                        <span className="font-semibold text-purple-400">£{revenueData?.revenueImpact?.monthToDate?.toFixed(0) || "0"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="bg-card/90 border border-white/40 shadow-xl shadow-white/20">
                <CardHeader>
                  <CardTitle className="text-fg">Recent Loyalty Activity</CardTitle>
                  <CardDescription className="text-fg/80">Latest customer loyalty interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {redemptions.length > 0 ? redemptions.slice(0, 5).map((redemption, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-surface/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-base font-semibold">
                            {redemption.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-fg">{redemption.username || 'Unknown User'}</p>
                            <p className="text-lg text-soft">Redeemed voucher</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-medium text-fg">£{redemption.discount_value || '0'}</p>
                          <p className="text-base text-soft">{new Date(redemption.redeemed_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8">
                        <p className="text-soft">No recent loyalty activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <BillingPreview />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <TeamManagement />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <MerchantSettings />
          </TabsContent>
        </Tabs>
        </main>
      </div>
    </div>
  );
}