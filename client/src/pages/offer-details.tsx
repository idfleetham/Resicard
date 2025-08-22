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
    <div className="space-y-6 p-6 bg-app min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => window.location.href = '/merchant'} className="border-dim bg-surface hover:border-dimStrong text-fg">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-fg">{offer.title}</h1>
          <p className="text-soft">Offer Details and Analytics</p>
        </div>
        <div className="ml-auto">
          {getStatusBadge()}
        </div>
      </div>

      {/* Offer Details Card */}
      <Card className="bg-gradient-to-br from-brand1/20 to-brand2/20 border-dim shadow-elev-1 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-brand1 to-brand2 text-white border-b border-dim">
          <CardTitle className="text-white font-bold">Offer Information</CardTitle>
          <CardDescription className="text-white/90">Complete details about this offer</CardDescription>
        </CardHeader>
        <CardBody className="space-y-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-fg">Basic Information</h3>
              <div className="space-y-2">
                <p className="text-soft"><span className="font-medium text-fg">Title:</span> {offer.title}</p>
                <p className="text-soft"><span className="font-medium text-fg">Description:</span> {offer.description}</p>
                <p className="text-soft"><span className="font-medium text-fg">Category:</span> {offer.category}</p>
                <p className="text-soft"><span className="font-medium text-fg">Discount:</span> {getDiscountText()}</p>
                {offer.originalValue && (
                  <p className="text-soft"><span className="font-medium text-fg">Original Price:</span> £{offer.originalValue}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-fg">Offer Settings</h3>
              <div className="space-y-2">
                <p className="text-soft"><span className="font-medium text-fg">Usage Limit:</span> {offer.usageLimit}</p>
                <p className="text-soft"><span className="font-medium text-fg">Used:</span> {offer.usageCount || 0}</p>
                <p className="text-soft"><span className="font-medium text-fg">Remaining:</span> {offer.usageLimit - (offer.usageCount || 0)}</p>
                <p className="text-soft"><span className="font-medium text-fg">Expiry Date:</span> {format(new Date(offer.expiryDate), "MMM d, yyyy")}</p>
                <p className="text-soft"><span className="font-medium text-fg">Created:</span> {offer.createdAt ? format(new Date(offer.createdAt), "MMM d, yyyy") : "N/A"}</p>
              </div>
            </div>
          </div>
          
          {offer.terms && (
            <div>
              <h3 className="font-semibold mb-2 text-fg">Terms & Conditions</h3>
              <p className="text-soft bg-surface/50 p-3 rounded-lg border border-dim">{offer.terms}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-brand1/10 to-brand2/10 border-dim shadow-elev-1 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-brand1/20 to-brand2/20">
            <CardTitle className="text-sm font-medium text-fg">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-brand1" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold text-fg">{offer.viewCount || 0}</div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-brand1/10 to-brand2/10 border-dim shadow-elev-1 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-brand1/20 to-brand2/20">
            <CardTitle className="text-sm font-medium text-fg">Redemptions</CardTitle>
            <Users className="h-4 w-4 text-brand1" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold text-fg">{offer.usageCount || 0}</div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-brand1/10 to-brand2/10 border-dim shadow-elev-1 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-brand1/20 to-brand2/20">
            <CardTitle className="text-sm font-medium text-fg">Usage Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-brand1" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold text-fg">
              {offer.usageLimit > 0 ? Math.round(((offer.usageCount || 0) / offer.usageLimit) * 100) : 0}%
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-brand1/10 to-brand2/10 border-dim shadow-elev-1 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-brand1/20 to-brand2/20">
            <CardTitle className="text-sm font-medium text-fg">Days Until Expiry</CardTitle>
            <Calendar className="h-4 w-4 text-brand1" />
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-bold text-fg">
              {Math.max(0, Math.ceil((new Date(offer.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Redemptions */}
      <Card className="bg-gradient-to-br from-brand1/20 to-brand2/20 border-dim shadow-elev-1 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-brand1 to-brand2 text-white border-b border-dim">
          <CardTitle className="text-white font-bold">Recent Redemptions</CardTitle>
          <CardDescription className="text-white/90">Latest voucher redemptions for this offer</CardDescription>
        </CardHeader>
        <CardBody className="p-6">
          <div className="text-center py-8 text-soft">
            <p>No recent redemptions available</p>
            <p className="text-sm">Redemption tracking will appear here once customers start using this offer</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}