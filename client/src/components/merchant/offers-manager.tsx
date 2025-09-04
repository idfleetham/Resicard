import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { type Deal } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useOffers, useToggleOffer, useUpdateOffer, useToggleComprehensiveOffer, useUpdateComprehensiveOffer } from "@/hooks/use-merchant-offers";
import { Plus, Edit, Archive, Play, Pause, Eye, Calendar, DollarSign, Users, Package, Upload, Settings, Clock, X } from "lucide-react";
import ComprehensiveOfferCreator from "./comprehensive-offer-creator";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";

interface OffersManagerProps {
  totalRedemptions?: number;
}

export default function OffersManager({ totalRedemptions = 0 }: OffersManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isComprehensiveOpen, setIsComprehensiveOpen] = useState(false);
  const [isComprehensiveEditOpen, setIsComprehensiveEditOpen] = useState(false);
  const [editingComprehensiveOffer, setEditingComprehensiveOffer] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingOffer, setViewingOffer] = useState<any>(null);

  const { data: deals = [], isLoading } = useOffers();
  
  // Also fetch comprehensive offers
  const { data: comprehensiveOffers = [], isLoading: isLoadingOffers } = useQuery({
    queryKey: ["/api/offers/my-offers"],
    queryFn: () => apiRequest("GET", "/api/offers/my-offers").then(res => res.json()),
  });

  // Combine all offers into a single list
  const allOffers = [
    ...deals.map((deal: Deal) => {
      const isExpired = deal.expiryDate && new Date(deal.expiryDate) < new Date();
      return {
        ...deal,
        type: 'simple',
        offerType: deal.discountType,
        createdAt: deal.createdAt,
        isActive: deal.isActive && !isExpired, // Mark as inactive if expired
        category: deal.category,
        title: deal.title,
        description: deal.description,
        discountText: deal.discountType === 'percentage' ? `${deal.discountValue}% off` :
                     deal.discountType === 'fixed' ? `£${deal.discountValue} off` :
                     deal.discountType === 'bogo' ? 'BOGOF' :
                     deal.discountType === 'free_item' ? 'Free Item' : 
                     String(deal.discountValue),
        usageCount: deal.usageCount || 0,
        usageLimit: deal.usageLimit,
        expiryDate: deal.expiryDate,
        isExpired: isExpired,
      };
    }),
    ...comprehensiveOffers.map((offer: any) => ({
      ...offer,
      type: 'comprehensive',
      offerType: offer.type,
      isActive: offer.active ?? true,
      discountText: offer.type === 'bogo' ? 'BOGOF' : (offer.type ? offer.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Offer'),
      usageCount: offer.usageCount || 0, // Use actual usage count from API
      usageLimit: offer.usageLimit || 100,
      expiryDate: offer.validTo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
    }))
  ];
  const { mutate: toggleOfferMutation, isPending: isToggling } = useToggleOffer();
  const { mutate: toggleComprehensiveOfferMutation } = useToggleComprehensiveOffer();
  const { mutate: updateComprehensiveOfferMutation } = useUpdateComprehensiveOffer();



  const handleToggleOffer = (dealId: number | string, isComprehensive: boolean = false) => {
    if (isComprehensive) {
      toggleComprehensiveOfferMutation(String(dealId));
    } else {
      toggleOfferMutation(String(dealId));
    }
  };




  const handleEditComprehensiveOffer = (offer: any) => {
    setEditingComprehensiveOffer(offer);
    setIsComprehensiveOpen(true); // Open the full creator panel instead
  };


  const getStatusBadge = (deal: Deal) => {
    if (!deal.isActive) return (
      <Badge className="inline-flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-500/12 px-2 py-0.5 text-sm text-yellow-300 shadow-[inset_0_-1px_0_rgba(255,255,255,.08)]">
        Paused
      </Badge>
    );
    if (new Date(deal.expiryDate) < new Date()) return (
      <Badge className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/12 px-2 py-0.5 text-sm text-red-300 shadow-[inset_0_-1px_0_rgba(255,255,255,.08)]">
        Expired
      </Badge>
    );
    return (
      <Badge className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-2 py-0.5 text-sm text-emerald-300 shadow-[inset_0_-1px_0_rgba(255,255,255,.08)]">
        Active
      </Badge>
    );
  };

  const getDiscountText = (deal: Deal) => {
    switch (deal.discountType) {
      case "percentage":
        return `${deal.discountValue}% off`;
      case "fixed":
        return `£${deal.discountValue} off`;
      case "bogo":
        return "BOGOF";
      case "free_item":
        return "Free Item";
      default:
        return deal.discountValue;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card border border-white/40 shadow-xl shadow-white/20">
              <CardBody className="p-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-surface" />
                  <Skeleton className="h-8 w-12 bg-surface" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
        <Card className="bg-card border border-white/40 shadow-xl shadow-white/20">
          <CardBody className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-surface" />
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Hero Header */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-brand1 via-brand2 to-transparent border border-white/40 shadow-xl shadow-white/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg">Your Offers</h1>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsComprehensiveOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-elev-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Offer
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Offers",
            value: allOffers.length,
            icon: "📦",
            gradient: "from-brand1/70 to-brand2/70"
          },
          {
            title: "Active Offers", 
            value: allOffers.filter(offer => offer.isActive).length,
            icon: "▶",
            gradient: "from-green-500/70 to-green-600/70"
          },
          {
            title: "Total Redemptions",
            value: totalRedemptions,
            icon: "👥",
            gradient: "from-purple-500/70 to-purple-600/70"
          },
          {
            title: "Expiring Soon",
            value: allOffers.filter((offer: any) => {
              const expiry = offer.expiryDate ? new Date(offer.expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              const daysUntilExpiry = Math.ceil(
                (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
            }).length,
            icon: "📅",
            gradient: "from-orange-500/70 to-orange-600/70"
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="rounded-2xl bg-card border border-white/40 shadow-xl shadow-white/20 p-5">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-lg">{stat.title}</span>
                <span className={`inline-flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-elev-1`}>
                  {stat.icon}
                </span>
              </div>
              <div className="mt-3 text-3xl font-semibold text-fg">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Offers Table */}
      <div className="bg-card border border-white/40 shadow-xl shadow-white/20 hover:shadow-2xl hover:shadow-white/30 hover:border-white/60 transition overflow-hidden rounded-xl">
        {allOffers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-fg mb-2">No offers yet</h3>
            <p className="text-slate-300 mb-6">Create your first offer to start attracting customers</p>
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="bg-gradient-to-r from-brand1 to-brand2 text-white shadow-elev-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Offer
            </Button>
          </div>
        ) : (
            <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-purple-600 to-blue-600 sticky top-0">
                    <TableHead className="text-white font-semibold text-base tracking-wide uppercase">Title</TableHead>
                    <TableHead className="text-white font-semibold text-base tracking-wide uppercase w-48">Offer Type</TableHead>
                    <TableHead className="text-white font-semibold text-base tracking-wide uppercase">Category</TableHead>
                    <TableHead className="text-white font-semibold text-base tracking-wide uppercase">Usage</TableHead>
                    <TableHead className="text-white font-semibold text-base tracking-wide uppercase">Expiry</TableHead>
                    <TableHead className="text-white font-semibold text-base tracking-wide uppercase">Status</TableHead>
                    <TableHead className="text-white font-semibold text-base tracking-wide uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allOffers.map((offer: any) => (
                    <TableRow key={`${offer.type}-${offer.id}`} className="hover:bg-white/[0.03]">
                      <TableCell className="font-medium text-fg text-xl">
                        <div>{offer.title}</div>
                      </TableCell>
                      <TableCell className="text-slate-200 text-xl w-48">{offer.discountText}</TableCell>
                      <TableCell className="text-slate-200 text-xl">{offer.category}</TableCell>
                      <TableCell className="text-slate-200 text-xl">
                        {offer.usageCount || 0} / {offer.usageLimit}
                      </TableCell>
                      <TableCell className="text-slate-200 text-xl">
                        {offer.expiryDate ? format(new Date(offer.expiryDate), "MMM d, yyyy") : 'No expiry'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          offer.isExpired ? "bg-orange-500/20 text-orange-400 border-orange-500/30 text-lg" :
                          offer.isActive ? "bg-green-500/20 text-green-400 border-green-500/30 text-lg" : 
                          "bg-red-500/20 text-red-400 border-red-500/30 text-lg"
                        }>
                          {offer.isExpired ? "Expired" : (offer.isActive ? "Active" : "Paused")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleOffer(offer.id, offer.type === 'comprehensive')}
                            disabled={isToggling}
                            className="border-dim bg-surface hover:border-dimStrong"
                          >
                            {offer.isActive ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditComprehensiveOffer(offer)}
                            className="border-dim bg-surface hover:border-dimStrong"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setViewingOffer(offer);
                              setIsViewOpen(true);
                            }}
                            className="border-dim bg-surface hover:border-dimStrong"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          )}
      </div>



      {/* Comprehensive Offer Creator Modal */}
      {isComprehensiveOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-auto border border-slate-700">
            <ComprehensiveOfferCreator 
              onClose={() => {
                setIsComprehensiveOpen(false);
                setEditingComprehensiveOffer(null);
              }}
              editingOffer={editingComprehensiveOffer} // Pass the offer to edit
            />
          </div>
        </div>
      )}

      {/* View Offer Modal */}
      {isViewOpen && viewingOffer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto border border-slate-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-slate-100">View Offer Details</h2>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewOpen(false);
                    setViewingOffer(null);
                  }}
                  className="border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                      <div className="text-slate-100 text-lg">{viewingOffer.title}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                      <div className="text-slate-100">{viewingOffer.type === 'simple' ? 'Simple Offer' : 'Advanced Offer'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Offer Type</label>
                      <div className="text-slate-100">{viewingOffer.discountText}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                      <div className="text-slate-100">{viewingOffer.category}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                      <div className="text-slate-100">
                        {viewingOffer.isExpired ? "Expired" : (viewingOffer.isActive ? "Active" : "Paused")}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Usage</label>
                      <div className="text-slate-100">{viewingOffer.usageCount || 0} / {viewingOffer.usageLimit}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Expiry Date</label>
                      <div className="text-slate-100">
                        {viewingOffer.expiryDate ? format(new Date(viewingOffer.expiryDate), "MMM d, yyyy") : 'No expiry'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {viewingOffer.description && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                    <div className="text-slate-100 p-3 bg-slate-800/50 rounded-lg">{viewingOffer.description}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


    </motion.div>
  );
}