import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Trash2, 
  Clock, 
  Calendar, 
  MapPin, 
  Users, 
  Percent, 
  PoundSterling,
  Settings,
  Shield,
  BarChart3,
  Image as ImageIcon,
  Tag,
  Upload
} from "lucide-react";
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Comprehensive offer schema based on requirements
const offerSchema = z.object({
  // A) Core & pricing
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  type: z.enum(["percentage_discount", "fixed_amount_discount", "fixed_price_bundle", "free_item_with_purchase", "bogo", "day_time_specific", "limited_redemptions", "loyalty_reward"]),
  percentOff: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) || undefined : val).optional(),
  fixedPrice: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) || 0 : val).optional(),
  originalValue: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) || 0 : val).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),

  // B) Visibility & eligibility
  audience: z.enum(["resident", "student", "both"]).default("both"),
  eligibleTiers: z.array(z.string()).default([]),
  minBasket: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) || undefined : val).optional(),
  maxDiscount: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) || undefined : val).optional(),
  stackable: z.boolean().default(false),
  newCustomerOnly: z.boolean().default(false),
  geofenceRadius: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) || undefined : val).optional(),

  // C) Scheduling
  validFrom: z.string(),
  validTo: z.string(),
  daysOfWeek: z.array(z.string()).default([]),
  timeSlots: z.string().default("{}"), // JSON string storing daily schedule data
  blackoutDates: z.array(z.object({
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    recurring: z.boolean().default(false)
  })).default([]),
  leadTime: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) || 0 : val).default(0),

  // D) Redemption rules & limits
  maxPerTransaction: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) || 1 : val).default(1),
  maxPerDay: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) || undefined : val).optional(),
  maxPerWeek: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) || undefined : val).optional(),
  maxLifetime: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) || undefined : val).optional(),
  globalUsageLimit: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) || undefined : val).optional(),
  voucherTimeoutHours: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) || 24 : val).default(24), // Hours to make booking after claiming
  staffPinRequired: z.boolean().default(false),
  proofType: z.enum(["qr_only", "code_pin", "app_checkin"]).default("qr_only"),

  // E) Terms & conditions
  terms: z.string().optional(),
  dineInOnly: z.boolean().default(false),
  excludesAlcohol: z.boolean().default(false),
  serviceChargeIncluded: z.boolean().default(true),
  validOnBankHolidays: z.boolean().default(true),

  // F) Media & presentation
  imageUrl: z.string().optional(),
  shortPromo: z.string().max(90, "Promo must be 90 characters or less").optional(),
  priority: z.enum(["standard", "featured"]).default("standard"),

  // G) Budget & billing controls
  budgetCap: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseFloat(val) || undefined : val).optional(),
  autoPauseOnAbuse: z.boolean().default(true),

  // H) Fraud & safety
  deviceFingerprinting: z.boolean().default(true),
});

type OfferFormData = z.infer<typeof offerSchema>;

const CATEGORIES = [
  "Food & Drink",
  "Hotel & Accommodation",
  "Retail",
  "Services", 
  "Entertainment",
  "Health & Beauty",
  "Sports & Fitness",
  "Transport & Travel",
  "Education & Training",
  "Professional Services",
  "Home & Garden",
  "Technology & Electronics"
];

const COMMON_TAGS = [
  "happy-hour", "lunch", "dinner", "family", "students", "weekend", 
  "early-bird", "late-night", "takeaway", "dine-in", "group-deal"
];

const DAYS_OF_WEEK = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

