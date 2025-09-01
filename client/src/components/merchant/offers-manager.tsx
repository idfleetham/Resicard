import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDealSchema, type Deal, type InsertDeal } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useOffers, useToggleOffer, useUpdateOffer, useToggleComprehensiveOffer, useUpdateComprehensiveOffer } from "@/hooks/use-merchant-offers";
import { Plus, Edit, Archive, Play, Pause, Eye, Calendar, DollarSign, Users, Package, Upload, Settings, Clock, X } from "lucide-react";
import ComprehensiveOfferCreator from "./comprehensive-offer-creator";
import { format, parseISO } from "date-fns";
import { z } from "zod";
import { motion } from "framer-motion";

const createDealSchema = insertDealSchema.extend({
  expiryDate: z.string().min(1, "Expiry date is required"),
});

type CreateDealData = z.infer<typeof createDealSchema>;

export default function OffersManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isComprehensiveOpen, setIsComprehensiveOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [uploadingImageForOffer, setUploadingImageForOffer] = useState<number | null>(null);
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
      usageCount: 0, // TODO: implement usage tracking for comprehensive offers
      usageLimit: offer.usageLimit || '∞',
      expiryDate: offer.validTo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
    }))
  ];
  const { mutate: toggleOfferMutation, isPending: isToggling } = useToggleOffer();
  const { mutate: toggleComprehensiveOfferMutation } = useToggleComprehensiveOffer();
  const { mutate: updateComprehensiveOfferMutation } = useUpdateComprehensiveOffer();

  const uploadOfferImageMutation = useMutation({
    mutationFn: ({ offerId, file }: { offerId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return fetch(`/api/merchant/offers/${offerId}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      }).then(res => res.json());
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals/my-deals"] });
      toast({ title: "Image uploaded successfully" });
      setUploadingImageForOffer(null);
      // Update form if currently editing this offer
      if (editingDeal?.id === variables.offerId) {
        form.setValue("imageUrl", data.imageUrl);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
      setUploadingImageForOffer(null);
    },
  });

  const createDealMutation = useMutation({
    mutationFn: (data: CreateDealData) => {
      const processedData = {
        ...data,
        merchantId: user!.id,
        discountValue: parseFloat(data.discountValue) || 0,
        originalValue: data.originalValue ? parseFloat(data.originalValue) : null,
        usageLimit: parseInt(data.usageLimit) || 100,
        expiryDate: new Date(data.expiryDate),
        usageCount: 0,
        isActive: true,
      };
      console.log('Processed deal data:', processedData);
      return apiRequest("POST", "/api/deals", processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/my-deals"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Offer created successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating offer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleOffer = (dealId: number | string, isComprehensive: boolean = false) => {
    if (isComprehensive) {
      toggleComprehensiveOfferMutation(String(dealId));
    } else {
      toggleOfferMutation(String(dealId));
    }
  };

  const handleEditOffer = (deal: Deal) => {
    setEditingDeal(deal);
    form.reset({
      title: deal.title,
      description: deal.description,
      category: deal.category as "food" | "entertainment" | "retail" | "services",
      discountType: deal.discountType as "percentage" | "fixed" | "bogo" | "free_item",
      discountValue: deal.discountValue?.toString() || "",
      expiryDate: format(new Date(deal.expiryDate), "yyyy-MM-dd"),
      usageLimit: deal.usageLimit?.toString() || "100",
      terms: deal.terms || "",
      imageUrl: deal.imageUrl || "",
    });
    setIsCreateOpen(true); // Use the same dialog for editing
  };

  const { mutate: updateOfferMutation, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/deals/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals/my-deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setIsCreateOpen(false);
      setEditingDeal(null);
      form.reset();
      toast({
        title: "Offer Updated",
        description: "Offer updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update offer",
        variant: "destructive",
      });
    },
  });

  const handleUpdateOffer = (data: CreateDealData) => {
    if (!editingDeal) return;
    updateOfferMutation({
      id: String(editingDeal.id),
      data: { ...data, expiryDate: new Date(data.expiryDate) },
    });
  };

  const handleEditComprehensiveOffer = (offer: any) => {
    setEditingComprehensiveOffer(offer);
    setIsComprehensiveOpen(true); // Open the full creator panel instead
  };

  const form = useForm<CreateDealData>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "Food & Drink",
      discountType: "percentage",
      discountValue: "",
      originalValue: "",
      usageLimit: "100",
      expiryDate: "",
      terms: "",
      imageUrl: "",
    },
  });

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
            <Card key={i} className="bg-card/90 border border-white/40 shadow-xl shadow-white/20">
              <CardBody className="p-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-surface" />
                  <Skeleton className="h-8 w-12 bg-surface" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
        <Card className="bg-card/90 border border-white/40 shadow-xl shadow-white/20">
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
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-brand1/25 via-brand2/20 to-transparent border border-white/40 shadow-xl shadow-white/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg">Your Offers</h1>
            <p className="text-slate-300 text-lg">Manage all your business offers</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsComprehensiveOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-elev-1"
            >
              <Settings className="w-4 h-4 mr-2" />
              Advanced Offer
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) {
                setEditingDeal(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-brand1 to-brand2 text-white shadow-elev-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Quick Offer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-100">
                  {editingDeal ? "Edit Offer" : "Create New Offer"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {editingDeal 
                    ? `Update the details for "${editingDeal.title}"`
                    : "Create a new deal to attract customers to your business"
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => {
                  if (editingDeal) {
                    handleUpdateOffer(data);
                  } else {
                    createDealMutation.mutate(data);
                  }
                })} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-base">Deal Title</FormLabel>
                          <FormControl>
                            <Input placeholder="20% off all meals" {...field} className="input-dark" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-base">Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                              <SelectItem value="Food & Drink" className="text-white hover:bg-slate-700">Food & Drink</SelectItem>
                              <SelectItem value="Retail" className="text-white hover:bg-slate-700">Retail</SelectItem>
                              <SelectItem value="Services" className="text-white hover:bg-slate-700">Services</SelectItem>
                              <SelectItem value="Entertainment" className="text-white hover:bg-slate-700">Entertainment</SelectItem>
                              <SelectItem value="Health & Beauty" className="text-white hover:bg-slate-700">Health & Beauty</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200 text-base">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your offer..."
                            {...field}
                            className="input-dark"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200 text-base">Offer Image</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && editingDeal?.id) {
                                  setUploadingImageForOffer(editingDeal.id);
                                  uploadOfferImageMutation.mutate({ offerId: editingDeal.id, file });
                                }
                              }}
                              className="input-dark text-white file:text-white file:bg-slate-700 file:border-slate-600"
                              disabled={uploadOfferImageMutation.isPending}
                            />
                            {field.value && (
                              <div className="mt-2">
                                <img
                                  src={field.value}
                                  alt="Offer preview"
                                  className="h-12 w-12 rounded-xl ring-1 ring-dim bg-white/[0.06] object-cover"
                                />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateOpen(false)}
                      className="border-slate-700 hover:bg-slate-800 text-black bg-white hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createDealMutation.isPending}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                    >
                      {createDealMutation.isPending || isUpdating 
                        ? (editingDeal ? "Updating..." : "Creating...") 
                        : (editingDeal ? "Update Offer" : "Create Offer")
                      }
                    </Button>
                  </div>
                </form>
              </Form>
              </DialogContent>
            </Dialog>
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
            value: allOffers.reduce((sum: number, offer: any) => sum + (offer.usageCount || 0), 0),
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
            <div className="rounded-2xl bg-white/[0.03] border border-white/40 shadow-xl shadow-white/20 p-5">
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
      <Card className="bg-card/90 border border-white/40 shadow-xl shadow-white/20 hover:shadow-2xl hover:shadow-white/30 hover:border-white/60 transition">
        <CardHeader className="border-b border-white/30">
          <CardTitle className="text-fg text-3xl">Your Offers</CardTitle>
          <CardDescription className="text-slate-300 text-lg">
            Manage all your business offers and track their performance
          </CardDescription>
        </CardHeader>
        <CardBody className="p-5">
          {allOffers.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-12"
            >
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
            </motion.div>
          ) : (
            <div className="rounded-xl bg-surface/80 border border-white/40 shadow-xl shadow-white/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface2/70 sticky top-0 border-b border-white/5">
                    <TableHead className="text-slate-300 font-medium text-xl">Type</TableHead>
                    <TableHead className="text-slate-300 font-medium text-xl">Title</TableHead>
                    <TableHead className="text-slate-300 font-medium text-xl">Offer Type</TableHead>
                    <TableHead className="text-slate-300 font-medium text-xl">Category</TableHead>
                    <TableHead className="text-slate-300 font-medium text-xl">Usage</TableHead>
                    <TableHead className="text-slate-300 font-medium text-xl">Expiry</TableHead>
                    <TableHead className="text-slate-300 font-medium text-xl">Status</TableHead>
                    <TableHead className="text-slate-300 font-medium text-xl">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5">
                  {allOffers.map((offer: any) => (
                    <TableRow key={`${offer.type}-${offer.id}`} className="hover:bg-white/[0.03]">
                      <TableCell>
                        <Badge className={offer.type === 'simple' ? "bg-blue-500/20 text-blue-400 border-blue-500/30 text-lg" : "bg-purple-500/20 text-purple-400 border-purple-500/30 text-lg"}>
                          {offer.type === 'simple' ? 'Simple' : 'Advanced'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-fg text-xl">
                        <div>{offer.title}</div>
                      </TableCell>
                      <TableCell className="text-slate-200 text-xl">{offer.discountText}</TableCell>
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
                          {offer.type === 'simple' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleOffer(offer.id)}
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
                                onClick={() => handleEditOffer(offer)}
                                className="border-dim bg-surface hover:border-dimStrong"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {offer.type === 'comprehensive' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleOffer(offer.id, true)}
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
                            </>
                          )}
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
            </div>
          )}
        </CardBody>
      </Card>



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