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
  const toggleOfferMutation = useToggleOffer();
  const updateOfferMutation = useUpdateOffer();

  const createDealMutation = useMutation({
    mutationFn: (data: CreateDealData) => {
      const dealData = {
        ...data,
        expiryDate: new Date(data.expiryDate).toISOString(),
        merchantId: user!.id,
      };
      return apiRequest("POST", "/api/deals", dealData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals/my-deals"] });
      setIsCreateOpen(false);
      toast({ title: "Deal created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating deal", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Handle offer toggle
  const handleToggleOffer = (offerId: number) => {
    toggleOfferMutation.mutate(offerId.toString());
  };

  // Handle offer edit
  const handleEditOffer = (deal: Deal) => {
    setEditingDeal(deal);
  };

  // Handle offer update via the new mutation
  const handleUpdateOffer = (data: Partial<Deal>) => {
    if (!editingDeal) return;
    
    updateOfferMutation.mutate({
      id: editingDeal.id.toString(),
      data
    }, {
      onSuccess: () => {
        setEditingDeal(null);
      }
    });
  };

  const form = useForm<CreateDealData>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      discountType: "percentage",
      discountValue: "",
      originalValue: "",
      usageLimit: 100,
      expiryDate: "",
      terms: "",
      imageUrl: "",
    },
  });

  const onSubmit = (data: CreateDealData) => {
    createDealMutation.mutate(data);
  };

  // Form for editing existing deals
  const editForm = useForm<CreateDealData>({
    resolver: zodResolver(createDealSchema),
  });

  // Set form values when editing a deal
  useEffect(() => {
    if (editingDeal) {
      editForm.reset({
        title: editingDeal.title,
        description: editingDeal.description,
        category: editingDeal.category,
        discountType: editingDeal.discountType,
        discountValue: editingDeal.discountValue || "",
        originalValue: editingDeal.originalValue || "",
        usageLimit: editingDeal.usageLimit,
        expiryDate: editingDeal.expiryDate ? format(new Date(editingDeal.expiryDate), 'yyyy-MM-dd') : "",
        terms: editingDeal.terms || "",
        imageUrl: editingDeal.imageUrl || "",
      });
    }
  }, [editingDeal, editForm]);

  const onEditSubmit = (data: CreateDealData) => {
    const processedData = {
      ...data,
      expiryDate: new Date(data.expiryDate),
    };
    handleUpdateOffer(processedData);
  };

  const getStatusBadge = (deal: Deal) => {
    if (!deal.isActive) return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Paused</Badge>;
    if (new Date(deal.expiryDate) < new Date()) return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expired</Badge>;
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
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
        return `${deal.discountValue}% off`;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 bg-slate-800" />
            <Skeleton className="h-4 w-64 bg-slate-800" />
          </div>
          <Skeleton className="h-10 w-32 bg-slate-800" />
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-slate-800" />
                  <Skeleton className="h-8 w-12 bg-slate-800" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Table Skeleton */}
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-slate-800" />
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
      <Card className="bg-slate-900/50 border-slate-700 hover:shadow-xl hover:border-slate-600 transition-all duration-300">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-100">Your Offers</CardTitle>
                <CardDescription className="text-slate-400">
                  Create, edit and manage your business offers to attract more customers
                </CardDescription>
              </div>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0">
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="discountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Discount Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                                <SelectItem value="bogo">Buy One Get One</SelectItem>
                                <SelectItem value="free_item">Free Item</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discountValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Discount Value</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="20" 
                                {...field} 
                                value={field.value || ""}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="originalValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Original Value (£)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="25.00" 
                                {...field} 
                                value={field.value || ""}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="usageLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Usage Limit</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="100" 
                                {...field} 
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="expiryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Expiry Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                className="bg-slate-800 border-slate-700 text-slate-100"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Terms & Conditions</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional terms and conditions..."
                              {...field}
                              value={field.value || ""}
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
        </CardHeader>
      </Card>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Offer</DialogTitle>
              <DialogDescription>
                Create a new deal to attract customers to your business
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deal Title</FormLabel>
                        <FormControl>
                          <Input placeholder="20% off all meals" {...field} />
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
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what customers get with this deal..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage Off</SelectItem>
                            <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                            <SelectItem value="bogo">Buy One Get One</SelectItem>
                            <SelectItem value="free_item">Free Item</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="20" 
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="originalValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Original Price (£)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="50.00" 
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="usageLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usage Limit</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms & Conditions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional terms and conditions..."
                          {...field}
                          value={field.value || ""}
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
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDealMutation.isPending}>
                    {createDealMutation.isPending ? "Creating..." : "Create Offer"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            title: "Total Offers",
            value: deals.length,
            icon: DollarSign,
            gradient: "from-blue-500 to-blue-600"
          },
          {
            title: "Active Offers", 
            value: deals.filter((deal: Deal) => deal.isActive).length,
            icon: Play,
            gradient: "from-green-500 to-green-600"
          },
          {
            title: "Total Redemptions",
            value: deals.reduce((sum: number, deal: Deal) => sum + (deal.usageCount || 0), 0),
            icon: Users,
            gradient: "from-purple-500 to-purple-600"
          },
          {
            title: "Expiring Soon",
            value: deals.filter((deal: Deal) => {
              const daysUntilExpiry = Math.ceil(
                (new Date(deal.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
            }).length,
            icon: Calendar,
            gradient: "from-orange-500 to-orange-600"
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="bg-slate-900/50 border-slate-700 hover:shadow-xl hover:border-slate-600 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">{stat.title}</CardTitle>
                <div className={`w-8 h-8 bg-gradient-to-br ${stat.gradient} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Offers Table */}
      <Card className="bg-slate-900/50 border-slate-700 hover:shadow-xl hover:border-slate-600 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-slate-100">Your Offers</CardTitle>
          <CardDescription className="text-slate-400">
            Manage all your business offers and track their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">No offers yet</h3>
              <p className="text-slate-400 mb-6">Create your first offer to start attracting customers</p>
              <Button 
                onClick={() => setIsCreateOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Offer
              </Button>
            </motion.div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-300">Title</TableHead>
                  <TableHead className="text-slate-300">Discount</TableHead>
                  <TableHead className="text-slate-300">Category</TableHead>
                  <TableHead className="text-slate-300">Usage</TableHead>
                  <TableHead className="text-slate-300">Expiry</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal: Deal) => (
                  <TableRow key={deal.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-100">{deal.title}</TableCell>
                    <TableCell className="text-slate-300">{getDiscountText(deal)}</TableCell>
                    <TableCell className="text-slate-300">{deal.category}</TableCell>
                    <TableCell className="text-slate-300">
                      {deal.usageCount || 0} / {deal.usageLimit}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {format(new Date(deal.expiryDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{getStatusBadge(deal)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleOffer(deal.id)}
                          disabled={toggleOfferMutation.isPending}
                          className="border-slate-700 hover:bg-slate-800 text-slate-300"
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
                          className="border-slate-700 hover:bg-slate-800 text-slate-300"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.href = `/merchant/offers/${deal.id}`}
                          className="border-slate-700 hover:bg-slate-800 text-slate-300"
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDeal} onOpenChange={() => setEditingDeal(null)}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Edit Offer</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update your offer details
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200">Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what customers get with this deal..."
                        {...field} 
                        className="bg-slate-800 border-slate-700 text-slate-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage Off</SelectItem>
                          <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                          <SelectItem value="bogo">Buy One Get One</SelectItem>
                          <SelectItem value="free_item">Free Item</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="20" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="originalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Original Price (£)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="50.00" 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="usageLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usage Limit</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="100" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional terms and conditions..."
                        {...field}
                        value={field.value || ""}
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
                  onClick={() => setEditingDeal(null)}
                  className="border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateOfferMutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                >
                  {updateOfferMutation.isPending ? "Updating..." : "Update Offer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}