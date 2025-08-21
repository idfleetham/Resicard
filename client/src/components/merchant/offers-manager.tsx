import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useOffers, useToggleOffer, useUpdateOffer } from "@/hooks/use-merchant-offers";
import { Plus, Edit, Archive, Play, Pause, Eye, Calendar, DollarSign, Users, Package } from "lucide-react";
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
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const { data: deals = [], isLoading } = useOffers();
  const { mutate: toggleOfferMutation, isPending: isToggling } = useToggleOffer();
  const { mutate: updateOfferMutation, isPending: isUpdating } = useUpdateOffer();

  const createDealMutation = useMutation({
    mutationFn: (data: CreateDealData) => {
      const processedData = {
        ...data,
        merchantId: user!.id,
        expiryDate: new Date(data.expiryDate),
        usageCount: 0,
        isActive: true,
      };
      return apiRequest("POST", "/api/deals", processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
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

  const handleToggleOffer = (dealId: number) => {
    toggleOfferMutation(dealId);
  };

  const handleEditOffer = (deal: Deal) => {
    setEditingDeal(deal);
  };

  const handleUpdateOffer = (data: CreateDealData) => {
    if (!editingDeal) return;
    updateOfferMutation({
      id: editingDeal.id,
      data: { ...data, expiryDate: new Date(data.expiryDate) },
    });
    setEditingDeal(null);
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
      usageLimit: 100,
      expiryDate: "",
      terms: "",
      imageUrl: "",
    },
  });

  const getStatusBadge = (deal: Deal) => {
    if (!deal.isActive) return (
      <Badge className="inline-flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-500/12 px-2 py-0.5 text-xs text-yellow-300 shadow-[inset_0_-1px_0_rgba(255,255,255,.08)]">
        Paused
      </Badge>
    );
    if (new Date(deal.expiryDate) < new Date()) return (
      <Badge className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/12 px-2 py-0.5 text-xs text-red-300 shadow-[inset_0_-1px_0_rgba(255,255,255,.08)]">
        Expired
      </Badge>
    );
    return (
      <Badge className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-2 py-0.5 text-xs text-emerald-300 shadow-[inset_0_-1px_0_rgba(255,255,255,.08)]">
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
        return "Buy One Get One";
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
            <Card key={i} className="bg-card/90 border border-dim shadow-elev-1">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-surface" />
                  <Skeleton className="h-8 w-12 bg-surface" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-card/90 border border-dim shadow-elev-1">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-surface" />
              ))}
            </div>
          </CardContent>
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
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-brand1/25 via-brand2/20 to-transparent border border-dim p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg">Your Offers</h1>
            <p className="text-soft">Manage all your business offers</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-brand1 to-brand2 text-white shadow-elev-1">
                <Plus className="w-4 h-4 mr-2" />
                Create Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-100">Create New Offer</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Create a new deal to attract customers to your business
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createDealMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Deal Title</FormLabel>
                          <FormControl>
                            <Input placeholder="20% off all meals" {...field} className="bg-slate-800 border-slate-700 text-slate-100" />
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
                          <FormLabel className="text-slate-200">Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="Food & Drink">Food & Drink</SelectItem>
                              <SelectItem value="Retail">Retail</SelectItem>
                              <SelectItem value="Services">Services</SelectItem>
                              <SelectItem value="Entertainment">Entertainment</SelectItem>
                              <SelectItem value="Health & Beauty">Health & Beauty</SelectItem>
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
                        <FormLabel className="text-slate-200">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your offer..."
                            {...field}
                            className="bg-slate-800 border-slate-700 text-slate-100"
                          />
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
                      className="border-slate-700 hover:bg-slate-800 text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createDealMutation.isPending}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                    >
                      {createDealMutation.isPending ? "Creating..." : "Create Offer"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Offers",
            value: deals.length,
            icon: "📦",
            gradient: "from-brand1/70 to-brand2/70"
          },
          {
            title: "Active Offers", 
            value: deals.filter((deal: Deal) => deal.isActive).length,
            icon: "▶",
            gradient: "from-green-500/70 to-green-600/70"
          },
          {
            title: "Total Redemptions",
            value: deals.reduce((sum: number, deal: Deal) => sum + (deal.usageCount || 0), 0),
            icon: "👥",
            gradient: "from-purple-500/70 to-purple-600/70"
          },
          {
            title: "Expiring Soon",
            value: deals.filter((deal: Deal) => {
              const daysUntilExpiry = Math.ceil(
                (new Date(deal.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
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
            <div className="rounded-2xl bg-white/[0.03] border border-dim shadow-elev-1 p-5">
              <div className="flex items-center justify-between">
                <span className="text-soft">{stat.title}</span>
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
      <Card className="bg-card/90 border border-dim shadow-elev-1 hover:shadow-elev-2 hover:border-dimStrong transition">
        <CardHeader className="border-b border-dim">
          <CardTitle className="text-fg">Your Offers</CardTitle>
          <CardDescription className="text-soft">
            Manage all your business offers and track their performance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          {deals.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-soft" />
              </div>
              <h3 className="text-lg font-semibold text-fg mb-2">No offers yet</h3>
              <p className="text-soft mb-6">Create your first offer to start attracting customers</p>
              <Button 
                onClick={() => setIsCreateOpen(true)}
                className="bg-gradient-to-r from-brand1 to-brand2 text-white shadow-elev-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Offer
              </Button>
            </motion.div>
          ) : (
            <div className="rounded-xl bg-surface/80 border border-dim shadow-elev-1 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface2/70 sticky top-0 border-b border-white/5">
                    <TableHead className="text-soft">Title</TableHead>
                    <TableHead className="text-soft">Discount</TableHead>
                    <TableHead className="text-soft">Category</TableHead>
                    <TableHead className="text-soft">Usage</TableHead>
                    <TableHead className="text-soft">Expiry</TableHead>
                    <TableHead className="text-soft">Status</TableHead>
                    <TableHead className="text-soft">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5">
                  {deals.map((deal: Deal) => (
                    <TableRow key={deal.id} className="hover:bg-white/[0.03]">
                      <TableCell className="font-medium text-fg">{deal.title}</TableCell>
                      <TableCell className="text-soft">{getDiscountText(deal)}</TableCell>
                      <TableCell className="text-soft">{deal.category}</TableCell>
                      <TableCell className="text-soft">
                        {deal.usageCount || 0} / {deal.usageLimit}
                      </TableCell>
                      <TableCell className="text-soft">
                        {format(new Date(deal.expiryDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(deal)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleOffer(deal.id)}
                            disabled={isToggling}
                            className="border-dim bg-surface hover:border-dimStrong"
                          >
                            {deal.isActive ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditOffer(deal)}
                            className="border-dim bg-surface hover:border-dimStrong"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = `/merchant/offers/${deal.id}`}
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
        </CardContent>
      </Card>
    </motion.div>
  );
}