import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const qrRef = useRef<HTMLDivElement>(null);

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-fg">QR & Code Redemption</h2>
          <p className="text-soft">Redeem customer vouchers and generate QR codes for your offers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voucher Redemption */}
        <Card className="bg-card/90 border border-dim shadow-elev-1 hover:shadow-elev-2 hover:border-dimStrong transition">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-fg">
              <Hash className="w-5 h-5" />
              <span>Redeem Voucher</span>
            </CardTitle>
            <CardDescription className="text-soft">
              Enter voucher code or scan QR to process customer redemption
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-surface border-dim">
                <TabsTrigger value="manual" className="data-[state=active]:bg-surface2 data-[state=active]:text-brand1">Manual Entry</TabsTrigger>
                <TabsTrigger value="qr-scan" className="data-[state=active]:bg-surface2 data-[state=active]:text-brand1">QR Scan</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="space-y-4">
                <div>
                  <Label htmlFor="voucher-code">Voucher Code</Label>
                  <Input
                    id="voucher-code"
                    placeholder="Enter voucher code"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    className="input-dark"
                  />
                </div>
                
                <div>
                  <Label htmlFor="staff-pin">Staff PIN</Label>
                  <Input
                    id="staff-pin"
                    type="password"
                    placeholder="Enter your staff PIN"
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value)}
                    className="input-dark"
                  />
                </div>
                
                <div>
                  <Label htmlFor="basket-amount">Basket Amount (Optional)</Label>
                  <Input
                    id="basket-amount"
                    type="number"
                    step="0.01"
                    placeholder="£0.00"
                    value={basketAmount}
                    onChange={(e) => setBasketAmount(e.target.value)}
                    className="input-dark"
                  />
                  <p className="text-xs text-soft mt-1">
                    Enter basket total for percentage discounts
                  </p>
                </div>
                
                <Button 
                  onClick={handleRedeemVoucher}
                  disabled={redeemVoucherMutation.isPending}
                  className="w-full"
                >
                  {redeemVoucherMutation.isPending ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-pulse" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Redeem Voucher
                    </>
                  )}
                </Button>
              </TabsContent>
              
              <TabsContent value="qr-scan" className="space-y-4">
                <div className="text-center py-8 border-2 border-dashed border-dim rounded-lg bg-surface/50">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-soft" />
                  <p className="text-soft mb-4">Scan customer QR code</p>
                  <Button onClick={handleScanQR} disabled={isScanning}>
                    {isScanning ? (
                      <>
                        <Camera className="w-4 h-4 mr-2 animate-pulse" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Start QR Scanner
                      </>
                    )}
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="staff-pin-qr">Staff PIN</Label>
                  <Input
                    id="staff-pin-qr"
                    type="password"
                    placeholder="Enter your staff PIN"
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value)}
                    className="input-dark"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* QR Code Generation */}
        <Card className="bg-card/90 border border-dim shadow-elev-1 hover:shadow-elev-2 hover:border-dimStrong transition">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-fg">
              <QrCode className="w-5 h-5" />
              <span>Generate Offer QR</span>
            </CardTitle>
            <CardDescription className="text-soft">
              Create QR codes for your offers to display in-store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="offer-select">Select Offer</Label>
              <Input
                id="offer-select"
                placeholder="Enter offer ID or select from list"
                value={selectedOffer}
                onChange={(e) => setSelectedOffer(e.target.value)}
                className="input-dark"
              />
              <p className="text-xs text-gray-500 mt-1">
                Placeholder: In full implementation, this would be a dropdown of active offers
              </p>
            </div>
            
            <Button 
              onClick={generateOfferQR}
              disabled={generateOfferQRMutation.isPending || !selectedOffer}
              className="w-full"
            >
              {generateOfferQRMutation.isPending ? (
                <>
                  <QrCode className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>
            
            {qrCodeUrl && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm font-medium mb-2">Generated QR Code</p>
                <div className="inline-block p-4 bg-white border rounded-lg">
                  <img src={qrCodeUrl} alt="Offer QR Code" className="w-32 h-32" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Print this QR code and display it in your store
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Redemptions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Redemptions</CardTitle>
          <CardDescription>
            Latest voucher redemptions processed by your staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Placeholder for recent redemptions */}
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">No recent redemptions</p>
              <p className="text-xs text-gray-500">
                Processed redemptions will appear here in real-time
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Redemptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <Badge variant="secondary" className="mt-1">Live</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <Badge variant="default" className="mt-1">Online</Badge>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Codes Generated</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qrCodeUrl ? 1 : 0}</div>
            <Badge variant="outline" className="mt-1">This Session</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}