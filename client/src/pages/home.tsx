import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import RoleSelector from "@/components/role-selector";
import DealCard from "@/components/deal-card";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Rocket, Users, Ticket, PiggyBank, Calendar, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequestWithAuth } from "@/lib/auth";
import type { DealWithMerchant } from "@shared/schema";
import heroImage from "@assets/IMG_5180_1749763959712.jpeg";

export default function Home() {
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['/api/deals'],
    queryFn: async () => {
      const response = await fetch('/api/deals');
      return response.json() as Promise<DealWithMerchant[]>;
    },
  });

  // Fetch platform statistics
  const { data: platformStats } = useQuery({
    queryKey: ['/api/analytics/platform/stats'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/platform/stats');
      return response.json();
    },
  });

  // Show role selector if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen">
          {/* Hero Section */}
          <div className="relative bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 text-white overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-48 translate-x-48"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-36 -translate-x-36"></div>
            <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/10 rounded-full -translate-x-24 -translate-y-24"></div>
            
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
              <div className="text-center">
                <div className="mb-8 text-center">
                  <h1 className="text-7xl font-bold mb-4 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                    Resicard©
                  </h1>
                  <h2 className="text-4xl font-semibold text-white/90 mb-6">
                    St Andrews
                  </h2>
                </div>
                <p className="text-2xl mb-12 text-white/80 max-w-3xl mx-auto leading-relaxed">
                  Your premium community membership for exclusive local deals, verified businesses, and exceptional savings in St Andrews
                </p>

                <div className="space-x-6">
                  <Button 
                    size="lg" 
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 rounded-3xl px-12 py-6 text-xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                    onClick={() => setShowRoleSelector(true)}
                  >
                    <Rocket className="h-6 w-6 mr-3" />
                    Get Started Today
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-100 py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-4">
                  Trusted by the Community
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Join thousands of St Andrews residents saving with verified local businesses
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="bg-white rounded-3xl shadow-2xl border-0 p-8 text-center ring-1 ring-gray-100 hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-4 bg-gradient-to-r from-indigo-100 to-violet-100 rounded-2xl inline-block mb-6">
                    <Ticket className="h-10 w-10 text-indigo-600" />
                  </div>
                  <div className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-3">
                    {deals.filter(deal => deal.isActive).length}
                  </div>
                  <div className="text-gray-600 text-lg font-semibold">Active Deals</div>
                </div>
                
                <div className="bg-white rounded-3xl shadow-2xl border-0 p-8 text-center ring-1 ring-gray-100 hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-2xl inline-block mb-6">
                    <Users className="h-10 w-10 text-emerald-600" />
                  </div>
                  <div className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
                    {platformStats?.totalBusinesses || 0}
                  </div>
                  <div className="text-gray-600 text-lg font-semibold">Local Businesses</div>
                </div>
                
                <div className="bg-white rounded-3xl shadow-2xl border-0 p-8 text-center ring-1 ring-gray-100 hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl inline-block mb-6">
                    <CheckCircle className="h-10 w-10 text-amber-600" />
                  </div>
                  <div className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-3">
                    {platformStats?.totalRedemptions || 0}
                  </div>
                  <div className="text-gray-600 text-lg font-semibold">Voucher Redemptions</div>
                </div>
                
                <div className="bg-white rounded-3xl shadow-2xl border-0 p-8 text-center ring-1 ring-gray-100 hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl inline-block mb-6">
                    <Calendar className="h-10 w-10 text-blue-600" />
                  </div>
                  <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3">
                    {platformStats?.totalUsers || 0}
                  </div>
                  <div className="text-gray-600 text-lg font-semibold">Active Members</div>
                </div>
              </div>
            </div>
          </div>

          {/* All Deals */}
          <div className="bg-white py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-6">
                  Current Local Deals
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Discover exclusive offers from our handpicked collection of verified local businesses
                </p>
              </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted" />
                    <CardBody className="p-6 space-y-3">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-6 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </CardBody>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deals.map((deal) => (
                  <DealCard 
                    key={deal.id} 
                    deal={deal} 
                    showMerchantInfo={true}
                  />
                ))}
              </div>
            )}
            
            <div className="text-center mt-16">
              <Button 
                size="lg" 
                onClick={() => setShowRoleSelector(true)}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-3xl px-12 py-6 text-xl font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                Join to Access All Deals
              </Button>
            </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-100 py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-6">
                  How Resicard© Works
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Three simple steps to unlock exclusive savings at your favorite local spots
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="bg-white rounded-3xl shadow-2xl border-0 p-10 text-center ring-1 ring-gray-100 hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-6 bg-gradient-to-r from-indigo-100 to-violet-100 rounded-3xl inline-block mb-8">
                    <span className="text-4xl font-bold text-indigo-600">1</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Sign Up & Verify</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Register with your postcode to verify you're within 10 miles of St Andrews and complete your residency verification
                  </p>
                </div>
                
                <div className="bg-white rounded-3xl shadow-2xl border-0 p-10 text-center ring-1 ring-gray-100 hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-6 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-3xl inline-block mb-8">
                    <span className="text-4xl font-bold text-emerald-600">2</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Browse Premium Deals</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Explore exclusive offers from verified restaurants, bars, cafes, and premium local businesses
                  </p>
                </div>
                
                <div className="bg-white rounded-3xl shadow-2xl border-0 p-10 text-center ring-1 ring-gray-100 hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-6 bg-gradient-to-r from-amber-100 to-orange-100 rounded-3xl inline-block mb-8">
                    <span className="text-4xl font-bold text-amber-600">3</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Create Vouchers & Save</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Build your digital voucher wallet and redeem instantly at participating businesses with QR codes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                Resicard© St Andrews
              </h3>
              <p className="text-white/70 text-lg mb-6">
                Your premium community membership platform
              </p>
              <div className="text-white/60 text-sm">
                <p>&copy; 2024 Resicard St Andrews. All rights reserved.</p>
                <div className="mt-4 space-x-6">
                  <Link href="/admin-signup" className="text-white/70 hover:text-white transition-colors duration-300 font-semibold">
                    Admin Portal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
        
        <RoleSelector 
          isVisible={showRoleSelector} 
          onClose={() => setShowRoleSelector(false)} 
        />
      </>
    );
  }

  // Redirect authenticated users to their dashboard
  if (user) {
    switch (user.role) {
      case 'resident':
        window.location.href = '/resident';
        break;
      case 'merchant':
        window.location.href = '/merchant';
        break;
      case 'admin':
        window.location.href = '/admin';
        break;
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    </>
  );
}
