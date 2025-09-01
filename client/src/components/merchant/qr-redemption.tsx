import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
import { MetricTile } from "@/ui/MetricTile";
import { EmptyState } from "@/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Camera, Hash, CheckCircle, XCircle, Zap, CreditCard } from "lucide-react";
import QRCode from "qrcode";

export default function QRRedemption() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [voucherCode, setVoucherCode] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [basketAmount, setBasketAmount] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [selectedOffer, setSelectedOffer] = useState("");
  const [activeTab, setActiveTab] = useState<'manual' | 'qr-scan'>('manual');
  const qrRef = useRef<HTMLDivElement>(null);

  // Fetch merchant's redemptions for stats
  const { data: redemptionsResponse } = useQuery<any>({
    queryKey: ["/api/redemptions/merchant", user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/redemptions/merchant/${user?.id}`);
      const data = await response.json();
      return data;
    },
    enabled: !!user?.id,
  });

  // Handle the response structure - it could be an array or an object with rows
  const redemptions = Array.isArray(redemptionsResponse) 
    ? redemptionsResponse 
    : redemptionsResponse?.rows || [];

  // Calculate today's redemptions
  const todaysRedemptions = redemptions.filter((redemption: any) => {
    if (!redemption.redeemedAt) return false;
    const today = new Date();
    const redemptionDate = new Date(redemption.redeemedAt);
    return redemptionDate.toDateString() === today.toDateString();
  });

  const redeemVoucherMutation = useMutation({
    mutationFn: (data: { voucherCode: string; staffPin: string; basketAmount?: string }) =>
      apiRequest("POST", "/api/redemptions/redeem", {
        voucherCode: data.voucherCode,
        staffPin: data.staffPin,
        basketAmount: data.basketAmount ? parseFloat(data.basketAmount) : undefined,
        merchantId: user!.id,
      }),
    onSuccess: (data: any) => {
      toast({ 
        title: "Voucher Redeemed Successfully",
        description: `Discount of £${data.discount || "0.00"} applied`,
      });
      setVoucherCode("");
      setStaffPin("");
      setBasketAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/redemptions/merchant"] });
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Unable to redeem voucher",
        variant: "destructive",
      });
    },
  });

  const generateOfferQRMutation = useMutation({
    mutationFn: (offerId: string) =>
      apiRequest("POST", "/api/offers/generate-qr", { offerId }),
    onSuccess: async (data: any) => {
      const qrDataUrl = await QRCode.toDataURL(data.qrCode || "placeholder-qr-data");
      setQrCodeUrl(qrDataUrl);
      toast({ title: "QR Code generated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error generating QR code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRedeemVoucher = () => {
    if (!voucherCode.trim()) {
      toast({
        title: "Voucher code required",
        description: "Please enter a voucher code",
        variant: "destructive",
      });
      return;
    }

    if (!staffPin.trim()) {
      toast({
        title: "Staff PIN required",
        description: "Please enter your staff PIN",
        variant: "destructive",
      });
      return;
    }

    redeemVoucherMutation.mutate({
      voucherCode,
      staffPin,
      basketAmount,
    });
  };

  const handleScanQR = async () => {
    setIsScanning(true);
    // Placeholder for QR scanning functionality
    // In a real implementation, this would open camera and scan QR codes
    toast({
      title: "QR Scanner",
      description: "QR scanner functionality would be implemented here using camera API",
    });
    setIsScanning(false);
  };

  const generateOfferQR = () => {
    if (!selectedOffer) {
      toast({
        title: "Select an offer",
        description: "Please select an offer to generate QR code",
        variant: "destructive",
      });
      return;
    }

    generateOfferQRMutation.mutate(selectedOffer);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-brand1/25 via-brand2/20 to-transparent border border-white/40 shadow-xl shadow-white/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg">QR & Code Redemption</h1>
            <p className="text-slate-300 text-lg">Redeem customer vouchers and generate QR codes for your offers</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Voucher Redemption Card */}
        <div className="bg-card border border-white/40 shadow-xl shadow-white/20 rounded-2xl transition p-5">
          <h2 className="text-2xl font-semibold mb-1 text-fg">Redeem Voucher</h2>
          <p className="text-slate-300 text-lg mb-4">Enter voucher code or scan QR to process customer redemption</p>

          {/* Custom Tab Buttons */}
          <div className="mb-4 inline-flex rounded-xl border border-white/40 shadow-xl shadow-white/20 bg-surface overflow-hidden">
            <button
              className={`px-4 py-2 text-base transition-colors ${
                activeTab === 'manual'
                  ? 'bg-surface2 text-fg'
                  : 'text-slate-300 hover:bg-white/[0.03]'
              }`}
              onClick={() => setActiveTab('manual')}
            >
              Manual Entry
            </button>
            <button
              className={`px-4 py-2 text-base transition-colors ${
                activeTab === 'qr-scan'
                  ? 'bg-surface2 text-fg'
                  : 'text-slate-300 hover:bg-white/[0.03]'
              }`}
              onClick={() => setActiveTab('qr-scan')}
            >
              QR Scan
            </button>
          </div>
          
          {activeTab === 'manual' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="voucher-code" className="block text-base font-medium tracking-wide text-fg mb-1">Voucher Code</Label>
                <Input
                  id="voucher-code"
                  name="voucherCode"
                  placeholder="Enter voucher code"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  className="input-dark"
                />
              </div>

              <div>
                <Label htmlFor="staff-pin" className="block text-base font-medium tracking-wide text-fg mb-1">Staff PIN</Label>
                <Input
                  id="staff-pin"
                  name="staffPin"
                  type="password"
                  placeholder="Enter your staff PIN"
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value)}
                  className="input-dark"
                />
              </div>

              <div>
                <Label htmlFor="basket-amount" className="block text-base font-medium tracking-wide text-fg mb-1">
                  Basket Amount <span className="text-slate-300">(Optional)</span>
                </Label>
                <Input
                  id="basket-amount"
                  name="basketAmount"
                  type="number"
                  step="0.01"
                  placeholder="£0.00"
                  value={basketAmount}
                  onChange={(e) => setBasketAmount(e.target.value)}
                  className="input-dark"
                />
                <p className="text-xs text-slate-300/80 mt-1">Enter basket total for percentage discounts</p>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleRedeemVoucher}
                  disabled={redeemVoucherMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-brand1 to-brand2 text-white px-4 py-2 shadow-elev-1 hover:shadow-elev-2 transition-all disabled:opacity-50"
                >
                  {redeemVoucherMutation.isPending ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-pulse inline" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 inline" />
                      Redeem Voucher
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-surface border border-white/40 shadow-xl shadow-white/20 p-4">
              <div className="text-center py-8">
                <Camera className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-300 mb-4">Camera preview and scanner go here</p>
                <button 
                  onClick={handleScanQR}
                  disabled={isScanning}
                  className="rounded-xl bg-gradient-to-r from-brand1 to-brand2 text-white px-4 py-2 shadow-elev-1 hover:shadow-elev-2 transition-all disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <Camera className="w-4 h-4 mr-2 animate-pulse inline" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2 inline" />
                      Start QR Scanner
                    </>
                  )}
                </button>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/40 shadow-xl shadow-white/20">
                <label className="block text-base font-medium tracking-wide text-fg mb-1">Staff PIN</label>
                <Input
                  type="password"
                  placeholder="Enter your staff PIN"
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value)}
                  className="input-dark"
                />
              </div>
            </div>
          )}
        </div>

        {/* QR Code Generation Card */}
        <div className="bg-card border border-white/40 shadow-xl shadow-white/20 rounded-2xl transition p-5">
          <div className="border-b border-white/40 shadow-xl shadow-white/20 pb-4 mb-4">
            <h2 className="text-lg font-semibold text-fg flex items-center space-x-2">
              <QrCode className="w-5 h-5" />
              <span>Generate Offer QR</span>
            </h2>
            <p className="text-slate-300 text-lg mt-1">Create QR codes for your offers to display in-store</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-base font-medium tracking-wide text-fg mb-1">Select Offer</label>
              <Input
                placeholder="Enter offer ID or select from list"
                value={selectedOffer}
                onChange={(e) => setSelectedOffer(e.target.value)}
                className="input-dark"
              />
              <p className="text-xs text-slate-300/80 mt-1">
                Placeholder: In full implementation, this would be a dropdown of active offers
              </p>
            </div>
            
            <div className="pt-2">
              <button 
                onClick={generateOfferQR}
                disabled={generateOfferQRMutation.isPending || !selectedOffer}
                className="rounded-xl bg-gradient-to-r from-brand1 to-brand2 text-white px-4 py-2 shadow-elev-1 hover:shadow-elev-2 transition-all disabled:opacity-50 w-full"
              >
                {generateOfferQRMutation.isPending ? (
                  <>
                    <QrCode className="w-4 h-4 mr-2 animate-spin inline" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2 inline" />
                    Generate QR Code
                  </>
                )}
              </button>
            </div>
            
            {qrCodeUrl && (
              <div className="text-center pt-4 border-t border-white/40 shadow-xl shadow-white/20">
                <p className="text-base font-medium mb-2 text-fg">Generated QR Code</p>
                <div className="inline-block p-4 bg-surface border border-white/40 shadow-xl shadow-white/20 rounded-lg">
                  <img src={qrCodeUrl} alt="Offer QR Code" className="w-32 h-32" />
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  Print this QR code and display it in your store
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Redemptions */}
      <Card variant="elevated" className="bg-card border border-white/40 shadow-xl shadow-white/20">
        <CardHeader>
          <CardTitle>Recent Redemptions</CardTitle>
          <CardDescription>
            Latest voucher redemptions processed by your staff
          </CardDescription>
        </CardHeader>
        <CardBody>
          {redemptions.length === 0 ? (
            <EmptyState 
              title="No recent redemptions"
              subtitle="Processed redemptions will appear here in real-time"
              icon={<CreditCard className="h-6 w-6" />}
            />
          ) : (
            <div className="space-y-3">
              {redemptions.slice(0, 5).map((redemption: any) => (
                <div key={redemption.id} className="bg-surface/50 rounded-lg p-3 border border-white/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-fg">{redemption.dealTitle || redemption.offerTitle}</p>
                      <p className="text-sm text-slate-300">
                        {redemption.customerName} • £{redemption.calculatedDiscount || redemption.value}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {new Date(redemption.redeemedAt).toLocaleDateString()}
                      </p>
                      <Badge className="bg-green-500/20 text-green-400 text-xs">
                        Redeemed
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricTile 
          label="Today's Redemptions" 
          value={todaysRedemptions.length.toString()} 
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <MetricTile 
          label="Active Staff" 
          value="1" 
          icon={<Hash className="h-4 w-4" />}
        />
        <MetricTile 
          label="QR Codes Generated" 
          value={qrCodeUrl ? "1" : "0"} 
          icon={<QrCode className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}