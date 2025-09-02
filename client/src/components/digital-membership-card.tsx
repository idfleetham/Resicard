import { Card, CardBody } from "@/ui/Card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, User, MapPin, Calendar, Copy, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { VoucherWithDeal } from "@shared/schema";
import cardBackgroundImage from "@assets/DF611683-0C55-429D-9633-95A8FD10F9CE_1_105_c_1749807319428.jpeg";
import QRCodeGenerator from "./qr-code-generator";

interface DigitalMembershipCardProps {
  voucher?: VoucherWithDeal;
  showVoucherDetails?: boolean;
}

export default function DigitalMembershipCard({ 
  voucher, 
  showVoucherDetails = false 
}: DigitalMembershipCardProps) {
  const { user } = useAuth();

  if (!user) return null;

  // Copy to clipboard component
  const CopyToClipboardButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
    
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast({
          title: "Copied!",
          description: "Voucher code copied to clipboard",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast({
          title: "Copy failed",
          description: "Please manually copy the voucher code",
          variant: "destructive",
        });
      }
    };
    
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={handleCopy}
        className="h-6 w-6 p-0 hover:bg-gray-200 rounded-md"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3 text-gray-500" />
        )}
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Membership Card */}
      <Card className="overflow-hidden border-0 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("${cardBackgroundImage}")`,
          }}
        />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
        <CardBody className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-black">Resicard</h2>
              <p className="text-sm text-black/80">St Andrews Community</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-black/70">Member ID</p>
              <p className="text-lg font-mono text-black font-semibold">#{user.id.toString().padStart(6, '0')}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20 border-3 border-black/20 shadow-lg">
              <AvatarImage src={user.profilePhoto || ""} alt={user.username} />
              <AvatarFallback className="text-xl bg-red-100 text-red-800 border-2 border-red-300">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-black">{user.username}</h3>
              <div className="flex items-center text-sm text-black/80 mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                <span>Local Resident</span>
              </div>
              <div className="flex items-center text-sm text-black/80 mt-1">
                <Calendar className="h-3 w-3 mr-1" />
                <span>Member since {new Date(user.createdAt).getFullYear()}</span>
              </div>
              {user.isResidencyVerified ? (
                <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
                  Residency Verified ✓
                </Badge>
              ) : (
                <Badge variant="secondary" className="mt-2 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200">
                  Verification Required
                </Badge>
              )}
            </div>

            <div className="text-center">
              <div className="bg-white/80 p-3 rounded-lg shadow-lg border border-black/10">
                <QrCode className="h-12 w-12 mx-auto text-black" />
              </div>
              <p className="text-xs mt-1 text-black/70">Scan to verify</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-black/20">
            <div className="flex justify-between text-sm">
              <span className="text-black/70">Status:</span>
              <span className="font-medium text-black">Active Member</span>
            </div>
            {user.membershipExpiry && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-black/70">Valid until:</span>
                <span className="font-medium text-black">
                  {new Date(user.membershipExpiry).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Voucher Details for Redemption */}
      {showVoucherDetails && voucher && (
        <Card className="border-2 border-dashed border-primary">
          <CardBody className="p-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-primary mb-2">Voucher for Redemption</h3>
              <div className="bg-primary/5 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-semibold text-gray-900">{voucher.dealTitle}</h4>
                <p className="text-sm text-gray-700">{voucher.merchantName}</p>
                <div className="mt-2">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {voucher.discountType === 'percentage' 
                      ? `${voucher.discountValue}% OFF`
                      : voucher.discountType === 'fixed'
                      ? `£${voucher.discountValue} OFF`
                      : voucher.discountValue
                    }
                  </Badge>
                </div>
              </div>
              
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Voucher Number</p>
                  <CopyToClipboardButton text={voucher.voucherNumber} />
                </div>
                <p className="text-sm font-mono font-bold tracking-wide break-all leading-relaxed text-gray-900">
                  {voucher.voucherNumber}
                </p>
              </div>

              {/* QR Code for Scanning */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-lg shadow-lg border">
                  <QRCodeGenerator 
                    value={`${window.location.origin}/verify-voucher?v=${voucher.voucherNumber}&d=${voucher.dealId}&u=${user.id}`}
                    size={160}
                  />
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Scan this QR code to redeem
                  </p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>To Redeem:</strong> Show this card and voucher to the merchant</p>
                <p><strong>Valid Until:</strong> {new Date(voucher.expiresAt).toLocaleDateString()}</p>
                <p><strong>Status:</strong> {voucher.isUsed ? 'Used' : 'Ready to Use'}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}