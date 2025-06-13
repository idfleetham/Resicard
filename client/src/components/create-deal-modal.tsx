import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequestWithAuth } from "@/lib/auth";
import { insertDealSchema } from "@shared/schema";

const createDealSchema = insertDealSchema.extend({
  expiryDate: z.string().min(1, "Expiry date is required"),
  dealPercentage: z.string().optional(),
  freeItem: z.string().optional(),
  dealPrice: z.string().optional(),
  originalPrice: z.string().optional(),
  bogoItem: z.string().optional(),
  fixedAmount: z.string().optional(),
});

type CreateDealFormData = z.infer<typeof createDealSchema>;

interface CreateDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingDeal?: any;
}

export default function CreateDealModal({ isOpen, onClose, existingDeal }: CreateDealModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dealImageUrl, setDealImageUrl] = useState<string>(existingDeal?.imageUrl || "");

  // Image upload functionality
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setDealImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  // Map existing deal data to form fields based on discount type
  const getDefaultFormValues = () => {
    if (!existingDeal) {
      return {
        title: "",
        description: "",
        category: "",
        discountType: "fixed_percentage",
        discountValue: "",
        originalValue: "",
        usageLimit: 1,
        expiryDate: "",
        terms: "",
        dealPercentage: "",
        freeItem: "",
        dealPrice: "",
        originalPrice: "",
        bogoItem: "",
        fixedAmount: "",
      };
    }

    const baseValues = {
      title: existingDeal.title,
      description: existingDeal.description,
      category: existingDeal.category,
      discountType: existingDeal.discountType,
      discountValue: existingDeal.discountValue,
      originalValue: existingDeal.originalValue,
      usageLimit: existingDeal.usageLimit,
      expiryDate: new Date(existingDeal.expiryDate).toISOString().split('T')[0],
      terms: existingDeal.terms || "",
      dealPercentage: "",
      freeItem: "",
      dealPrice: "",
      originalPrice: "",
      bogoItem: "",
      fixedAmount: "",
    };

    // Map values to the appropriate field based on discount type
    switch (existingDeal.discountType) {
      case "fixed_percentage":
        baseValues.dealPercentage = existingDeal.discountValue;
        break;
      case "free_item":
        baseValues.freeItem = existingDeal.description; // Use description for free item
        break;
      case "fixed_price":
        baseValues.dealPrice = existingDeal.discountValue;
        baseValues.originalPrice = existingDeal.originalValue;
        break;
      case "buy_one_get_one":
        baseValues.bogoItem = existingDeal.description; // Use description for BOGO item
        break;
      case "fixed_amount":
        baseValues.fixedAmount = existingDeal.discountValue;
        break;
    }

    return baseValues;
  };

  const form = useForm<CreateDealFormData>({
    resolver: zodResolver(createDealSchema),
    defaultValues: getDefaultFormValues(),
  });

  const watchedDealType = form.watch("discountType");

  // Reset form when existingDeal changes
  useEffect(() => {
    const formValues = getDefaultFormValues();
    form.reset(formValues);
    setDealImageUrl(existingDeal?.imageUrl || "");
  }, [existingDeal, form]);

  const createDealMutation = useMutation({
    mutationFn: async (data: CreateDealFormData) => {
      console.log('Sending deal data:', data);
      
      // Map the new field structure to the existing backend format
      let discountValue = "0";
      let originalValue = "0";
      
      switch (data.discountType) {
        case "fixed_percentage":
          discountValue = data.dealPercentage || "0";
          break;
        case "free_item":
          discountValue = "0";
          break;
        case "fixed_price":
          discountValue = data.dealPrice || "0";
          originalValue = data.originalPrice || "0";
          break;
        case "buy_one_get_one":
          discountValue = "0";
          break;
        case "fixed_amount":
          discountValue = data.fixedAmount || "0";
          break;
      }
      
      const dealData = {
        title: data.title,
        description: data.description,
        category: data.category,
        discountType: data.discountType,
        discountValue,
        originalValue,
        usageLimit: Number(data.usageLimit),
        expiryDate: new Date(data.expiryDate),
        terms: data.terms,
        imageUrl: dealImageUrl || (existingDeal?.imageUrl) || user?.profilePhoto || null,
      };
      
      console.log('Processed deal data:', dealData);
      const method = existingDeal ? 'PUT' : 'POST';
      const url = existingDeal ? `/api/deals/${existingDeal.id}` : '/api/deals';
      const response = await apiRequestWithAuth(method, url, dealData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: existingDeal ? "Deal Updated" : "Deal Created",
        description: existingDeal ? "Your deal has been updated successfully." : "Your deal has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals/merchant', user?.id] });
      form.reset();
      setDealImageUrl("");
      onClose();
    },
    onError: (error: any) => {
      console.error('Deal creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create deal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateDealFormData) => {
    createDealMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingDeal ? "Edit Deal" : "Create New Deal"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 25% Off Main Course" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the deal terms and conditions"
                      className="h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Deal Image Upload */}
            <div className="space-y-2">
              <Label>Deal Image</Label>
              <div className="space-y-4">
                {dealImageUrl ? (
                  <div className="relative">
                    <img 
                      src={dealImageUrl} 
                      alt="Deal preview" 
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setDealImageUrl("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                      {isDragActive ? 'Drop your image here' : 'Drag & drop an image here, or click to select'}
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, WEBP up to 5MB
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {dealImageUrl ? 'Custom image uploaded' : `Default: Your business profile photo will be used`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="cafe">Cafe</SelectItem>
                        <SelectItem value="pub">Pub</SelectItem>
                        <SelectItem value="takeaway">Takeaway</SelectItem>
                        <SelectItem value="fine-dining">Fine Dining</SelectItem>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="experience">Experience</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select deal type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed_percentage">Fixed % Off</SelectItem>
                        <SelectItem value="free_item">Free Item</SelectItem>
                        <SelectItem value="fixed_price">Fixed Price</SelectItem>
                        <SelectItem value="buy_one_get_one">Buy One Get One Free</SelectItem>
                        <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dynamic fields based on deal type */}
            {watchedDealType === "fixed_percentage" && (
              <FormField
                control={form.control}
                name="dealPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Percentage (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="e.g., 25" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedDealType === "free_item" && (
              <FormField
                control={form.control}
                name="freeItem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free Item Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., Free oyster with each glass of champagne"
                        className="h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedDealType === "fixed_price" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dealPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Price (£)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="15.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="originalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Original Price (£)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="20.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {watchedDealType === "buy_one_get_one" && (
              <FormField
                control={form.control}
                name="bogoItem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buy One Get One Free Item</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Main courses, Cocktails" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedDealType === "fixed_amount" && (
              <FormField
                control={form.control}
                name="fixedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fixed Amount Off (£)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="5.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                        min="1"
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                        min={new Date().toISOString().split('T')[0]}
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
                  <FormLabel>Terms & Conditions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional terms and conditions"
                      className="h-16"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createDealMutation.isPending}
                className="flex-1 coastal-gradient"
              >
                {createDealMutation.isPending ? 'Creating...' : 'Create Deal'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
