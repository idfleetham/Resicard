import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Users, FileText, Clock, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DealWithMerchant } from "@shared/schema";

interface DealDetailsModalProps {
  deal: DealWithMerchant | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DealDetailsModal({ deal, isOpen, onClose }: DealDetailsModalProps) {
  if (!deal) return null;

  const isExpired = new Date(deal.expiryDate) < new Date();
  const isFullyUsed = (deal.usageCount || 0) >= deal.usageLimit;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
            <Tag className="w-6 h-6 mr-2 text-indigo-600" />
            {deal.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Deal Image */}
          {deal.imageUrl && (
            <div className="relative aspect-video overflow-hidden rounded-xl">
              <img 
                src={deal.imageUrl} 
                alt={deal.title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span className="font-medium">{deal.merchantName}</span>
              </div>
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                {deal.category.charAt(0).toUpperCase() + deal.category.slice(1)}
              </Badge>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-xl p-4 border border-emerald-200">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-700 mb-1">
                  {deal.discountType === 'percentage' 
                    ? `${deal.discountValue}% OFF`
                    : deal.discountType === 'fixed'
                    ? `${formatCurrency(Number(deal.discountValue))} OFF`
                    : deal.discountValue
                  }
                </div>
                <div className="text-sm text-emerald-600">
                  {deal.originalValue && `Original value: ${formatCurrency(Number(deal.originalValue))}`}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {deal.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">{deal.description}</p>
            </div>
          )}

          <Separator />

          {/* Deal Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-gray-600">
                  Expires: {new Date(deal.expiryDate).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center text-sm">
                <Users className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-gray-600">
                  Availability: {deal.usageLimit - (deal.usageCount || 0)} left
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-gray-600">
                  Status: {isExpired ? 'Expired' : isFullyUsed ? 'Fully Redeemed' : 'Available'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Terms & Conditions */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Terms & Conditions
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {deal.terms ? (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {deal.terms}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  No specific terms and conditions provided for this offer. Standard merchant terms apply.
                </p>
              )}
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 mb-2">Important Notes:</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Present your digital voucher at the time of purchase</li>
              <li>• One voucher per transaction unless otherwise stated</li>
              <li>• Cannot be combined with other offers unless specified</li>
              <li>• Valid until the expiry date shown above</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}