export default function ComprehensiveOfferCreator({ onClose, editingOffer }: { onClose?: () => void; editingOffer?: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("core");

  // Fetch loyalty program to get available tiers
  const { data: loyaltyProgram } = useQuery({
    queryKey: ["/api/loyalty/program"],
    queryFn: () => apiRequest("GET", "/api/loyalty/program").then(res => res.json())
  });
  
  // Image cropper state
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropper, setShowCropper] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(editingOffer?.imageUrl || null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  console.log('ComprehensiveOfferCreator: editingOffer type:', editingOffer?.type);
  
  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    mode: "onSubmit",
    defaultValues: editingOffer ? {
      title: editingOffer.title || "",
      description: editingOffer.description || "",
      type: editingOffer.offerType || editingOffer.type || "percentage_discount",
      percentOff: editingOffer.percentOff || undefined,
      fixedPrice: editingOffer.fixedPrice || undefined,
      originalValue: editingOffer.originalValue || undefined,
      category: editingOffer.category || "",
      tags: Array.isArray(editingOffer.tags) ? editingOffer.tags : (editingOffer.tags ? JSON.parse(editingOffer.tags) : []),
      audience: editingOffer.audience || "both",
      eligibleTiers: Array.isArray(editingOffer.eligibleTiers) ? editingOffer.eligibleTiers : (editingOffer.eligibleTiers ? JSON.parse(editingOffer.eligibleTiers) : []),
      minBasket: editingOffer.minBasket || undefined,
      maxDiscount: editingOffer.maxDiscount || undefined,
      stackable: editingOffer.stackable || false,
      newCustomerOnly: editingOffer.newCustomerOnly || false,
      geofenceRadius: editingOffer.geofenceRadius || undefined,
      validFrom: editingOffer.validFrom ? editingOffer.validFrom.split('T')[0] : new Date().toISOString().split('T')[0],
      validTo: editingOffer.validTo ? editingOffer.validTo.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      daysOfWeek: Array.isArray(editingOffer.daysOfWeek) ? editingOffer.daysOfWeek : (editingOffer.daysOfWeek ? JSON.parse(editingOffer.daysOfWeek) : []),
      timeSlots: typeof editingOffer.timeSlots === 'string' ? editingOffer.timeSlots : JSON.stringify(editingOffer.timeSlots || {}),
      blackoutDates: Array.isArray(editingOffer.blackoutDates) ? editingOffer.blackoutDates : (editingOffer.blackoutDates ? JSON.parse(editingOffer.blackoutDates) : []),
      leadTime: editingOffer.leadTime || 0,
      maxPerTransaction: editingOffer.maxPerTransaction || 1,
      maxPerDay: editingOffer.maxPerDay || undefined,
      maxPerWeek: editingOffer.maxPerWeek || undefined,
      maxLifetime: editingOffer.maxLifetime || undefined,
      globalUsageLimit: editingOffer.globalUsageLimit || undefined,
      voucherTimeoutHours: editingOffer.voucherTimeoutHours || 24,
      staffPinRequired: editingOffer.staffPinRequired || false,
      proofType: editingOffer.proofType || "qr_only",
      terms: editingOffer.terms || "",
      dineInOnly: editingOffer.dineInOnly || false,
      excludesAlcohol: editingOffer.excludesAlcohol || false,
      serviceChargeIncluded: editingOffer.serviceChargeIncluded !== false,
      validOnBankHolidays: editingOffer.validOnBankHolidays !== false,
      imageUrl: editingOffer.imageUrl || "",
      shortPromo: editingOffer.shortPromo || "",
      priority: editingOffer.priority || "standard",
      feeModel: editingOffer.feeModel || "default",
      customFee: editingOffer.customFee || undefined,
      budgetCap: editingOffer.budgetCap || undefined,
      autoPauseOnAbuse: editingOffer.autoPauseOnAbuse !== false,
      deviceFingerprinting: editingOffer.deviceFingerprinting !== false,
    } : {
      title: "",
      description: "",
      type: "percentage_discount",
      audience: "both",
      eligibleTiers: [],
      stackable: false,
      newCustomerOnly: false,
      daysOfWeek: [],
      timeSlots: "{}",
      blackoutDates: [],
      leadTime: 0,
      maxPerTransaction: 1,
      voucherTimeoutHours: 24,
      staffPinRequired: false,
      proofType: "qr_only",
      dineInOnly: false,
      excludesAlcohol: false,
      serviceChargeIncluded: true,
      validOnBankHolidays: true,
      priority: "standard",
      feeModel: "default",
      autoPauseOnAbuse: true,
      deviceFingerprinting: true,
      tags: [],
      validFrom: "",
      validTo: "",
    },
  });

  const { fields: blackoutFields, append: addBlackout, remove: removeBlackout } = useFieldArray({
    control: form.control,
    name: "blackoutDates",
  });

  // Image upload and cropping functions
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setScale(1); // Reset scale
        setRotation(0); // Reset rotation
        setShowCropper(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const cropImage = async () => {
    if (!completedCrop || !imgSrc) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.onload = async () => {
      // Get the actual displayed image element
      const imgElement = document.querySelector('.ReactCrop__crop-image img') as HTMLImageElement;
      if (!imgElement) {
        toast({ title: "Error", description: "Could not find image element", variant: "destructive" });
        return;
      }

      // Get the natural image dimensions
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;
      
      // Get the displayed dimensions (before any CSS transforms)
      const displayedWidth = imgElement.naturalWidth || imgElement.offsetWidth;
      const displayedHeight = imgElement.naturalHeight || imgElement.offsetHeight;
      
      // Calculate scale factors for coordinate conversion
      // We need to account for the CSS scale transform applied to the image
      const imageScaleFactor = scale; // The zoom level set by user
      const coordinateScaleX = naturalWidth / (displayedWidth * imageScaleFactor);
      const coordinateScaleY = naturalHeight / (displayedHeight * imageScaleFactor);

      // Output size for the cropped image (reasonable size)
      const outputWidth = 400; // Fixed output width
      const outputHeight = Math.round(outputWidth * (9/16)); // Maintain 16:9 aspect ratio

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      // Calculate source coordinates on the original image
      // The crop coordinates are relative to the scaled/displayed image
      const sourceX = completedCrop.x * coordinateScaleX;
      const sourceY = completedCrop.y * coordinateScaleY;
      const sourceWidth = completedCrop.width * coordinateScaleX;
      const sourceHeight = completedCrop.height * coordinateScaleY;

      // Apply rotation if needed
      if (rotation !== 0) {
        ctx.save();
        ctx.translate(outputWidth / 2, outputHeight / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-outputWidth / 2, -outputHeight / 2);
      }

      // Draw the cropped portion
      ctx.drawImage(
        image,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(sourceWidth, naturalWidth - sourceX),
        Math.min(sourceHeight, naturalHeight - sourceY),
        0,
        0,
        outputWidth,
        outputHeight
      );

      if (rotation !== 0) {
        ctx.restore();
      }

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result as string;
              form.setValue('imageUrl', base64);
              setImagePreview(base64);
              setShowCropper(false);
              setImgSrc('');
              toast({ title: "Success", description: "Image cropped and uploaded successfully" });
            };
            reader.readAsDataURL(blob);
          } catch (error) {
            console.error('Crop error:', error);
            toast({ title: "Error", description: "Failed to process image", variant: "destructive" });
          }
        }
      }, 'image/jpeg', 0.9);
    };
    image.src = imgSrc;
  };

  const createOfferMutation = useMutation({
    mutationFn: (data: OfferFormData) => {
      console.log('Mutation: About to send offer data:', JSON.stringify(data, null, 2));
      if (editingOffer) {
        return apiRequest("PUT", `/api/offers/${editingOffer.id}`, data);
      } else {
        return apiRequest("POST", "/api/offers", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers/my-offers"] });
      toast({ title: editingOffer ? "Offer updated successfully!" : "Offer created successfully!" });
      onClose?.();
    },
    onError: (error: any) => {
      toast({
        title: editingOffer ? "Error updating offer" : "Error creating offer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OfferFormData) => {
    console.log('Form submitted with data:', data);
    
    // Parse and convert timeSlots format
    let timeSlots = typeof data.timeSlots === 'string' ? JSON.parse(data.timeSlots || '{}') : data.timeSlots;
    
    // Convert from {day: {startTime, endTime}} to {day: [{start, end}]} format
    const convertedTimeSlots: Record<string, Array<{start: string, end: string}>> = {};
    
    Object.entries(timeSlots).forEach(([day, slot]) => {
      if (slot && typeof slot === 'object') {
        const typedSlot = slot as any;
        if (typedSlot.startTime && typedSlot.endTime) {
          convertedTimeSlots[day] = [{
            start: typedSlot.startTime,
            end: typedSlot.endTime
          }];
        }
      }
    });
    
    const processedData = {
      ...data,
      timeSlots: convertedTimeSlots,
      // Ensure other array fields are properly formatted
      tags: Array.isArray(data.tags) ? data.tags : [],
      daysOfWeek: Array.isArray(data.daysOfWeek) ? data.daysOfWeek : [],
      blackoutDates: Array.isArray(data.blackoutDates) ? data.blackoutDates : []
    };
    
    console.log('Processed data:', processedData);
    createOfferMutation.mutate(processedData);
  };

  const onError = (errors: any) => {
    console.log('Form validation errors:', errors);
    
    // Show toast for validation errors
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const firstError = errors[errorFields[0]];
      toast({
        title: "Form validation failed",
        description: firstError?.message || `Please check the ${errorFields[0]} field`,
        variant: "destructive",
      });
    }
  };

  const sections = [
    { id: "core", label: "Core & Pricing", icon: PoundSterling },
    { id: "eligibility", label: "Eligibility", icon: Users },
    { id: "scheduling", label: "Scheduling", icon: Calendar },
    { id: "limits", label: "Limits & Rules", icon: Shield },
    { id: "terms", label: "Terms", icon: Settings },
    { id: "media", label: "Media", icon: ImageIcon },
    { id: "controls", label: "Controls", icon: BarChart3 },
  ];

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-6 space-y-4 sm:space-y-6">
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-slate-100 text-xl">
            <Plus className="w-5 h-5 text-blue-400" />
            <span>{editingOffer ? "Edit Comprehensive Offer" : "Create Comprehensive Offer"}</span>
          </CardTitle>
          <CardDescription className="text-slate-400 text-lg">
            {editingOffer ? "Update your comprehensive offer with advanced targeting, scheduling, and controls" : "Build a complete offer with advanced targeting, scheduling, and controls"}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-900/50 border-slate-700 sticky top-6">
            <CardBody className="p-4">
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <Button
                      key={section.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full justify-start ${
                        activeSection === section.id
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                          : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      <span className="text-lg">{section.label}</span>
                    </Button>
                  );
                })}
              </nav>
            </CardBody>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
              
              {/* A) Core & Pricing Section */}
              {activeSection === "core" && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center text-xl">
                      <PoundSterling className="w-5 h-5 mr-2 text-blue-400" />
                      Core & Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-lg">Offer Title</FormLabel>
                          <FormControl>
                            <Input {...field} className="input-dark" placeholder="e.g., 20% off all pizzas" />
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
                          <FormLabel className="text-slate-200 text-lg">Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="input-dark" placeholder="Detailed offer description..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Mandatory Discount Value Field */}
                    <FormField
                      control={form.control}
                      name="percentOff"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-xl font-bold">Discount Value (£) *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              step="0.01"
                              className="input-dark text-xl font-semibold border-2 border-yellow-500"
                              placeholder="200.00"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <div className="text-sm text-slate-400 mt-2">
                            <strong className="text-yellow-400">Enter the savings amount customers receive:</strong>
                            <ul className="mt-2 ml-4 list-disc text-xs">
                              <li><strong>BOGOF:</strong> Value of the free item (e.g., £15 for free main course)</li>
                              <li><strong>Free item:</strong> Cost of the free item (e.g., £8 for free champagne)</li>
                              <li><strong>Percentage off:</strong> Average discount amount (e.g., £5 off £25 meal)</li>
                              <li><strong>Fixed price:</strong> Savings amount (original price - bundle price)</li>
                            </ul>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Offer Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="input-dark">
                                  <SelectValue placeholder="Select offer type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage_discount">Percentage Discount</SelectItem>
                                <SelectItem value="fixed_amount_discount">Fixed Amount Discount</SelectItem>
                                <SelectItem value="fixed_price_bundle">Fixed Price / Bundle Deal</SelectItem>
                                <SelectItem value="free_item_with_purchase">Free Item with Purchase</SelectItem>
                                <SelectItem value="bogo">BOGOF (Buy One, Get One Free)</SelectItem>
                                <SelectItem value="day_time_specific">Day/Time-Specific Offers</SelectItem>
                                <SelectItem value="limited_redemptions">Limited Redemptions Offer</SelectItem>
                                <SelectItem value="loyalty_reward">Loyalty Reward Offer</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="input-dark">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CATEGORIES.map((category) => (
                                  <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>


                    {/* Dynamic fields based on offer type */}
                    {form.watch("type") === "percentage_discount" && (
                      <FormField
                        control={form.control}
                        name="percentOff"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Percentage Off (%)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                max="100"
                                className="input-dark"
                                placeholder="e.g., 20"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch("type") === "fixed_amount_discount" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fixedPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200 text-lg">Discount Amount (£)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input-dark"
                                  placeholder="e.g., 5"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="minBasket"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200 text-lg">Minimum Spend (£)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input-dark"
                                  placeholder="e.g., 25"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {form.watch("type") === "fixed_price_bundle" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fixedPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200 text-lg">Offer Value (£)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input-dark"
                                  placeholder="e.g., 399"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
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
                              <FormLabel className="text-slate-200 text-lg">Original Value (£)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input-dark"
                                  placeholder="e.g., 599"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {(form.watch("type") === "free_item_with_purchase" || 
                      form.watch("type") === "bogo" || 
                      form.watch("type") === "loyalty_reward") && (
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">
                              {form.watch("type") === "free_item_with_purchase" && "Free Item Details"}
                              {form.watch("type") === "bogo" && "BOGOF Details"}
                              {form.watch("type") === "loyalty_reward" && "Loyalty Program Details"}
                            </FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                className="input-dark" 
                                placeholder={
                                  form.watch("type") === "free_item_with_purchase" ? "e.g., Free dessert with any main course" :
                                  form.watch("type") === "bogo" ? "e.g., Buy one pizza, get one free" :
                                  "e.g., Buy 5 coffees, get 1 free"
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch("type") === "limited_redemptions" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="globalUsageLimit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200 text-lg">Total Redemptions Limit</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="1"
                                  className="input-dark"
                                  placeholder="e.g., 50"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="maxPerDay"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200 text-lg">Per Person Daily Limit</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="1"
                                  className="input-dark"
                                  placeholder="e.g., 1"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {/* B) Eligibility Section */}
              {activeSection === "eligibility" && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center text-xl">
                      <Users className="w-5 h-5 mr-2 text-blue-400" />
                      Eligibility & Targeting
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="audience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Target Audience</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="input-dark">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="resident">Residents Only</SelectItem>
                                <SelectItem value="student">Students Only</SelectItem>
                                <SelectItem value="both">Both Residents & Students</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minBasket"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Minimum Basket (£)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                step="0.01"
                                className="input-dark"
                                placeholder="0.00"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Loyalty Tier Targeting */}
                    <FormField
                      control={form.control}
                      name="eligibleTiers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-lg">Target Loyalty Tiers (Optional)</FormLabel>
                          <FormDescription className="text-slate-400">
                            Select which loyalty tiers can access this offer. Leave empty to make available to all customers.
                          </FormDescription>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(loyaltyProgram?.tiers || []).map((tierData: any) => {
                              const tier = tierData.name;
                              return (
                                <Badge
                                key={tier}
                                variant={field.value.includes(tier) ? "default" : "outline"}
                                className={`cursor-pointer transition-colors ${
                                  field.value.includes(tier) 
                                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                                onClick={() => {
                                  const newTiers = field.value.includes(tier)
                                    ? field.value.filter(t => t !== tier)
                                    : [...field.value, tier];
                                  field.onChange(newTiers);
                                }}
                              >
                                {tier} Tier
                              </Badge>
                              );
                            })}
                          </div>
                          {field.value.length > 0 && (
                            <p className="text-sm text-slate-400 mt-2">
                              Only {field.value.join(", ")} tier members can access this offer
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxDiscount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Maximum Discount (£)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                step="0.01"
                                className="input-dark"
                                placeholder="No limit"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="geofenceRadius"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Geofence Radius (meters)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                className="input-dark"
                                placeholder="No geofence"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="stackable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200 text-lg">Stackable with other offers</FormLabel>
                              <FormDescription className="text-slate-400 text-lg">
                                Allow this offer to be combined with others
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="newCustomerOnly"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200 text-lg">New customers only</FormLabel>
                              <FormDescription className="text-slate-400 text-lg">
                                Only for first-time customers
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* C) Scheduling Section */}
              {activeSection === "scheduling" && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center text-xl">
                      <Calendar className="w-5 h-5 mr-2 text-red-500" />
                      Scheduling & Availability
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="validFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Valid From</FormLabel>
                            <div className="space-y-2">
                              <FormControl>
                                <Input
                                  {...field}
                                  type="datetime-local"
                                  className="input-dark text-slate-200"
                                />
                              </FormControl>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                                  onClick={() => {
                                    const now = new Date();
                                    const formatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    field.onChange(formatted);
                                  }}
                                >
                                  Today
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                                  onClick={() => {
                                    const now = new Date();
                                    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                                    const formatted = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    field.onChange(formatted);
                                  }}
                                >
                                  Tomorrow
                                </Button>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="validTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Valid Until</FormLabel>
                            <div className="space-y-2">
                              <FormControl>
                                <Input
                                  {...field}
                                  type="datetime-local"
                                  className="input-dark text-slate-200"
                                />
                              </FormControl>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                                  onClick={() => {
                                    const now = new Date();
                                    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                                    const formatted = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    field.onChange(formatted);
                                  }}
                                >
                                  Tomorrow
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                                  onClick={() => {
                                    const now = new Date();
                                    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                                    const formatted = new Date(oneWeek.getTime() - oneWeek.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    field.onChange(formatted);
                                  }}
                                >
                                  1 Week
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                                  onClick={() => {
                                    const now = new Date();
                                    const oneMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes());
                                    const formatted = new Date(oneMonth.getTime() - oneMonth.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    field.onChange(formatted);
                                  }}
                                >
                                  1 Month
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                                  onClick={() => {
                                    const now = new Date();
                                    const oneYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
                                    const formatted = new Date(oneYear.getTime() - oneYear.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    field.onChange(formatted);
                                  }}
                                >
                                  1 Year
                                </Button>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Enhanced Daily Scheduling with Hours */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-slate-200 text-lg">Daily Scheduling</FormLabel>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Apply all day to every day
                              const newTimeSlots = {};
                              DAYS_OF_WEEK.forEach(day => {
                                newTimeSlots[day.value] = { allDay: true, startTime: "00:00", endTime: "23:59" };
                              });
                              form.setValue("timeSlots", JSON.stringify(newTimeSlots));
                              form.setValue("daysOfWeek", DAYS_OF_WEEK.map(d => d.value));
                            }}
                            className="border-slate-600 text-black hover:bg-slate-700"
                          >
                            Every Day (All Day)
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {DAYS_OF_WEEK.map((day) => {
                          const timeSlots = form.watch("timeSlots");
                          let daySlots = {};
                          try {
                            daySlots = timeSlots ? JSON.parse(timeSlots)[day.value] || {} : {};
                          } catch (e) {
                            daySlots = {};
                          }
                          
                          const isDayEnabled = form.watch("daysOfWeek")?.includes(day.value);
                          
                          return (
                            <div key={day.value} className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <FormField
                                    control={form.control}
                                    name="daysOfWeek"
                                    render={({ field }) => (
                                      <FormControl>
                                        <input
                                          type="checkbox"
                                          checked={field.value?.includes(day.value) || false}
                                          onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            const newDays = isChecked
                                              ? [...(field.value || []), day.value]
                                              : field.value?.filter(d => d !== day.value) || [];
                                            field.onChange(newDays);
                                            
                                            if (!isChecked) {
                                              // Remove time slots for this day when unchecked
                                              const currentSlots = form.getValues("timeSlots");
                                              let slots = {};
                                              try {
                                                slots = currentSlots ? JSON.parse(currentSlots) : {};
                                              } catch (e) {
                                                slots = {};
                                              }
                                              delete slots[day.value];
                                              form.setValue("timeSlots", JSON.stringify(slots));
                                            }
                                          }}
                                          className="rounded border-slate-600 bg-slate-800"
                                        />
                                      </FormControl>
                                    )}
                                  />
                                  <span className="text-slate-200 font-medium">{day.label}</span>
                                </div>
                                
                                {isDayEnabled && (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={daySlots.allDay || false}
                                      onChange={(e) => {
                                        const currentSlots = form.getValues("timeSlots");
                                        let slots = {};
                                        try {
                                          slots = currentSlots ? JSON.parse(currentSlots) : {};
                                        } catch (e) {
                                          slots = {};
                                        }
                                        
                                        slots[day.value] = {
                                          ...slots[day.value],
                                          allDay: e.target.checked,
                                          startTime: e.target.checked ? "00:00" : (slots[day.value]?.startTime || "09:00"),
                                          endTime: e.target.checked ? "23:59" : (slots[day.value]?.endTime || "17:00")
                                        };
                                        form.setValue("timeSlots", JSON.stringify(slots));
                                      }}
                                      className="rounded border-slate-600 bg-slate-800"
                                    />
                                    <span className="text-sm text-slate-300">All Day</span>
                                  </div>
                                )}
                              </div>

                              {isDayEnabled && !daySlots.allDay && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm text-slate-300 block mb-1">Start Time</label>
                                    <input
                                      type="time"
                                      step="600"
                                      value={daySlots.startTime || "09:00"}
                                      onChange={(e) => {
                                        const currentSlots = form.getValues("timeSlots");
                                        let slots = {};
                                        try {
                                          slots = currentSlots ? JSON.parse(currentSlots) : {};
                                        } catch (e) {
                                          slots = {};
                                        }
                                        
                                        slots[day.value] = {
                                          ...slots[day.value],
                                          startTime: e.target.value
                                        };
                                        form.setValue("timeSlots", JSON.stringify(slots));
                                      }}
                                      className="w-full px-3 py-2 text-black bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm text-slate-300 block mb-1">End Time</label>
                                    <input
                                      type="time"
                                      step="600"
                                      value={daySlots.endTime || "17:00"}
                                      onChange={(e) => {
                                        const currentSlots = form.getValues("timeSlots");
                                        let slots = {};
                                        try {
                                          slots = currentSlots ? JSON.parse(currentSlots) : {};
                                        } catch (e) {
                                          slots = {};
                                        }
                                        
                                        slots[day.value] = {
                                          ...slots[day.value],
                                          endTime: e.target.value
                                        };
                                        form.setValue("timeSlots", JSON.stringify(slots));
                                      }}
                                      className="w-full px-3 py-2 text-black bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                              )}

                              {isDayEnabled && daySlots.allDay && (
                                <div className="text-sm text-slate-400 italic">
                                  Available 24/7 on {day.label}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="leadTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-lg">Advance Booking Required (hours)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              className="input-dark"
                              placeholder="0"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription className="text-slate-400 text-lg">
                            How many hours in advance must this offer be booked?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-slate-200 text-lg">Blackout Periods</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addBlackout({ name: "", startDate: "", endDate: "", recurring: false })}
                          className="border-slate-600 text-black"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Blackout
                        </Button>
                      </div>
                      {blackoutFields.map((field, index) => (
                        <div key={field.id} className="p-3 border border-slate-700 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 text-sm">Blackout Period {index + 1}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeBlackout(index)}
                              className="border-red-600 text-red-400 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FormField
                              control={form.control}
                              name={`blackoutDates.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., Christmas" className="input-dark" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`blackoutDates.${index}.startDate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input {...field} type="date" className="input-dark" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`blackoutDates.${index}.endDate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input {...field} type="date" className="input-dark" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* D) Limits & Rules Section */}
              {activeSection === "limits" && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center text-xl">
                      <Shield className="w-5 h-5 mr-2 text-blue-400" />
                      Limits & Rules
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxPerTransaction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Max per Transaction</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                className="input-dark"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxPerDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Max per Day</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                className="input-dark"
                                placeholder="No limit"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxPerWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Max per Week</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                className="input-dark"
                                placeholder="No limit"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxLifetime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Max per User (Lifetime)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                className="input-dark"
                                placeholder="1 (single use)"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription className="text-slate-400 text-sm">
                              How many times each user can redeem this offer (e.g., 1 for staycation offers)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="globalUsageLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Total Vouchers Available</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                className="input-dark"
                                placeholder="Unlimited"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription className="text-slate-400 text-sm">
                              Total number of vouchers available across all users (leave empty for unlimited)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="voucherTimeoutHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Booking Required Within (Hours)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                max="168"
                                className="input-dark"
                                placeholder="24"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription className="text-slate-400 text-sm">
                              Customers must make a booking/reservation within this timeframe after claiming voucher (1-168 hours)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="proofType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-lg">Proof Required</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="input-dark">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="qr_only">QR Code Only</SelectItem>
                                <SelectItem value="code_pin">Code + PIN</SelectItem>
                                <SelectItem value="app_checkin">App Check-in</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="staffPinRequired"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200 text-lg">Staff PIN Required</FormLabel>
                              <FormDescription className="text-slate-400 text-lg">
                                Require staff verification
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="deviceFingerprinting"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200 text-lg">Device Fingerprinting</FormLabel>
                              <FormDescription className="text-slate-400 text-lg">
                                Prevent multi-device abuse
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* E) Terms Section */}
              {activeSection === "terms" && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center text-xl">
                      <Settings className="w-5 h-5 mr-2 text-blue-400" />
                      Terms & Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <FormField
                      control={form.control}
                      name="terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-lg">Terms & Conditions</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              className="input-dark min-h-[100px]"
                              placeholder="Enter detailed terms and conditions..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dineInOnly"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200 text-lg">Dine-in Only</FormLabel>
                              <FormDescription className="text-slate-400 text-lg">
                                Not valid for takeaway orders
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="excludesAlcohol"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200 text-lg">Excludes Alcohol</FormLabel>
                              <FormDescription className="text-slate-400 text-lg">
                                Alcohol not included in offer
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="serviceChargeIncluded"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200 text-lg">Service Charge Included</FormLabel>
                              <FormDescription className="text-slate-400 text-lg">
                                Service charge applies to final bill
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="validOnBankHolidays"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200 text-lg">Valid on Bank Holidays</FormLabel>
                              <FormDescription className="text-slate-400 text-lg">
                                Offer available on bank holidays
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* F) Media Section */}
              {activeSection === "media" && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center text-xl">
                      <ImageIcon className="w-5 h-5 mr-2 text-blue-400" />
                      Media & Presentation
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div>
                      <FormLabel className="text-slate-200 text-base">Offer Image</FormLabel>
                      <div className="mt-2">
                        {imagePreview ? (
                          <div className="space-y-4">
                            <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-slate-700">
                              <img
                                src={imagePreview}
                                alt="Offer preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setImagePreview(null);
                                form.setValue('imageUrl', '');
                              }}
                              className="bg-red-100 text-black border-red-300 hover:bg-red-200"
                            >
                              Remove Image
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full max-w-md h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-2 text-slate-400" />
                              <p className="text-sm text-slate-400">
                                <span className="font-semibold">Click to upload</span> an offer image
                              </p>
                              <p className="text-xs text-slate-500">16:9 aspect ratio recommended</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-2">
                        Upload an image to represent this offer (will be cropped to 16:9 ratio)
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="shortPromo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-lg">Short Promo Text (90 chars max)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="input-dark" 
                              placeholder="e.g., Perfect for date night!"
                              maxLength={90}
                            />
                          </FormControl>
                          <FormDescription className="text-slate-400 text-lg">
                            {field.value?.length || 0}/90 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-lg">Display Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="input-dark">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="featured">Featured (higher visibility)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-slate-400 text-lg">
                            Featured offers appear more prominently in listings
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <FormLabel className="text-slate-200 text-base">Tags</FormLabel>
                      <div className="flex flex-wrap gap-2 mt-2 p-3 border border-slate-700 rounded-lg">
                        {COMMON_TAGS.map((tag) => (
                          <Button
                            key={tag}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentTags = form.getValues("tags") || [];
                              if (currentTags.includes(tag)) {
                                form.setValue("tags", currentTags.filter(t => t !== tag));
                              } else {
                                form.setValue("tags", [...currentTags, tag]);
                              }
                            }}
                            className={`text-sm ${
                              form.watch("tags")?.includes(tag)
                                ? "bg-blue-600 border-blue-500 text-white"
                                : "border-slate-600 text-black bg-white hover:bg-gray-100"
                            }`}
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Button>
                        ))}
                      </div>
                      <p className="text-slate-400 text-sm mt-2">
                        Selected: {form.watch("tags")?.join(", ") || "None"}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* G) Controls Section */}
              {activeSection === "controls" && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center text-xl">
                      <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                      Budget & Controls
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <FormField
                      control={form.control}
                      name="budgetCap"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-lg">Budget Cap (£)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              step="0.01"
                              className="input-dark"
                              placeholder="No budget limit"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription className="text-slate-400 text-lg">
                            Set the maximum total amount you're willing to spend on processing fees for this promotion. 
                            The offer will automatically pause when this budget is reached to prevent overspending.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="autoPauseOnAbuse"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-slate-200 text-lg">Auto-pause on Abuse Detection</FormLabel>
                            <FormDescription className="text-slate-400 text-lg">
                              Automatically pause if suspicious activity is detected
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardBody>
                </Card>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                {onClose && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="bg-red-100 text-black border-red-300 hover:bg-red-200"
                  >
                    <span className="text-lg">Cancel</span>
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={createOfferMutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <span className="text-lg">{createOfferMutation.isPending ? (editingOffer ? "Updating..." : "Creating...") : (editingOffer ? "Update Offer" : "Create Offer")}</span>
                </Button>
              </div>

              {/* Image Cropper Modal */}
              {showCropper && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-slate-900 p-6 rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
                    <h3 className="text-lg font-semibold mb-4 text-slate-200">Crop Offer Image</h3>
                    <div className="space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          <label className="text-slate-200 text-sm font-medium">Zoom:</label>
                          <input
                            type="range"
                            min="0.1"
                            max="3"
                            step="0.1"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-slate-300 text-sm w-12">{scale.toFixed(1)}x</span>
                        </div>
                        
                        <div className="max-w-full overflow-auto border-2 border-slate-600 rounded-lg">
                          <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={16 / 9}
                            className="ReactCrop__crop-image"
                          >
                            <img
                              src={imgSrc}
                              style={{ 
                                transform: `scale(${scale}) rotate(${rotation}deg)`,
                                transformOrigin: 'center',
                                display: 'block',
                                maxWidth: 'none'
                              }}
                              onLoad={(e) => {
                                const { width, height } = e.currentTarget;
                                setCrop({
                                  unit: '%',
                                  width: 80,
                                  height: 80 * (9 / 16),
                                  x: 10,
                                  y: 10,
                                });
                              }}
                            />
                          </ReactCrop>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setScale(Math.max(0.1, scale - 0.1))}
                              className="border-slate-600 text-black bg-white hover:bg-gray-100"
                            >
                              Zoom Out
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setScale(Math.min(3, scale + 0.1))}
                              className="border-slate-600 text-black bg-white hover:bg-gray-100"
                            >
                              Zoom In
                            </Button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setRotation(rotation - 90)}
                              className="border-slate-600 text-black bg-white hover:bg-gray-100"
                            >
                              Rotate Left
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setRotation(rotation + 90)}
                              className="border-slate-600 text-black bg-white hover:bg-gray-100"
                            >
                              Rotate Right
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowCropper(false);
                            setImgSrc('');
                          }}
                          className="bg-red-100 text-black border-red-300 hover:bg-red-200"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={cropImage}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        >
                          Crop & Upload
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}