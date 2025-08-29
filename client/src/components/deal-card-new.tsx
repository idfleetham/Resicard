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

  const getCategoryGradient = (category: string): string => {
    const gradients: Record<string, string> = {
      restaurant: "from-orange-400 via-red-500 to-pink-500",
      bar: "from-purple-400 via-pink-500 to-red-500", 
      cafe: "from-amber-400 via-orange-500 to-red-500",
      pub: "from-green-400 via-blue-500 to-purple-500",
      takeaway: "from-yellow-400 via-orange-500 to-red-500",
      "fine-dining": "from-indigo-400 via-purple-500 to-pink-500",
      sports: "from-blue-400 via-cyan-500 to-teal-500",
      transport: "from-gray-400 via-blue-500 to-indigo-500",
      "food-drink": "from-emerald-400 via-teal-500 to-cyan-500",
    };
    
    return gradients[category.toLowerCase()] || gradients.restaurant;
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
    <div className="group overflow-hidden bg-white rounded-3xl shadow-xl border-0 hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 transform ring-1 ring-gray-100">
      {/* 16:9 Aspect Ratio Image or Gradient Background */}
      <div className="relative aspect-video overflow-hidden">
        {deal.imageUrl ? (
          <img 
            src={deal.imageUrl} 
            alt={deal.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(deal.category)}`}>
            {/* Animated Background Patterns */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent animate-pulse"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.15),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.1),transparent_50%)]"></div>
            
            {/* Geometric Patterns */}
            <div className="absolute inset-0">
              <div className="absolute top-4 right-4 w-16 h-16 border-2 border-white/20 rounded-full"></div>
              <div className="absolute bottom-4 left-4 w-12 h-12 border-2 border-white/20 rounded-lg rotate-45"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-white/10 rounded-full"></div>
            </div>
            
            {/* Category Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Tag className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
            </div>
          </div>
        )}
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