import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Calendar, Ticket } from "lucide-react";
import { formatRelativeTime, getDealCategoryColor, formatCurrency } from "@/lib/utils";
import type { DealWithMerchant } from "@shared/schema";
import dunveganImage from "@assets/Dunny_1749765361824.jpg";
import maishaImage from "@assets/Image 12-06-2025 at 22.55_1749765379381.jpeg";
import tailendImage from "@assets/Image 12-06-2025 at 22.54_1749765379387.jpeg";
import standrewsLinksImage from "@assets/Image 12-06-2025 at 22.53_1749765379387.jpeg";

interface DealCardProps {
  deal: DealWithMerchant;
  onRedeem?: (dealId: number) => void;
  showMerchantInfo?: boolean;
  isLoading?: boolean;
}

export default function DealCard({ 
  deal, 
  onRedeem, 
  showMerchantInfo = true, 
  isLoading = false 
}: DealCardProps) {
  const usagePercentage = ((deal.usageCount || 0) / deal.usageLimit) * 100;
  const isExpired = new Date(deal.expiryDate) < new Date();
  const isFullyUsed = (deal.usageCount || 0) >= deal.usageLimit;
  const canRedeem = !isExpired && !isFullyUsed && deal.isActive;

  const getImageForDeal = (deal: DealWithMerchant) => {
    // Map specific businesses to their uploaded images
    const businessImages: Record<string, string> = {
      "The Dunvegan": dunveganImage,
      "Maisha": maishaImage,
      "Tailend": tailendImage,
      "St Andrews Links": standrewsLinksImage,
    };
    
    // Use business-specific image if available
    if (businessImages[deal.merchantName]) {
      return businessImages[deal.merchantName];
    }
    
    // Fallback to category images
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

  return (
    <Card className="deal-card overflow-hidden">
      <img 
        src={getImageForDeal(deal)} 
        alt={`${deal.merchantName} ${deal.category}`} 
        className="w-full h-48 object-cover"
      />
      
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Badge className={getDealCategoryColor(deal.category)}>
            {deal.category}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatRelativeTime(deal.expiryDate)}
          </span>
        </div>
        
        {showMerchantInfo && (
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {deal.merchantName}
          </h3>
        )}
        
        <p className="text-primary font-bold text-xl mb-2">
          {deal.title}
        </p>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {deal.description}
        </p>
        
        {deal.originalValue && (
          <div className="mb-4">
            <span className="text-sm text-muted-foreground">Value: </span>
            <span className="font-semibold">{formatCurrency(Number(deal.originalValue))}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground flex items-center">
            <Users className="h-4 w-4 mr-1" />
            {deal.usageCount}/{deal.usageLimit} used
          </div>
          
          {canRedeem && onRedeem && (
            <Button 
              size="sm" 
              onClick={() => onRedeem(deal.id)}
              disabled={isLoading}
              className="coastal-gradient hover:opacity-90"
            >
              <Ticket className="h-4 w-4 mr-2" />
              {isLoading ? 'Redeeming...' : 'Use Deal'}
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Usage Progress</span>
            <span className="text-sm font-medium text-foreground">
              {Math.round(usagePercentage)}%
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="h-2" 
          />
        </div>
        
        {!canRedeem && (
          <div className="mt-3 text-center">
            {isExpired && (
              <Badge variant="destructive">Expired</Badge>
            )}
            {isFullyUsed && !isExpired && (
              <Badge variant="secondary">Fully Redeemed</Badge>
            )}
            {!deal.isActive && !isExpired && !isFullyUsed && (
              <Badge variant="secondary">Paused</Badge>
            )}
          </div>
        )}
        
        {showMerchantInfo && deal.merchantAddress && (
          <div className="mt-3 text-xs text-muted-foreground">
            📍 {deal.merchantAddress}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
