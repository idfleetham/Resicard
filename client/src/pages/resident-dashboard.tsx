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
import { Ticket, CheckCircle, PiggyBank, Calendar, MapPin, Filter } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequestWithAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DealWithMerchant, Redemption } from "@shared/schema";

export default function ResidentDashboard() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch deals
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['/api/deals', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory ? `/api/deals?category=${selectedCategory}` : '/api/deals';
      const response = await fetch(url);
      return response.json() as Promise<DealWithMerchant[]>;
    },
  });

  // Fetch user's redemptions
  const { data: redemptions = [] } = useQuery({
    queryKey: ['/api/redemptions/user', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequestWithAuth('GET', `/api/redemptions/user/${user.id}`);
      return response.json() as Promise<Redemption[]>;
    },
    enabled: !!user,
  });

  // Redeem deal mutation
  const redeemDealMutation = useMutation({
    mutationFn: async ({ dealId, value }: { dealId: number; value?: number }) => {
      const response = await apiRequestWithAuth('POST', '/api/redemptions', { dealId, value });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Redeemed!",
        description: "Your voucher has been successfully redeemed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/redemptions/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Failed to redeem deal",
        variant: "destructive",
      });
    },
  });

  const handleRedeemDeal = (dealId: number) => {
    redeemDealMutation.mutate({ dealId });
  };

  // Filter deals
  const filteredDeals = deals.filter(deal => {
    if (availableOnly) {
      const isExpired = new Date(deal.expiryDate) < new Date();
      const isFullyUsed = deal.usageCount >= deal.usageLimit;
      return !isExpired && !isFullyUsed && deal.isActive;
    }
    return true;
  });

  // Calculate stats
  const totalSavings = redemptions.reduce((sum, r) => sum + Number(r.value || 0), 0);
  const thisMonthRedemptions = redemptions.filter(r => {
    const redemptionDate = new Date(r.redeemedAt);
    const now = new Date();
    return redemptionDate.getMonth() === now.getMonth() && 
           redemptionDate.getFullYear() === now.getFullYear();
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
              backgroundImage: 'url("https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=2000&h=600&fit=crop")',
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
                Discover exclusive deals in St Andrews
              </p>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 inline-block">
                <div className="flex items-center text-white">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>Verified local resident</span>
                  <CheckCircle className="h-4 w-4 text-green-400 ml-2" />
                </div>
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
                        const isFullyUsed = d.usageCount >= d.usageLimit;
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
                    <p className="text-sm text-muted-foreground">Used This Month</p>
                    <p className="text-2xl font-bold text-foreground">
                      {thisMonthRedemptions.length}
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
                    <p className="text-sm text-muted-foreground">Total Saved</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(totalSavings)}
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
                    <SelectItem value="">All Categories</SelectItem>
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
                    onCheckedChange={setAvailableOnly}
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
                  onRedeem={handleRedeemDeal}
                  isLoading={redeemDealMutation.isPending}
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
                    onClick={() => setSelectedCategory("")}
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
                  <Button className="coastal-gradient">
                    Renew Membership
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
