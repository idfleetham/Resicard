import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Calendar, Ticket, MapPin, Clock, Tag } from "lucide-react";
import { formatRelativeTime, getDealCategoryColor, formatCurrency } from "@/lib/utils";
import type { DealWithMerchant } from "@shared/schema";

interface DealCardProps {
  deal: DealWithMerchant;
  onRedeem?: (dealId: number) => void;
  showMerchantInfo?: boolean;
  isLoading?: boolean;
  loadingDealId?: number;
  hasExistingVoucher?: boolean;
}

export default function DealCard({ 
  deal, 
  onRedeem, 
  showMerchantInfo = true, 
  isLoading = false,
  loadingDealId,
  hasExistingVoucher = false
}: DealCardProps) {
  const usagePercentage = ((deal.usageCount || 0) / deal.usageLimit) * 100;
  const isExpired = new Date(deal.expiryDate) < new Date();
  const isFullyUsed = (deal.usageCount || 0) >= deal.usageLimit;
  const canRedeem = !isExpired && !isFullyUsed && deal.isActive;

  const getImageForDeal = (deal: DealWithMerchant): string => {
    const categoryImages: Record<string, string> = {
      restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=300&fit=crop",
      bar: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&h=300&fit=crop",
      cafe: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=300&fit=crop",
      pub: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=300&fit=crop",
      takeaway: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=300&fit=crop",
      "fine-dining": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=300&fit=crop",
      sports: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=300&fit=crop",
      transport: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=300&fit=crop",
      "food-drink": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=300&fit=crop",
    };
    
    return categoryImages[deal.category.toLowerCase()] || categoryImages.restaurant;
  };

  const getExpiryBadgeColor = () => {
    const now = new Date();
    const expiry = new Date(deal.expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) return "bg-red-100 text-red-700 border-red-200";
    if (daysUntilExpiry <= 3) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-green-100 text-green-700 border-green-200";
  };

  return (
    <div className="group overflow-hidden bg-white rounded-2xl shadow-lg border-0 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 transform">
      {/* 16:9 Aspect Ratio Image */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-indigo-400 to-violet-600">
        <img 
          src={getImageForDeal(deal)} 
          alt={deal.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=300&fit=crop";
          }}
        />
        {/* Category Badge on Image */}
        <div className="absolute top-4 left-4">
          <Badge className="bg-black/20 backdrop-blur-sm text-white border-0 text-xs font-bold shadow-lg px-3 py-1 rounded-full">
            <Tag className="w-3 h-3 mr-1" />
            {deal.category.charAt(0).toUpperCase() + deal.category.slice(1)}
          </Badge>
        </div>
        {/* Expiry Badge on Image */}
        <div className="absolute top-4 right-4">
          <Badge className="bg-black/20 backdrop-blur-sm text-white border-0 text-xs font-bold shadow-lg px-3 py-1 rounded-full">
            <Clock className="w-3 h-3 mr-1" />
            {(() => {
              const now = new Date();
              const expiry = new Date(deal.expiryDate);
              const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysUntilExpiry <= 0) return "Expired";
              if (daysUntilExpiry === 1) return "1 day";
              if (daysUntilExpiry <= 7) return `${daysUntilExpiry} days`;
              return formatRelativeTime(deal.expiryDate);
            })()}
          </Badge>
        </div>
        
        {/* Status Overlay */}
        {!canRedeem && !isExpired && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Badge variant="secondary" className="bg-white text-gray-700">
              Fully Redeemed
            </Badge>
          </div>
        )}
      </div>

      <div className="p-8 space-y-6">
        {/* Title Hierarchy */}
        <div className="space-y-2">
          <h3 className="font-bold text-xl text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
            {deal.title}
          </h3>
          
          {showMerchantInfo && (
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="font-medium text-sm">{deal.merchantName}</span>
            </div>
          )}
          
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
            {deal.description}
          </p>
        </div>

        {/* Discount Highlight */}
        <div className="inline-flex items-center px-4 py-3 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-2xl shadow-lg">
          <span className="text-2xl font-bold text-white drop-shadow-sm">
            {deal.discountType === 'percentage' 
              ? `${deal.discountValue}% OFF`
              : `${formatCurrency(Number(deal.discountValue))} OFF`
            }
          </span>
        </div>

        {/* Usage Progress with Gradient */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Availability</span>
            <span className="text-sm text-gray-500">
              {deal.usageLimit - (deal.usageCount || 0)} left
            </span>
          </div>
          
          <Progress 
            value={usagePercentage} 
            className="h-2 bg-gray-100"
          />
        </div>

        {/* Call to Action Button */}
        <Button
          onClick={() => onRedeem?.(deal.id)}
          disabled={!canRedeem || hasExistingVoucher || (isLoading && loadingDealId === deal.id)}
          className={`w-full rounded-2xl py-4 font-bold transition-all duration-300 transform hover:scale-105 ${
            hasExistingVoucher 
              ? "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200" 
              : "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white shadow-xl hover:shadow-2xl"
          }`}
        >
          {(isLoading && loadingDealId === deal.id) ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </>
          ) : hasExistingVoucher ? (
            <>
              <Ticket className="w-4 h-4 mr-2" />
              Already in Wallet
            </>
          ) : !canRedeem ? (
            isExpired ? "Deal Expired" : "Fully Redeemed"
          ) : (
            <>
              <Ticket className="w-4 h-4 mr-2" />
              Add to Wallet
            </>
          )}
        </Button>
      </div>
    </div>
  );
}