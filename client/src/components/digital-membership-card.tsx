import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { QrCode, User, MapPin, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { VoucherWithDeal } from "@shared/schema";

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

  return (
    <div className="space-y-4">
      {/* Membership Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Resicard</h2>
              <p className="text-sm opacity-90">St Andrews Community</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">Member ID</p>
              <p className="text-lg font-mono">#{user.id.toString().padStart(6, '0')}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20 border-3 border-white/30">
              <AvatarImage src={user.profilePhoto || ""} alt={user.username} />
              <AvatarFallback className="text-xl bg-white/20 text-white border-0">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{user.username}</h3>
              <div className="flex items-center text-sm opacity-90 mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                <span>Local Resident</span>
              </div>
              <div className="flex items-center text-sm opacity-90 mt-1">
                <Calendar className="h-3 w-3 mr-1" />
                <span>Member since {new Date(user.createdAt).getFullYear()}</span>
              </div>
              <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-white/30 hover:bg-white/30">
                Verified ✓
              </Badge>
            </div>

            <div className="text-center">
              <div className="bg-white/20 p-3 rounded-lg">
                <QrCode className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-xs mt-1 opacity-75">Scan to verify</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex justify-between text-sm">
              <span className="opacity-75">Status:</span>
              <span className="font-medium">Active Member</span>
            </div>
            {user.membershipExpiry && (
              <div className="flex justify-between text-sm mt-1">
                <span className="opacity-75">Valid until:</span>
                <span className="font-medium">
                  {new Date(user.membershipExpiry).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voucher Details for Redemption */}
      {showVoucherDetails && voucher && (
        <Card className="border-2 border-dashed border-primary">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-primary mb-2">Voucher for Redemption</h3>
              <div className="bg-primary/5 rounded-lg p-4 mb-4">
                <h4 className="text-lg font-semibold">{voucher.dealTitle}</h4>
                <p className="text-sm text-muted-foreground">{voucher.merchantName}</p>
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
              
              <div className="bg-gray-100 rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground mb-1">Voucher Number</p>
                <p className="text-2xl font-mono font-bold tracking-wider">
                  {voucher.voucherNumber}
                </p>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>To Redeem:</strong> Show this card and voucher to the merchant</p>
                <p><strong>Valid Until:</strong> {new Date(voucher.expiresAt).toLocaleDateString()}</p>
                <p><strong>Status:</strong> {voucher.isUsed ? 'Used' : 'Ready to Use'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}