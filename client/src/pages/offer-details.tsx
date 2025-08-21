import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    if (!offer.isActive) return <Badge variant="secondary">Paused</Badge>;
    if (new Date(offer.expiryDate) < new Date()) return <Badge variant="destructive">Expired</Badge>;
    return <Badge variant="default">Active</Badge>;
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => window.location.href = '/merchant'}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{offer.title}</h1>
          <p className="text-gray-600">Offer Details and Analytics</p>
        </div>
        <div className="ml-auto">
          {getStatusBadge()}
        </div>
      </div>

      {/* Offer Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Offer Information</CardTitle>
          <CardDescription>Complete details about this offer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Basic Information</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Title:</span> {offer.title}</p>
                <p><span className="font-medium">Description:</span> {offer.description}</p>
                <p><span className="font-medium">Category:</span> {offer.category}</p>
                <p><span className="font-medium">Discount:</span> {getDiscountText()}</p>
                {offer.originalValue && (
                  <p><span className="font-medium">Original Price:</span> £{offer.originalValue}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Offer Settings</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Usage Limit:</span> {offer.usageLimit}</p>
                <p><span className="font-medium">Used:</span> {offer.usageCount || 0}</p>
                <p><span className="font-medium">Remaining:</span> {offer.usageLimit - (offer.usageCount || 0)}</p>
                <p><span className="font-medium">Expiry Date:</span> {format(new Date(offer.expiryDate), "MMM d, yyyy")}</p>
                <p><span className="font-medium">Created:</span> {offer.createdAt ? format(new Date(offer.createdAt), "MMM d, yyyy") : "N/A"}</p>
              </div>
            </div>
          </div>
          
          {offer.terms && (
            <div>
              <h3 className="font-semibold mb-2">Terms & Conditions</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded">{offer.terms}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offer.viewCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redemptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offer.usageCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offer.usageLimit > 0 ? Math.round(((offer.usageCount || 0) / offer.usageLimit) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Until Expiry</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.max(0, Math.ceil((new Date(offer.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Redemptions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Redemptions</CardTitle>
          <CardDescription>Latest voucher redemptions for this offer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No recent redemptions available</p>
            <p className="text-sm">Redemption tracking will appear here once customers start using this offer</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}