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
          <div className="relative h-screen text-white overflow-hidden">
            <div 
              className="absolute inset-0 w-full h-full"
              style={{
                backgroundImage: `url(${heroImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <div 
              className="absolute inset-0 w-full h-full"
              style={{
                backgroundImage: `url(${heroImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                filter: 'grayscale(100%) contrast(1.2) brightness(0.5)',
                mixBlendMode: 'multiply',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40"></div>
            
            <div className="relative flex items-center justify-center h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <div className="mb-12">
                  <h1 className="text-8xl font-bold mb-6 text-white" style={{ textShadow: '4px 4px 12px rgba(0,0,0,0.9)' }}>
                    Resicard©
                  </h1>
                  <h2 className="text-5xl font-light text-white/95 mb-8" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>
                    St Andrews
                  </h2>
                </div>
                <p className="text-2xl mb-16 text-white/90 max-w-4xl mx-auto leading-relaxed font-light" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.8)' }}>
                  Your exclusive community membership for premium local deals, verified businesses, and exceptional savings in Scotland's historic town
                </p>

                <div className="space-x-6">
                  <Button 
                    size="lg" 
                    className="bg-white/15 backdrop-blur-md hover:bg-white/25 text-white border-2 border-white/40 hover:border-white/60 rounded-2xl px-16 py-6 text-xl font-semibold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
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
          <div className="bg-slate-50 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-slate-800 mb-4">
                  Trusted by the Community
                </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto font-light">
                  Join thousands of St Andrews residents experiencing exceptional savings with our curated collection of local businesses
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="p-2 bg-slate-100 rounded-lg inline-block mb-4">
                    <Ticket className="h-6 w-6 text-slate-700" />
                  </div>
                  <div className="text-3xl font-bold text-slate-800 mb-2">
                    {deals.filter(deal => deal.isActive).length}
                  </div>
                  <div className="text-slate-600 text-base font-medium">Active Deals</div>
                </div>
                
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="p-2 bg-slate-100 rounded-lg inline-block mb-4">
                    <Users className="h-6 w-6 text-slate-700" />
                  </div>
                  <div className="text-3xl font-bold text-slate-800 mb-2">
                    {platformStats?.totalBusinesses || 0}
                  </div>
                  <div className="text-slate-600 text-base font-medium">Local Businesses</div>
                </div>
                
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="p-2 bg-slate-100 rounded-lg inline-block mb-4">
                    <CheckCircle className="h-6 w-6 text-slate-700" />
                  </div>
                  <div className="text-3xl font-bold text-slate-800 mb-2">
                    {platformStats?.totalRedemptions || 0}
                  </div>
                  <div className="text-slate-600 text-base font-medium">Voucher Redemptions</div>
                </div>
                
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="p-2 bg-slate-100 rounded-lg inline-block mb-4">
                    <Calendar className="h-6 w-6 text-slate-700" />
                  </div>
                  <div className="text-3xl font-bold text-slate-800 mb-2">
                    {platformStats?.totalUsers || 0}
                  </div>
                  <div className="text-slate-600 text-base font-medium">Active Members</div>
                </div>
              </div>
            </div>
          </div>

          {/* All Deals */}
          <div className="bg-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-slate-800 mb-4">
                  Current Local Deals
                </h2>
                <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed font-light">
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
            
            <div className="text-center mt-12">
              <Button 
                size="lg" 
                onClick={() => setShowRoleSelector(true)}
                className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-12 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Join to Access All Deals
              </Button>
            </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-slate-50 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-slate-800 mb-4">
                  How Resicard© Works
                </h2>
                <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed font-light">
                  Three simple steps to unlock exclusive savings at your favorite local spots
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center inline-block mb-6">
                    <span className="text-xl font-bold text-slate-700">1</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-4">Sign Up & Verify</h3>
                  <p className="text-slate-600 text-base leading-relaxed">
                    Register with your postcode to verify you're within 10 miles of St Andrews and complete your residency verification
                  </p>
                </div>
                
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center inline-block mb-6">
                    <span className="text-xl font-bold text-slate-700">2</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-4">Browse Premium Deals</h3>
                  <p className="text-slate-600 text-base leading-relaxed">
                    Explore exclusive offers from verified restaurants, bars, cafes, and premium local businesses
                  </p>
                </div>
                
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center inline-block mb-6">
                    <span className="text-xl font-bold text-slate-700">3</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-4">Create Vouchers & Save</h3>
                  <p className="text-slate-600 text-base leading-relaxed">
                    Build your digital voucher wallet and redeem instantly at participating businesses with QR codes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h3 className="text-3xl font-bold mb-4 text-white">
                Resicard© St Andrews
              </h3>
              <p className="text-slate-300 text-lg mb-6 font-light">
                Your exclusive community membership platform
              </p>
              <div className="text-slate-400">
                <p className="text-base">&copy; 2024 Resicard St Andrews. All rights reserved.</p>
                <div className="mt-4 space-x-6">
                  <Link href="/admin-signup" className="text-slate-300 hover:text-white transition-colors duration-300 font-medium">
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
