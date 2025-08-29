import { useRoute } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOffer } from "@/hooks/use-merchant-offers";
import { ArrowLeft, Calendar, DollarSign, Users, Eye } from "lucide-react";
import { format } from "date-fns";

export default function OfferDetails() {
  const [, params] = useRoute("/merchant/offers/:id");
  const offerId = params?.id;

  const { data: offer, isLoading, error } = useOffer(offerId || "");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Failed to load offer details</p>
        <Button onClick={() => window.location.href = '/merchant'}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Merchant Portal
        </Button>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!offer.isActive) return <Badge className="rounded-full px-3 py-1 text-xs font-medium bg-red-500/20 text-red-400 border-red-500/30">Paused</Badge>;
    if (offer.expiryDate && new Date(offer.expiryDate) < new Date()) return <Badge className="rounded-full px-3 py-1 text-xs font-medium bg-orange-500/20 text-orange-400 border-orange-500/30">Expired</Badge>;
    return <Badge className="rounded-full px-3 py-1 text-xs font-medium bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
  };

  const getDiscountText = () => {
    switch (offer.discountType) {
      case "percentage":
        return `${offer.discountValue}% off`;
      case "fixed":
        return `£${offer.discountValue} off`;
      case "bogo":
        return "Buy One Get One";
      case "free_item":
        return "Free Item";
      default:
        return `${offer.discountValue}% off`;
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => window.location.href = '/merchant'} className="bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Title Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white font-bold text-3xl mb-2">{offer.title}</h1>
              <p className="text-slate-300 text-lg">Offer Details and Analytics</p>
            </div>
            <div>
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </div>

      {/* Offer Details Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200/60 p-6">
          <h2 className="text-slate-900 font-semibold text-xl mb-1">Offer Information</h2>
          <p className="text-slate-600">Complete details about this offer</p>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-gray-200/20 dark:divide-white/10">
            <div className="space-y-6">
              <h3 className="font-semibold text-lg text-slate-900 mb-4 pb-2 border-b border-slate-200">Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-500 mb-1">Title</p>
                  <p className="text-slate-900 font-semibold">{offer.title}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-500 mb-1">Category</p>
                  <p className="text-slate-900">{offer.category}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 sm:col-span-2">
                  <p className="text-sm font-medium text-slate-500 mb-1">Description</p>
                  <p className="text-slate-900">{offer.description}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-500 mb-1">Discount</p>
                  <p className="text-slate-900 font-semibold">{getDiscountText()}</p>
                </div>
                {offer.originalValue && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-slate-500 mb-1">Original Price</p>
                    <p className="text-slate-900">£{offer.originalValue}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="font-semibold text-lg text-slate-900 mb-4 pb-2 border-b border-slate-200">Offer Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-500 mb-1">Usage Limit</p>
                  <p className="text-slate-900 font-semibold">{offer.usageLimit}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-500 mb-1">Used</p>
                  <p className="text-slate-900">{offer.usageCount || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-500 mb-1">Remaining</p>
                  <p className="text-slate-900">{offer.usageLimit - (offer.usageCount || 0)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-500 mb-1">Expiry Date</p>
                  <p className="text-slate-900">{offer.expiryDate ? format(new Date(offer.expiryDate), "MMM d, yyyy") : "N/A"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 sm:col-span-2">
                  <p className="text-sm font-medium text-slate-500 mb-1">Created</p>
                  <p className="text-slate-900">{offer.createdAt ? format(new Date(offer.createdAt), "MMM d, yyyy") : "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
          
          {offer.terms && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="font-semibold text-lg text-slate-900 mb-4">Terms & Conditions</h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-slate-700">{offer.terms}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-slate-100 rounded-lg p-2">
              <Eye className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{offer.viewCount || 0}</div>
          <p className="text-slate-600 text-sm">Total Views</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-slate-100 rounded-lg p-2">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{offer.usageCount || 0}</div>
          <p className="text-slate-600 text-sm">Redemptions</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-slate-100 rounded-lg p-2">
              <DollarSign className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {offer.usageLimit > 0 ? Math.round(((offer.usageCount || 0) / offer.usageLimit) * 100) : 0}%
          </div>
          <p className="text-slate-600 text-sm">Usage Rate</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-slate-100 rounded-lg p-2">
              <Calendar className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {offer.expiryDate ? Math.max(0, Math.ceil((new Date(offer.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : "N/A"}
          </div>
          <p className="text-slate-600 text-sm">Days Until Expiry</p>
        </div>
      </div>

      {/* Recent Redemptions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200/60 p-6">
          <h2 className="text-slate-900 font-semibold text-xl mb-1">Recent Redemptions</h2>
          <p className="text-slate-600">Latest voucher redemptions for this offer</p>
        </div>
        <div className="p-8">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No recent redemptions available</h3>
            <p className="text-slate-600">Redemption tracking will appear here once customers start using this offer</p>
          </div>
        </div>
      </div>
    </div>
  );
}