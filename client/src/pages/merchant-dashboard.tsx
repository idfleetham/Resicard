import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import CreateDealModal from "@/components/create-deal-modal";
import QRScanner from "@/components/qr-scanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Ticket, 
  Users, 
  ChartLine, 
  Percent, 
  Plus, 
  BarChart3, 
  Download, 
  Edit, 
  Pause, 
  Play, 
  Trash2, 
  Copy,
  MapPin,
  QrCode,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequestWithAuth } from "@/lib/auth";
import { formatCurrency, formatDate, formatRelativeTime, getDealCategoryColor, getStatusColor } from "@/lib/utils";
import type { Deal, Redemption } from "@shared/schema";

export default function MerchantDashboard() {
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedVoucher, setLastScannedVoucher] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch merchant's deals
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['/api/deals/merchant', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequestWithAuth('GET', `/api/deals/merchant/${user.id}`);
      return response.json() as Promise<Deal[]>;
    },
    enabled: !!user,
  });

  // Fetch merchant's revenue
  const { data: revenueData } = useQuery({
    queryKey: ['/api/analytics/merchant', user?.id, 'revenue'],
    queryFn: async () => {
      if (!user) return { revenue: 0 };
      const response = await apiRequestWithAuth('GET', `/api/analytics/merchant/${user.id}/revenue`);
      return response.json() as Promise<{ revenue: number }>;
    },
    enabled: !!user,
  });

  // Fetch merchant's redemptions
  const { data: redemptions = [] } = useQuery({
    queryKey: ['/api/redemptions/merchant', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequestWithAuth('GET', `/api/redemptions/merchant/${user.id}`);
      return response.json() as Promise<Redemption[]>;
    },
    enabled: !!user,
  });

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async ({ dealId, updates }: { dealId: number; updates: Partial<Deal> }) => {
      const response = await apiRequestWithAuth('PUT', `/api/deals/${dealId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Updated",
        description: "Deal has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deals/merchant'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update deal",
        variant: "destructive",
      });
    },
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: number) => {
      const response = await apiRequestWithAuth('DELETE', `/api/deals/${dealId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Deleted",
        description: "Deal has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deals/merchant'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete deal",
        variant: "destructive",
      });
    },
  });

  // QR Code redemption mutation
  const redeemVoucherMutation = useMutation({
    mutationFn: async (voucherData: any) => {
      const response = await apiRequestWithAuth('POST', '/api/vouchers/redeem-qr', voucherData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Voucher Redeemed Successfully",
        description: `${data.dealTitle} has been redeemed for ${data.customerName}`,
      });
      setLastScannedVoucher(data);
      setIsScanning(false);
      queryClient.invalidateQueries({ queryKey: ['/api/redemptions/merchant'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals/merchant'] });
    },
    onError: (error: any) => {
      console.error('Voucher redemption error:', error);
      setIsScanning(false); // Stop scanning on error
      
      let errorMessage = "Failed to redeem voucher";
      
      if (error.response?.status === 403) {
        errorMessage = error.response.data?.message || "This voucher is for another business";
      } else if (error.response?.status === 404) {
        errorMessage = "Voucher not found or expired";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Invalid voucher";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Cannot Redeem Voucher",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleToggleDeal = (dealId: number, isActive: boolean | null) => {
    updateDealMutation.mutate({ dealId, updates: { isActive: !(isActive ?? false) } });
  };

  const handleQRScan = (qrData: string) => {
    try {
      const voucherData = JSON.parse(qrData);
      
      // Validate required fields
      if (!voucherData.voucherNumber || !voucherData.dealId || !voucherData.userId) {
        toast({
          title: "Invalid QR Code",
          description: "The scanned QR code is missing required voucher data",
          variant: "destructive",
        });
        return;
      }
      
      // Show preview of what's being redeemed
      toast({
        title: "Processing Voucher",
        description: `Redeeming voucher for ${voucherData.dealTitle || 'deal'} from ${voucherData.merchantName || 'merchant'}`,
      });
      
      redeemVoucherMutation.mutate(voucherData);
    } catch (error) {
      console.error('QR scan error:', error);
      toast({
        title: "Invalid QR Code",
        description: "The scanned QR code is not a valid voucher format",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDeal = (dealId: number) => {
    if (confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
      deleteDealMutation.mutate(dealId);
    }
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
  };

  const getDealStatus = (deal: Deal) => {
    const isExpired = new Date(deal.expiryDate) < new Date();
    const isFullyUsed = (deal.usageCount || 0) >= deal.usageLimit;
    
    if (isExpired) return 'expired';
    if (isFullyUsed) return 'fully-used';
    if (!deal.isActive) return 'paused';
    return 'active';
  };

  // Calculate stats
  const activeDeals = deals.filter(d => d.isActive && new Date(d.expiryDate) > new Date());
  const totalRedemptions = redemptions.length;
  const thisWeekRedemptions = redemptions.filter(r => {
    if (!r.redeemedAt) return false;
    const redemptionDate = new Date(r.redeemedAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return redemptionDate > weekAgo;
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

  if (!user.isVerified) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Card className="max-w-md mx-4">
            <CardContent className="p-8 text-center">
              <div className="bg-amber-100 p-4 rounded-full inline-block mb-4">
                <Users className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Pending Verification</h2>
              <p className="text-muted-foreground mb-4">
                Your business application is currently under review by our admin team. 
                You'll receive an email notification once your account is verified.
              </p>
              <Badge className="bg-amber-100 text-amber-800">
                Verification Pending
              </Badge>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Merchant Header */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {user?.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt="Business Profile" 
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  
                  <div className="ml-4">
                    <h1 className="text-2xl font-bold text-foreground">{user.businessName}</h1>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                    {user.businessAddress && (
                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {user.businessAddress}
                      </p>
                    )}
                  </div>
                </div>
                
                <Badge className="bg-green-100 text-green-800">
                  Verified Business
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Ticket className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Active Deals</p>
                    <p className="text-2xl font-bold text-foreground">{activeDeals.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Total Redemptions</p>
                    <p className="text-2xl font-bold text-foreground">{totalRedemptions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <ChartLine className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold text-foreground">{thisWeekRedemptions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="bg-amber-100 p-3 rounded-lg">
                    <Percent className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Commission Rate</p>
                    <p className="text-2xl font-bold text-foreground">5%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Tabs */}
          <Tabs defaultValue="deals" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deals">Manage Deals</TabsTrigger>
              <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="deals" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Your Deals</CardTitle>
                    <Button 
                      onClick={() => setShowCreateDeal(true)}
                      className="coastal-gradient"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Deal
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {dealsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="h-6 bg-muted rounded w-1/4" />
                              <div className="h-4 bg-muted rounded w-3/4" />
                              <div className="h-4 bg-muted rounded w-1/2" />
                            </div>
                            <div className="flex space-x-2">
                              <div className="h-8 w-8 bg-muted rounded" />
                              <div className="h-8 w-8 bg-muted rounded" />
                              <div className="h-8 w-8 bg-muted rounded" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : deals.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-muted rounded-full p-6 mx-auto w-20 h-20 flex items-center justify-center mb-4">
                        <Ticket className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No deals yet</h3>
                      <p className="text-muted-foreground mb-4">Create your first deal to start attracting customers</p>
                      <Button 
                        onClick={() => setShowCreateDeal(true)}
                        className="coastal-gradient"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Deal
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {deals.map((deal) => {
                        const status = getDealStatus(deal);
                        const usagePercentage = ((deal.usageCount || 0) / deal.usageLimit) * 100;
                        
                        return (
                          <div key={deal.id} className="border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-foreground">{deal.title}</h3>
                                  <Badge className={getDealCategoryColor(deal.category)}>
                                    {deal.category}
                                  </Badge>
                                  <Badge className={getStatusColor(status)}>
                                    {status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{deal.description}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Expires: {formatRelativeTime(deal.expiryDate)}</span>
                                  <span>{deal.usageCount || 0}/{deal.usageLimit} used</span>
                                  {deal.originalValue && Number(deal.originalValue) > 0 && (
                                    <span>Value: {formatCurrency(Number(deal.originalValue))}</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditDeal(deal)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleDeal(deal.id, deal.isActive)}
                                >
                                  {deal.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteDeal(deal.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Usage Progress</span>
                                <span className="text-sm font-medium text-foreground">
                                  {Math.round(usagePercentage)}%
                                </span>
                              </div>
                              <Progress value={usagePercentage} className="h-2" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scanner" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <QRScanner 
                  onScan={handleQRScan}
                  isScanning={isScanning}
                  onToggleScanning={() => setIsScanning(!isScanning)}
                />
                
                {lastScannedVoucher && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Last Redemption
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><strong>Customer:</strong> {lastScannedVoucher.customerName}</p>
                        <p><strong>Deal:</strong> {lastScannedVoucher.dealTitle}</p>
                        <p><strong>Voucher:</strong> {lastScannedVoucher.voucherNumber}</p>
                        <p><strong>Time:</strong> {new Date(lastScannedVoucher.redeemedAt).toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {/* Overall Merchant Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Merchant Revenue Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Calculate total revenue across all deals
                    let totalMerchantRevenue = 0;
                    
                    deals.forEach(deal => {
                      const dealRedemptions = redemptions.filter(r => r.dealId === deal.id);
                      const vouchersRedeemed = dealRedemptions.length;
                      
                      let dealValue = 0;
                      const discountVal = parseFloat((deal.discountValue as string) || '0');
                      const originalVal = parseFloat((deal.originalValue as string) || '0');
                      
                      if (deal.discountType === 'percentage' && originalVal > 0) {
                        // For percentage deals, use the discount amount (what customer saves)
                        dealValue = originalVal * (discountVal / 100);
                      } else if (deal.discountType === 'fixed') {
                        // For fixed deals, use the discount value (what customer saves)
                        dealValue = discountVal;
                      } else {
                        // Default fallback
                        dealValue = discountVal || originalVal;
                      }
                      
                      totalMerchantRevenue += vouchersRedeemed * dealValue;
                    });
                    
                    const monthlyRevenue = totalMerchantRevenue / 12;
                    const totalCommission = totalMerchantRevenue * 0.05;
                    
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-green-700 mb-1">Total Revenue</h3>
                          <p className="text-2xl font-bold text-green-600">
                            £{totalMerchantRevenue.toFixed(2)}
                          </p>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-blue-700 mb-1">Monthly Revenue</h3>
                          <p className="text-2xl font-bold text-blue-600">
                            £{monthlyRevenue.toFixed(2)}
                          </p>
                        </div>
                        
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-purple-700 mb-1">Commission Rate</h3>
                          <p className="text-2xl font-bold text-purple-600">5%</p>
                        </div>
                        
                        <div className="bg-amber-50 p-4 rounded-lg">
                          <h3 className="text-sm font-medium text-amber-700 mb-1">Total Commission Due</h3>
                          <p className="text-2xl font-bold text-amber-600">
                            £{totalCommission.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Deal-by-Deal Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Deal Performance Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deals.map((deal) => {
                      const dealRedemptions = redemptions.filter(r => r.dealId === deal.id);
                      const vouchersCreated = deal.usageCount || 0;
                      const vouchersRedeemed = dealRedemptions.length;
                      
                      // Calculate actual revenue based on deal value
                      let dealValue = 0;
                      const discountVal = parseFloat((deal.discountValue as string) || '0');
                      const originalVal = parseFloat((deal.originalValue as string) || '0');
                      
                      if (deal.discountType === 'percentage' && originalVal > 0) {
                        // For percentage deals, use the discount amount (what customer saves)
                        dealValue = originalVal * (discountVal / 100);
                      } else if (deal.discountType === 'fixed') {
                        // For fixed deals, use the discount value (what customer saves)
                        dealValue = discountVal;
                      } else {
                        // Default fallback
                        dealValue = discountVal || originalVal;
                      }
                      
                      const totalRevenue = vouchersRedeemed * dealValue;
                      
                      return (
                        <div key={deal.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-lg">{deal.title}</h4>
                              <p className="text-sm text-muted-foreground">{deal.category}</p>
                              <p className="text-xs text-muted-foreground">
                                Value: {deal.discountType === 'percentage' 
                                  ? `${deal.discountValue}% off £${deal.originalValue || 0}`
                                  : `£${deal.discountValue} ${deal.originalValue ? `(was £${deal.originalValue})` : ''}`
                                }
                              </p>
                            </div>
                            <Badge variant={deal.isActive ? "default" : "secondary"}>
                              {deal.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-3 rounded border">
                              <p className="text-xs text-muted-foreground">Vouchers in Wallets</p>
                              <p className="text-xl font-bold text-blue-600">{vouchersCreated}</p>
                            </div>
                            
                            <div className="bg-white p-3 rounded border">
                              <p className="text-xs text-muted-foreground">Vouchers Redeemed</p>
                              <p className="text-xl font-bold text-green-600">{vouchersRedeemed}</p>
                            </div>
                            
                            <div className="bg-white p-3 rounded border">
                              <p className="text-xs text-muted-foreground">Total Revenue</p>
                              <p className="text-xl font-bold text-purple-600">£{totalRevenue.toFixed(2)}</p>
                            </div>
                            
                            <div className="bg-white p-3 rounded border">
                              <p className="text-xs text-muted-foreground">Redemption Rate</p>
                              <p className="text-xl font-bold text-amber-600">
                                {vouchersCreated > 0 ? `${Math.round((vouchersRedeemed / vouchersCreated) * 100)}%` : '0%'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {deals.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No deals created yet. Create your first deal to see analytics.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CreateDealModal 
        isOpen={showCreateDeal || !!editingDeal} 
        onClose={() => {
          setShowCreateDeal(false);
          setEditingDeal(null);
        }}
        existingDeal={editingDeal}
      />
    </>
  );
}