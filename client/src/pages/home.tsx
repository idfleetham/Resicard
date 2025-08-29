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
          <div className="relative text-white">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `url("${heroImage}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'grayscale(100%) contrast(1.1) brightness(0.4)',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30"></div>
            
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
              <div className="text-center">
                <div className="mb-12">
                  <h1 className="text-8xl font-bold mb-6 text-white" style={{ textShadow: '4px 4px 8px rgba(0,0,0,0.8)' }}>
                    Resicard©
                  </h1>
                  <h2 className="text-5xl font-light text-white/95 mb-8" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                    St Andrews
                  </h2>
                </div>
                <p className="text-2xl mb-16 text-white/90 max-w-4xl mx-auto leading-relaxed font-light" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
                  Your exclusive community membership for premium local deals, verified businesses, and exceptional savings in Scotland's historic town
                </p>

                <div className="space-x-6">
                  <Button 
                    size="lg" 
                    className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 rounded-2xl px-16 py-6 text-xl font-semibold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
                    onClick={() => setShowRoleSelector(true)}
                  >
                    <Rocket className="h-6 w-6 mr-3" />
                    Begin Your Journey
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="bg-slate-50 py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-20">
                <h2 className="text-5xl font-bold text-slate-800 mb-6">
                  Trusted by the Community
                </h2>
                <p className="text-2xl text-slate-600 max-w-3xl mx-auto font-light">
                  Join thousands of St Andrews residents experiencing exceptional savings with our curated collection of local businesses
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="p-3 bg-slate-100 rounded-xl inline-block mb-6">
                    <Ticket className="h-8 w-8 text-slate-700" />
                  </div>
                  <div className="text-4xl font-bold text-slate-800 mb-3">
                    {deals.filter(deal => deal.isActive).length}
                  </div>
                  <div className="text-slate-600 text-lg font-medium">Active Deals</div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="p-3 bg-slate-100 rounded-xl inline-block mb-6">
                    <Users className="h-8 w-8 text-slate-700" />
                  </div>
                  <div className="text-4xl font-bold text-slate-800 mb-3">
                    {platformStats?.totalBusinesses || 0}
                  </div>
                  <div className="text-slate-600 text-lg font-medium">Local Businesses</div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="p-3 bg-slate-100 rounded-xl inline-block mb-6">
                    <CheckCircle className="h-8 w-8 text-slate-700" />
                  </div>
                  <div className="text-4xl font-bold text-slate-800 mb-3">
                    {platformStats?.totalRedemptions || 0}
                  </div>
                  <div className="text-slate-600 text-lg font-medium">Voucher Redemptions</div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="p-3 bg-slate-100 rounded-xl inline-block mb-6">
                    <Calendar className="h-8 w-8 text-slate-700" />
                  </div>
                  <div className="text-4xl font-bold text-slate-800 mb-3">
                    {platformStats?.totalUsers || 0}
                  </div>
                  <div className="text-slate-600 text-lg font-medium">Active Members</div>
                </div>
              </div>
            </div>
          </div>

          {/* All Deals */}
          <div className="bg-white py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-20">
                <h2 className="text-5xl font-bold text-slate-800 mb-6">
                  Current Local Deals
                </h2>
                <p className="text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed font-light">
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
            
            <div className="text-center mt-20">
              <Button 
                size="lg" 
                onClick={() => setShowRoleSelector(true)}
                className="bg-slate-800 hover:bg-slate-900 text-white rounded-2xl px-16 py-6 text-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Join to Access All Deals
              </Button>
            </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-slate-50 py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-20">
                <h2 className="text-5xl font-bold text-slate-800 mb-6">
                  How Resicard© Works
                </h2>
                <p className="text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed font-light">
                  Three simple steps to unlock exclusive savings at your favorite local spots
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center inline-block mb-8">
                    <span className="text-2xl font-bold text-slate-700">1</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">Sign Up & Verify</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Register with your postcode to verify you're within 10 miles of St Andrews and complete your residency verification
                  </p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center inline-block mb-8">
                    <span className="text-2xl font-bold text-slate-700">2</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">Browse Premium Deals</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Explore exclusive offers from verified restaurants, bars, cafes, and premium local businesses
                  </p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center inline-block mb-8">
                    <span className="text-2xl font-bold text-slate-700">3</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">Create Vouchers & Save</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Build your digital voucher wallet and redeem instantly at participating businesses with QR codes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h3 className="text-4xl font-bold mb-6 text-white">
                Resicard© St Andrews
              </h3>
              <p className="text-slate-300 text-xl mb-8 font-light">
                Your exclusive community membership platform
              </p>
              <div className="text-slate-400">
                <p className="text-lg">&copy; 2024 Resicard St Andrews. All rights reserved.</p>
                <div className="mt-6 space-x-8">
                  <Link href="/admin-signup" className="text-slate-300 hover:text-white transition-colors duration-300 font-medium text-lg">
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
