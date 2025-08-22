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
    <div className="space-y-6 p-6 bg-app min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => window.location.href = '/merchant'} className="border-dim bg-surface hover:border-dimStrong text-fg">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Title Card */}
      <Card className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white font-semibold text-3xl">{offer.title}</CardTitle>
              <CardDescription className="text-indigo-100 text-lg">Offer Details and Analytics</CardDescription>
            </div>
            <div>
              {getStatusBadge()}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Offer Details Card */}
      <Card className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
          <CardTitle className="text-white font-semibold text-lg">Offer Information</CardTitle>
          <CardDescription className="text-indigo-100">Complete details about this offer</CardDescription>
        </CardHeader>
        <CardBody className="p-8 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-gray-200/20 dark:divide-white/10">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">Basic Information</h3>
              <div className="space-y-3">
                <p className="text-gray-600 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Title:</span> {offer.title}</p>
                <p className="text-gray-600 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Description:</span> {offer.description}</p>
                <p className="text-gray-600 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Category:</span> {offer.category}</p>
                <p className="text-gray-600 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Discount:</span> {getDiscountText()}</p>
                {offer.originalValue && (
                  <p className="text-gray-600 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Original Price:</span> £{offer.originalValue}</p>
                )}
              </div>
            </div>
            <div className="pt-4 md:pt-0 md:pl-8 space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">Offer Settings</h3>
              <div className="space-y-3">
                <p className="text-gray-600 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Usage Limit:</span> {offer.usageLimit}</p>
                <p className="text-gray-600 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Used:</span> {offer.usageCount || 0}</p>
                <p className="text-gray-600 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Remaining:</span> {offer.usageLimit - (offer.usageCount || 0)}</p>
                <p className="text-gray-600 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Expiry Date:</span> {offer.expiryDate ? format(new Date(offer.expiryDate), "MMM d, yyyy") : "N/A"}</p>
                <p className="text-gray-600 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">Created:</span> {offer.createdAt ? format(new Date(offer.createdAt), "MMM d, yyyy") : "N/A"}</p>
              </div>
            </div>
          </div>
          
          {offer.terms && (
            <div className="mt-8 pt-6 border-t divide-white/10">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">Terms & Conditions</h3>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 p-4 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
                <p className="text-gray-700 dark:text-gray-200">{offer.terms}</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
            <CardTitle className="text-white font-semibold text-lg">Total Views</CardTitle>
            <Eye className="h-5 w-5 text-indigo-100" />
          </CardHeader>
          <CardBody className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{offer.viewCount || 0}</div>
          </CardBody>
        </Card>
        <Card className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
            <CardTitle className="text-white font-semibold text-lg">Redemptions</CardTitle>
            <Users className="h-5 w-5 text-indigo-100" />
          </CardHeader>
          <CardBody className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{offer.usageCount || 0}</div>
          </CardBody>
        </Card>
        <Card className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
            <CardTitle className="text-white font-semibold text-lg">Usage Rate</CardTitle>
            <DollarSign className="h-5 w-5 text-indigo-100" />
          </CardHeader>
          <CardBody className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {offer.usageLimit > 0 ? Math.round(((offer.usageCount || 0) / offer.usageLimit) * 100) : 0}%
            </div>
          </CardBody>
        </Card>
        <Card className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
            <CardTitle className="text-white font-semibold text-lg">Days Until Expiry</CardTitle>
            <Calendar className="h-5 w-5 text-indigo-100" />
          </CardHeader>
          <CardBody className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {offer.expiryDate ? Math.max(0, Math.ceil((new Date(offer.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : "N/A"}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Redemptions */}
      <Card className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
          <CardTitle className="text-white font-semibold text-lg">Recent Redemptions</CardTitle>
          <CardDescription className="text-indigo-100">Latest voucher redemptions for this offer</CardDescription>
        </CardHeader>
        <CardBody className="p-8 bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No recent redemptions available</h3>
            <p className="text-gray-600 dark:text-gray-300">Redemption tracking will appear here once customers start using this offer</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}