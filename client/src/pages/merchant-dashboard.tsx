import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import CreateDealModal from "@/components/create-deal-modal";
import QRScanner from "@/components/qr-scanner";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
import { MetricTile } from "@/ui/MetricTile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  CheckCircle,
  Calendar,
  Receipt
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequestWithAuth } from "@/lib/auth";
import { formatCurrency, formatDate, formatRelativeTime, getDealCategoryColor, getStatusColor } from "@/lib/utils";
import type { Deal, Redemption } from "@shared/schema";
import { generateCustomerAlias } from "@shared/schema";

export default function MerchantDashboard() {
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedVoucher, setLastScannedVoucher] = useState<any>(null);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Fetch merchant's offers
  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['/api/offers/merchant', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequestWithAuth('GET', `/api/offers/merchant/${user.id}`);
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

  // Update offer mutation
  const updateDealMutation = useMutation({
    mutationFn: async ({ offerId, updates }: { offerId: number; updates: Partial<Deal> }) => {
      const response = await apiRequestWithAuth('PUT', `/api/offers/${offerId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Updated",
        description: "Deal has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/offers/merchant'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update offer",
        variant: "destructive",
      });
    },
  });

  // Delete offer mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (offerId: number) => {
      const response = await apiRequestWithAuth('DELETE', `/api/offers/${offerId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deal Deleted",
        description: "Deal has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/offers/merchant'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete offer",
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
        description: `${data.offerTitle} has been redeemed for ${generateCustomerAlias({ id: data.userId, username: data.customerUsername })}`,
      });
      setLastScannedVoucher(data);
      setIsScanning(false);
      queryClient.invalidateQueries({ queryKey: ['/api/redemptions/merchant'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers/merchant'] });
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

  const handleToggleDeal = (offerId: number, isActive: boolean | null) => {
    updateDealMutation.mutate({ offerId, updates: { isActive: !(isActive ?? false) } });
  };

  const handleQRScan = (qrData: string) => {
    try {
      const voucherData = JSON.parse(qrData);
      
      // Validate required fields
      if (!voucherData.voucherNumber || !voucherData.offerId || !voucherData.userId) {
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
        description: `Redeeming voucher for ${voucherData.offerTitle || 'offer'} from ${voucherData.merchantName || 'merchant'}`,
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

  const handleDeleteDeal = (offerId: number) => {
    if (confirm('Are you sure you want to delete this offer? This action cannot be undone.')) {
      deleteDealMutation.mutate(offerId);
    }
  };

  const handleEditDeal = (offer: Deal) => {
    setEditingDeal(offer);
  };

  const getDealStatus = (offer: Deal) => {
    const isExpired = new Date(offer.expiryDate) < new Date();
    const isFullyUsed = (offer.usageCount || 0) >= offer.usageLimit;
    
    if (isExpired) return 'expired';
    if (isFullyUsed) return 'fully-used';
    if (!offer.isActive) return 'paused';
    return 'active';
  };

  // Calculate stats
  const activeOffers = offers.filter(d => d.isActive && new Date(d.expiryDate) > new Date());
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
        <div data-theme="dim" className="min-h-screen bg-bg text-fg flex items-center justify-center">
          <div className="text-center">
            <p className="text-soft">Please log in to access your dashboard.</p>
          </div>
        </div>
      </>
    );
  }

  if (!user.isVerified) {
    return (
      <>
        <Navigation />
        <div data-theme="dim" className="min-h-screen bg-bg text-fg flex items-center justify-center">
          <Card className="max-w-md mx-4 bg-card border border-white/40 shadow-xl shadow-white/20">
            <CardBody className="p-8 text-center">
              <div className="bg-amber-500/20 p-4 rounded-full inline-block mb-4">
                <Users className="h-8 w-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-fg mb-2">Pending Verification</h2>
              <p className="text-soft mb-4">
                Your business application is currently under review by our admin team. 
                You'll receive an email notification once your account is verified.
              </p>
              <Badge className="bg-amber-500/20 text-amber-400">
                Verification Pending
              </Badge>
            </CardBody>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div data-theme="dim" className="min-h-screen bg-bg text-fg">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          {/* Merchant Header */}
          <Card className="mb-8 bg-card border border-white/40 shadow-xl shadow-white/20">
            <CardBody className="p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                    <h1 className="text-xl sm:text-2xl font-bold text-fg">{user.businessName}</h1>
                    <p className="text-sm text-soft">@{user.username}</p>
                    {user.businessAddress && (
                      <p className="text-sm text-soft flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {user.businessAddress}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <Select
                    defaultValue="dim"
                    onValueChange={(v) => {
                      console.log('Theme changing to:', v);
                      
                      // Apply theme attribute
                      document.documentElement.setAttribute('data-theme', v);
                      document.body.setAttribute('data-theme', v);
                      
                      // Force a complete style recalculation
                      const root = document.documentElement;
                      root.style.setProperty('--force-update', Math.random().toString());
                      
                      // Also trigger a class change to force re-render
                      root.classList.remove('theme-dim', 'theme-high');
                      root.classList.add(`theme-${v}`);
                      
                      // Log for debugging
                      console.log('Theme applied, data-theme:', root.getAttribute('data-theme'));
                    }}
                  >
                    <SelectTrigger className="w-[160px] border-dim bg-surface text-fg">
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface2 border-dim">
                      <SelectItem value="dim" className="text-fg">Dim</SelectItem>
                      <SelectItem value="high" className="text-fg">High Contrast</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Verified Business
                  </Badge>
                  
                  <Button 
                    variant="outline" 
                    className="border-dim hover:bg-surface text-black"
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <MetricTile 
              label="Active Deals" 
              value={activeOffers.length} 
              icon={<Ticket className="h-4 w-4" />}
            />

            <MetricTile 
              label="Total Redemptions" 
              value={totalRedemptions} 
              icon={<Users className="h-4 w-4" />}
            />

            <MetricTile 
              label="This Week" 
              value={thisWeekRedemptions.length} 
              icon={<ChartLine className="h-4 w-4" />}
            />

            <MetricTile 
              label="Commission Rate" 
              value="5%" 
              icon={<Percent className="h-4 w-4" />}
            />
          </div>

          {/* Main Dashboard Tabs */}
          <Tabs defaultValue="offers" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="offers">Manage Offers</TabsTrigger>
              <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="offers" className="space-y-6">
              <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Your Offers</CardTitle>
                    <Button 
                      onClick={() => setShowCreateDeal(true)}
                      className="coastal-gradient"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Deal
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="p-6">
                  {offersLoading ? (
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
                  ) : offers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-muted rounded-full p-6 mx-auto w-20 h-20 flex items-center justify-center mb-4">
                        <Ticket className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No offers yet</h3>
                      <p className="text-muted-foreground mb-4">Create your first offer to start attracting customers</p>
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
                      {offers.map((offer) => {
                        const status = getDealStatus(offer);
                        const usagePercentage = ((offer.usageCount || 0) / offer.usageLimit) * 100;
                        
                        return (
                          <div key={offer.id} className="border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-foreground">{offer.title}</h3>
                                  <Badge className={getDealCategoryColor(offer.category)}>
                                    {offer.category}
                                  </Badge>
                                  <Badge className={getStatusColor(status)}>
                                    {status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{offer.description}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>Expires: {formatRelativeTime(offer.expiryDate)}</span>
                                  <span>{offer.usageCount || 0}/{offer.usageLimit} used</span>
                                  {offer.originalValue && Number(offer.originalValue) > 0 && (
                                    <span>Value: {formatCurrency(Number(offer.originalValue))}</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditDeal(offer)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleDeal(offer.id, offer.isActive)}
                                >
                                  {offer.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteDeal(offer.id)}
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
                </CardBody>
              </Card>
            </TabsContent>

            <TabsContent value="scanner" className="space-y-6">
              {/* QR Scanner Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricTile 
                  label="Today's Redemptions" 
                  value={redemptions.filter(r => {
                    if (!r.redeemedAt) return false;
                    const redemptionDate = new Date(r.redeemedAt);
                    const today = new Date();
                    return redemptionDate.toDateString() === today.toDateString();
                  }).length} 
                  icon={<Calendar className="h-4 w-4" />}
                />

                <MetricTile 
                  label="Active Staff" 
                  value="1" 
                  icon={<Users className="h-4 w-4" />}
                />

                <MetricTile 
                  label="QR Codes Generated" 
                  value="0" 
                  icon={<QrCode className="h-4 w-4" />}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <QRScanner 
                  onScan={handleQRScan}
                  isScanning={isScanning}
                  onToggleScanning={() => setIsScanning(!isScanning)}
                />
                
                <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
                  <CardHeader>
                    <CardTitle className="text-fg">Recent Redemptions</CardTitle>
                    <p className="text-soft text-sm">Latest voucher redemptions processed by your staff</p>
                  </CardHeader>
                  <CardBody>
                    {redemptions.length > 0 ? (
                      <div className="space-y-3">
                        {redemptions.slice(0, 5).map((redemption: any) => (
                          <div key={redemption.id} className="flex justify-between items-center p-3 bg-surface rounded-lg border border-white/20">
                            <div>
                              <p className="font-medium text-fg">{redemption.dealTitle || redemption.offerTitle}</p>
                              <p className="text-sm text-soft">{redemption.customerName || 'Guest'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-fg">£{redemption.calculatedDiscount || redemption.value || '0.00'}</p>
                              <p className="text-xs text-soft">
                                {redemption.redeemedAt ? new Date(redemption.redeemedAt).toLocaleTimeString() : 'Now'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-muted/20 rounded-full p-4 mx-auto w-16 h-16 flex items-center justify-center mb-3">
                          <Receipt className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-fg font-medium">No recent redemptions</p>
                        <p className="text-soft text-sm">Processed redemptions will appear here in real-time</p>
                      </div>
                    )}
                  </CardBody>
                </Card>
                
                {lastScannedVoucher && (
                  <Card className="lg:col-span-2 bg-card border border-white/40 shadow-xl shadow-white/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Last Redemption
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-2">
                        <p><strong>Customer:</strong> {generateCustomerAlias({ id: lastScannedVoucher.userId, username: lastScannedVoucher.customerUsername })}</p>
                        <p><strong>Deal:</strong> {lastScannedVoucher.offerTitle}</p>
                        <p><strong>Voucher:</strong> {lastScannedVoucher.voucherNumber}</p>
                        <p><strong>Time:</strong> {new Date(lastScannedVoucher.redeemedAt).toLocaleString()}</p>
                      </div>
                    </CardBody>
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
                <CardBody>
                  {(() => {
                    // Calculate total revenue across all offers
                    let totalMerchantRevenue = 0;
                    
                    offers.forEach(offer => {
                      const offerRedemptions = redemptions.filter(r => r.offerId === offer.id);
                      const vouchersRedeemed = offerRedemptions.length;
                      
                      let offerValue = 0;
                      const discountVal = parseFloat((offer.discountValue as string) || '0');
                      const originalVal = parseFloat((offer.originalValue as string) || '0');
                      
                      if (offer.discountType === 'percentage' && originalVal > 0) {
                        // For percentage offers, use the discount amount (what customer saves)
                        offerValue = originalVal * (discountVal / 100);
                      } else if (offer.discountType === 'fixed') {
                        // For fixed offers, use the discount value (what customer saves)
                        offerValue = discountVal;
                      } else {
                        // Default fallback
                        offerValue = discountVal || originalVal;
                      }
                      
                      totalMerchantRevenue += vouchersRedeemed * offerValue;
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
                </CardBody>
              </Card>

              {/* Deal-by-Deal Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Deal Performance Analytics</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    {offers.map((offer) => {
                      const offerRedemptions = redemptions.filter(r => r.offerId === offer.id);
                      const vouchersCreated = offer.usageCount || 0;
                      const vouchersRedeemed = offerRedemptions.length;
                      
                      // Calculate actual revenue based on offer value
                      let offerValue = 0;
                      const discountVal = parseFloat((offer.discountValue as string) || '0');
                      const originalVal = parseFloat((offer.originalValue as string) || '0');
                      
                      if (offer.discountType === 'percentage' && originalVal > 0) {
                        // For percentage offers, use the discount amount (what customer saves)
                        offerValue = originalVal * (discountVal / 100);
                      } else if (offer.discountType === 'fixed') {
                        // For fixed offers, use the discount value (what customer saves)
                        offerValue = discountVal;
                      } else {
                        // Default fallback
                        offerValue = discountVal || originalVal;
                      }
                      
                      const totalRevenue = vouchersRedeemed * offerValue;
                      
                      return (
                        <div key={offer.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-lg">{offer.title}</h4>
                              <p className="text-sm text-muted-foreground">{offer.category}</p>
                              <p className="text-xs text-muted-foreground">
                                Value: {offer.discountType === 'percentage' 
                                  ? `${offer.discountValue}% off £${offer.originalValue || 0}`
                                  : `£${offer.discountValue} ${offer.originalValue ? `(was £${offer.originalValue})` : ''}`
                                }
                              </p>
                            </div>
                            <Badge variant={offer.isActive ? "default" : "secondary"}>
                              {offer.isActive ? "Active" : "Inactive"}
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
                    
                    {offers.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No offers created yet. Create your first offer to see analytics.</p>
                      </div>
                    )}
                  </div>
                </CardBody>
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