import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import RoleSelector from "@/components/role-selector";
import DealCard from "@/components/deal-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CheckCircle, Users, Ticket, PiggyBank, Calendar } from "lucide-react";
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
        <div className="min-h-screen bg-slate-100">
          {/* Hero Section */}
          <div className="relative coastal-gradient text-white">
            <div 
              className="absolute inset-0 hero-overlay"
              style={{
                backgroundImage: `url("${heroImage}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
              <div className="text-center">
                <div className="mb-6 text-center">
                  <h1 className="text-5xl font-bold mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                    Resicard©
                  </h1>
                  <h2 className="text-3xl font-medium" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                    St Andrews
                  </h2>
                </div>
                <p className="text-xl mb-8 opacity-90" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  Your community card for exclusive local deals and savings
                </p>
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 inline-block mb-8">
                  <div className="flex items-center text-white">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>Serving the St Andrews community</span>
                    <CheckCircle className="h-5 w-5 text-green-400 ml-2" />
                  </div>
                </div>
                <div className="space-x-4">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold px-8 py-4 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    onClick={() => setShowRoleSelector(true)}
                  >
                    🚀 Get Started Today
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
                <CardContent className="p-6 text-center">
                  <div className="bg-primary/10 p-3 rounded-lg inline-block mb-4">
                    <Ticket className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {deals.filter(deal => deal.isActive).length}
                  </div>
                  <div className="text-muted-foreground">Active Deals</div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
                <CardContent className="p-6 text-center">
                  <div className="bg-green-100 p-3 rounded-lg inline-block mb-4">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {platformStats?.totalBusinesses || 0}
                  </div>
                  <div className="text-muted-foreground">Local Businesses</div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
                <CardContent className="p-6 text-center">
                  <div className="bg-amber-100 p-3 rounded-lg inline-block mb-4">
                    <CheckCircle className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {platformStats?.totalRedemptions || 0}
                  </div>
                  <div className="text-muted-foreground">Voucher Redemptions</div>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
                <CardContent className="p-6 text-center">
                  <div className="bg-blue-100 p-3 rounded-lg inline-block mb-4">
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {platformStats?.totalUsers || 0}
                  </div>
                  <div className="text-muted-foreground">Active Members</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* All Deals */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Current Local Deals
              </h2>
              <p className="text-muted-foreground text-lg">
                All available deals from our verified local businesses
              </p>
            </div>
            
            {isLoading ? (
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
                className="coastal-gradient"
              >
                Join to Access All Deals
              </Button>
            </div>
          </div>

          {/* How it Works */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                How Resicard© Works
              </h2>
              <p className="text-muted-foreground text-lg">
                Simple steps to start saving at your favorite local spots
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardContent className="p-8">
                  <div className="bg-primary/10 p-4 rounded-full inline-block mb-6">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-4">Sign Up & Verify</h3>
                  <p className="text-muted-foreground">
                    Register with your postcode to verify you're within 10 miles of St Andrews
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="p-8">
                  <div className="bg-primary/10 p-4 rounded-full inline-block mb-6">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-4">Browse Deals</h3>
                  <p className="text-muted-foreground">
                    Explore exclusive offers from restaurants, bars, cafes, and more
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="p-8">
                  <div className="bg-primary/10 p-4 rounded-full inline-block mb-6">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-4">Create Vouchers & Save</h3>
                  <p className="text-muted-foreground">
                    Build your voucher wallet and redeem at participating businesses
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="bg-slate-100 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-sm text-muted-foreground">
              <p>&copy; 2024 Resicard St Andrews. All rights reserved.</p>
              <div className="mt-2 space-x-4">
                <Link href="/admin-signup" className="hover:text-primary">
                  Admin Portal
                </Link>
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
