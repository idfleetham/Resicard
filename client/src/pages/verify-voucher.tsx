import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Clock, User, ArrowLeft, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequestWithAuth } from "@/lib/auth";

export default function VerifyVoucher() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [voucher, setVoucher] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse query parameters
  const params = new URLSearchParams(location.split('?')[1] || '');
  const voucherNumber = params.get('v');
  const dealId = params.get('d');
  const userId = params.get('u');

  useEffect(() => {
    if (!voucherNumber || !dealId || !userId) {
      setError("Invalid voucher QR code. Missing required information.");
      setIsLoading(false);
      return;
    }

    fetchVoucherDetails();
  }, [voucherNumber, dealId, userId]);

  const fetchVoucherDetails = async () => {
    try {
      const response = await fetch(`/api/vouchers/verify?v=${voucherNumber}&d=${dealId}&u=${userId}`);
      if (!response.ok) {
        throw new Error(`Failed to verify voucher: ${response.statusText}`);
      }
      const data = await response.json();
      setVoucher(data);
    } catch (err: any) {
      setError(err.message || "Failed to verify voucher");
      console.error('Voucher verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!voucher || !user || user.role !== 'merchant') return;

    setIsRedeeming(true);
    try {
      const response = await apiRequestWithAuth('POST', '/api/vouchers/redeem-qr', {
        voucherNumber: voucher.voucherNumber,
        dealId: voucher.dealId,
        userId: voucher.userId,
        merchantName: voucher.merchantName,
        dealTitle: voucher.dealTitle
      });

      toast({
        title: "Voucher Redeemed Successfully",
        description: `${voucher.dealTitle} - ${voucher.customerName}`,
      });

      // Refresh voucher details
      await fetchVoucherDetails();
    } catch (err: any) {
      toast({
        title: "Redemption Failed",
        description: err.message || "Failed to redeem voucher",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardBody className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Verifying voucher...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardBody className="p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Voucher Not Found</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(voucher.expiresAt) < new Date();
  const canRedeem = user && user.role === 'merchant' && !voucher.isUsed && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Voucher Verification</h1>
              <p className="text-white/80">Resicard Community Deal</p>
            </div>
            <Link href="/">
              <Button variant="ghost" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Voucher Status */}
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center justify-center mb-4">
                {voucher.isUsed ? (
                  <div className="text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-2" />
                    <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-2">
                      Already Used
                    </Badge>
                  </div>
                ) : isExpired ? (
                  <div className="text-center">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
                    <Badge className="bg-red-100 text-red-800 border-red-200 px-4 py-2">
                      Expired
                    </Badge>
                  </div>
                ) : (
                  <div className="text-center">
                    <Clock className="h-16 w-16 text-blue-500 mx-auto mb-2" />
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-4 py-2">
                      Ready to Use
                    </Badge>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Deal Details */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Details</CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{voucher.dealTitle}</h3>
                  <p className="text-gray-600">{voucher.merchantName}</p>
                </div>
                
                <div className="bg-primary/5 rounded-lg p-4">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {voucher.discountType === 'percentage' 
                      ? `${voucher.discountValue}% OFF`
                      : voucher.discountType === 'fixed'
                      ? `£${voucher.discountValue} OFF`
                      : voucher.discountValue
                    }
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Voucher Number</p>
                    <p className="font-mono font-bold">{voucher.voucherNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Valid Until</p>
                    <p className="font-medium">{new Date(voucher.expiresAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={voucher.customerPhoto} alt={voucher.customerName} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">{voucher.customerName}</p>
                  <p className="text-sm text-gray-500">Resicard Member</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Redemption Actions */}
          {canRedeem && (
            <Card>
              <CardBody className="p-6">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Ready to Redeem</h3>
                  <p className="text-gray-600">
                    Confirm that the customer is present and ready to use this voucher.
                  </p>
                  <Button 
                    onClick={handleRedeem}
                    disabled={isRedeeming}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isRedeeming ? "Redeeming..." : "Redeem Voucher"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Information for Non-Merchants */}
          {!user || user.role !== 'merchant' ? (
            <Card>
              <CardBody className="p-6">
                <div className="text-center space-y-4">
                  <Smartphone className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">For Merchants</h3>
                    <p className="text-gray-600">
                      To redeem this voucher, please log in with a merchant account.
                    </p>
                  </div>
                  {!user && (
                    <Link href="/login">
                      <Button variant="outline">Log In</Button>
                    </Link>
                  )}
                </div>
              </CardBody>
            </Card>
          ) : null}

          {voucher.isUsed && (
            <Card>
              <CardBody className="p-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-500">
                    This voucher was redeemed on {new Date(voucher.usedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}