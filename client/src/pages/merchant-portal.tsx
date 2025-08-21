import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Building2
} from "lucide-react";

// Import components for each tab
import OffersManager from "../components/merchant/offers-manager";
import RedemptionsFeed from "../components/merchant/redemptions-feed";
import QRRedemption from "../components/merchant/qr-redemption";
import BillingPreview from "../components/merchant/billing-preview";
import TeamManagement from "../components/merchant/team-management";
import MerchantSettings from "../components/merchant/merchant-settings";

export default function MerchantPortal() {
  const { user, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("offers");

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "merchant")) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-slate-100">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_800px_at_10%_-10%,#1b2140_0%,transparent_55%),radial-gradient(1000px_700px_at_110%_0%,#1b243a_0%,transparent_50%)]" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="space-y-4 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 mx-auto bg-slate-800" />
              <Skeleton className="h-3 w-24 mx-auto bg-slate-800" />
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
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_800px_at_10%_-10%,#1b2140_0%,transparent_55%),radial-gradient(1000px_700px_at_110%_0%,#1b243a_0%,transparent_50%)]" />
      
      {/* Hero Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-slate-900/50 border-slate-700 hover:shadow-xl hover:border-slate-600 transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-slate-100">
                      {user.businessName || "Merchant Portal"}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Manage your offers, track redemptions, and grow your business
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Verified Business
                  </Badge>
                  <Button variant="outline" onClick={logout} className="border-slate-700 hover:bg-slate-800">
                    Logout
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </motion.div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 bg-slate-900/50 border-slate-700">
            <TabsTrigger value="offers" className="flex items-center space-x-2 data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Offers</span>
            </TabsTrigger>
            <TabsTrigger value="redemptions" className="flex items-center space-x-2 data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Redemptions</span>
            </TabsTrigger>
            <TabsTrigger value="qr-redemption" className="flex items-center space-x-2 data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR Scan</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center space-x-2 data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center space-x-2 data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2 data-[state=active]:bg-slate-800 data-[state=active]:text-blue-400">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offers" className="mt-6">
            <OffersManager />
          </TabsContent>

          <TabsContent value="redemptions" className="mt-6">
            <RedemptionsFeed />
          </TabsContent>

          <TabsContent value="qr-redemption" className="mt-6">
            <QRRedemption />
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
  );
}