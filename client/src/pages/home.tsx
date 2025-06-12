import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

  // Show role selector if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-slate-50">
          {/* Hero Section */}
          <div className="relative coastal-gradient text-white">
            <div 
              className="absolute inset-0 hero-overlay"
              style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=2000&h=600&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
              <div className="text-center">
                <h1 className="text-5xl font-bold mb-6">
                  Discover Local Deals in St Andrews
                </h1>
                <p className="text-xl mb-8 opacity-90">
                  Exclusive offers for verified local residents and the best businesses in town
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
                    className="bg-white text-primary hover:bg-gray-100"
                    onClick={() => setShowRoleSelector(true)}
                  >
                    Get Started
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white text-white hover:bg-white hover:text-primary"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="bg-primary/10 p-3 rounded-lg inline-block mb-4">
                    <Ticket className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    {deals.length}
                  </div>
                  <div className="text-muted-foreground">Active Deals</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="bg-green-100 p-3 rounded-lg inline-block mb-4">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">42</div>
                  <div className="text-muted-foreground">Local Businesses</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="bg-amber-100 p-3 rounded-lg inline-block mb-4">
                    <PiggyBank className="h-8 w-8 text-amber-600" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">£127k</div>
                  <div className="text-muted-foreground">Community Savings</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="bg-blue-100 p-3 rounded-lg inline-block mb-4">
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">1,205</div>
                  <div className="text-muted-foreground">Active Members</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Featured Deals */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Featured Local Deals
              </h2>
              <p className="text-muted-foreground text-lg">
                A taste of what's available to our community members
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
                {deals.slice(0, 6).map((deal) => (
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
                How LocalPerks Works
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
                  <h3 className="text-xl font-semibold mb-4">Redeem & Save</h3>
                  <p className="text-muted-foreground">
                    Use deals at participating businesses and track your savings
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
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
