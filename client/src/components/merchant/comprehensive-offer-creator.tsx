import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  DollarSign,
  Settings,
  Shield,
  BarChart3,
  Image as ImageIcon,
  Tag
} from "lucide-react";

// Comprehensive offer schema based on requirements
const offerSchema = z.object({
  // A) Core & pricing
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  type: z.enum(["percentage_discount", "fixed_amount_discount", "fixed_price_bundle", "free_item_with_purchase", "bogo", "day_time_specific", "limited_redemptions", "loyalty_reward"]),
  percentOff: z.number().min(1).max(100).optional(),
  fixedPrice: z.number().min(0).optional(),
  originalValue: z.number().min(0).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),

  // B) Visibility & eligibility
  audience: z.enum(["resident", "student", "both"]).default("both"),
  minBasket: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  stackable: z.boolean().default(false),
  newCustomerOnly: z.boolean().default(false),
  geofenceRadius: z.number().min(0).optional(),

  // C) Scheduling
  validFrom: z.string(),
  validTo: z.string(),
  daysOfWeek: z.array(z.string()).default([]),
  timeSlots: z.record(z.array(z.object({
    start: z.string(),
    end: z.string()
  }))).default({}),
  blackoutDates: z.array(z.object({
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    recurring: z.boolean().default(false)
  })).default([]),
  leadTime: z.number().min(0).default(0),

  // D) Redemption rules & limits
  maxPerTransaction: z.number().min(1).default(1),
  maxPerDay: z.number().min(1).optional(),
  maxPerWeek: z.number().min(1).optional(),
  maxLifetime: z.number().min(1).optional(),
  globalUsageLimit: z.number().min(1).optional(),
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
  feeModel: z.enum(["default", "per_redemption", "percent_discount"]).default("default"),
  customFee: z.number().min(0).optional(),
  budgetCap: z.number().min(0).optional(),
  autoPauseOnAbuse: z.boolean().default(true),

  // H) Fraud & safety
  singleUse: z.boolean().default(true),
  deviceFingerprinting: z.boolean().default(true),
  
  // I) Meal periods for Food & Drink
  mealPeriods: z.array(z.string()).optional(),
});

type OfferFormData = z.infer<typeof offerSchema>;

const CATEGORIES = [
  "Food & Drink",
  "Retail",
  "Services", 
  "Entertainment",
  "Health & Beauty",
  "Sports & Fitness"
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

  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    mode: "onSubmit",
    defaultValues: editingOffer ? {
      title: editingOffer.title || "",
      description: editingOffer.description || "",
      type: editingOffer.type || "percentage_discount",
      percentOff: editingOffer.percentOff || undefined,
      fixedPrice: editingOffer.fixedPrice || undefined,
      originalValue: editingOffer.originalValue || undefined,
      category: editingOffer.category || "",
      tags: Array.isArray(editingOffer.tags) ? editingOffer.tags : (editingOffer.tags ? JSON.parse(editingOffer.tags) : []),
      audience: editingOffer.audience || "both",
      minBasket: editingOffer.minBasket || undefined,
      maxDiscount: editingOffer.maxDiscount || undefined,
      stackable: editingOffer.stackable || false,
      newCustomerOnly: editingOffer.newCustomerOnly || false,
      geofenceRadius: editingOffer.geofenceRadius || undefined,
      validFrom: editingOffer.validFrom ? editingOffer.validFrom.split('T')[0] : new Date().toISOString().split('T')[0],
      validTo: editingOffer.validTo ? editingOffer.validTo.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      daysOfWeek: Array.isArray(editingOffer.daysOfWeek) ? editingOffer.daysOfWeek : (editingOffer.daysOfWeek ? JSON.parse(editingOffer.daysOfWeek) : []),
      timeSlots: typeof editingOffer.timeSlots === 'object' ? editingOffer.timeSlots : (editingOffer.timeSlots ? JSON.parse(editingOffer.timeSlots) : {}),
      blackoutDates: Array.isArray(editingOffer.blackoutDates) ? editingOffer.blackoutDates : (editingOffer.blackoutDates ? JSON.parse(editingOffer.blackoutDates) : []),
      leadTime: editingOffer.leadTime || 0,
      maxPerTransaction: editingOffer.maxPerTransaction || 1,
      maxPerDay: editingOffer.maxPerDay || undefined,
      maxPerWeek: editingOffer.maxPerWeek || undefined,
      maxLifetime: editingOffer.maxLifetime || undefined,
      globalUsageLimit: editingOffer.globalUsageLimit || undefined,
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
      singleUse: editingOffer.singleUse !== false,
      deviceFingerprinting: editingOffer.deviceFingerprinting !== false,
      mealPeriods: Array.isArray(editingOffer.mealPeriods) ? editingOffer.mealPeriods : (editingOffer.mealPeriods ? JSON.parse(editingOffer.mealPeriods) : []),
    } : {
      title: "",
      description: "",
      type: "percentage_discount",
      audience: "both",
      stackable: false,
      newCustomerOnly: false,
      daysOfWeek: [],
      timeSlots: {},
      blackoutDates: [],
      leadTime: 0,
      maxPerTransaction: 1,
      staffPinRequired: false,
      proofType: "qr_only",
      dineInOnly: false,
      excludesAlcohol: false,
      serviceChargeIncluded: true,
      validOnBankHolidays: true,
      priority: "standard",
      feeModel: "default",
      autoPauseOnAbuse: true,
      singleUse: true,
      deviceFingerprinting: true,
      tags: [],
      validFrom: "",
      validTo: "",
      mealPeriods: [],
    },
  });

  const { fields: blackoutFields, append: addBlackout, remove: removeBlackout } = useFieldArray({
    control: form.control,
    name: "blackoutDates",
  });

  const createOfferMutation = useMutation({
    mutationFn: (data: OfferFormData) => {
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
    createOfferMutation.mutate(data);
  };

  const sections = [
    { id: "core", label: "Core & Pricing", icon: DollarSign },
    { id: "eligibility", label: "Eligibility", icon: Users },
    { id: "scheduling", label: "Scheduling", icon: Calendar },
    { id: "limits", label: "Limits & Rules", icon: Shield },
    { id: "terms", label: "Terms", icon: Settings },
    { id: "media", label: "Media", icon: ImageIcon },
    { id: "controls", label: "Controls", icon: BarChart3 },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-slate-100">
            <Plus className="w-5 h-5 text-blue-400" />
            <span>{editingOffer ? "Edit Comprehensive Offer" : "Create Comprehensive Offer"}</span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            {editingOffer ? "Update your comprehensive offer with advanced targeting, scheduling, and controls" : "Build a complete offer with advanced targeting, scheduling, and controls"}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                      {section.label}
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* A) Core & Pricing Section */}
              {activeSection === "core" && (
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-blue-400" />
                      Core & Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 text-base">Offer Title</FormLabel>
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
                          <FormLabel className="text-slate-200 text-base">Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="input-dark" placeholder="Detailed offer description..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 text-base">Offer Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="input-dark">
                                  <SelectValue />
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
                            <FormLabel className="text-slate-200 text-base">Category</FormLabel>
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

                    {/* Meal Period Selection for Food & Drink */}
                    {form.watch("category") === "Food & Drink" && (
                      <FormField
                        control={form.control}
                        name="mealPeriods"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Meal Periods</FormLabel>
                            <FormDescription className="text-slate-400">
                              Select which meal periods this offer applies to
                            </FormDescription>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: "breakfast", label: "Breakfast (6:00-11:30)" },
                                { id: "lunch", label: "Lunch (11:30-17:00)" },
                                { id: "dinner", label: "Dinner (17:00-22:00)" },
                                { id: "late_night", label: "Late Night (22:00-6:00)" }
                              ].map((period) => (
                                <div key={period.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={period.id}
                                    checked={field.value?.includes(period.id)}
                                    onChange={(e) => {
                                      const currentPeriods = field.value || [];
                                      if (e.target.checked) {
                                        field.onChange([...currentPeriods, period.id]);
                                      } else {
                                        field.onChange(currentPeriods.filter((p: string) => p !== period.id));
                                      }
                                    }}
                                    className="rounded border-slate-600 bg-slate-800"
                                  />
                                  <label htmlFor={period.id} className="text-sm text-slate-300">
                                    {period.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Dynamic fields based on offer type */}
                    {form.watch("type") === "percentage_discount" && (
                      <FormField
                        control={form.control}
                        name="percentOff"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Percentage Off (%)</FormLabel>
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
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fixedPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200">Discount Amount (£)</FormLabel>
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
                              <FormLabel className="text-slate-200">Minimum Spend (£)</FormLabel>
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
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fixedPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200">Bundle Price (£)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input-dark"
                                  placeholder="e.g., 15"
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
                              <FormLabel className="text-slate-200">Original Value (£)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="input-dark"
                                  placeholder="e.g., 22"
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
                            <FormLabel className="text-slate-200">
                              {form.watch("type") === "free_item_with_purchase" && "Free Item Details"}
                              {form.watch("type") === "bogo" && "BOGO Details"}
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
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="globalUsageLimit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200">Total Redemptions Limit</FormLabel>
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
                              <FormLabel className="text-slate-200">Per Person Daily Limit</FormLabel>
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
                    <CardTitle className="text-slate-100 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-blue-400" />
                      Eligibility & Targeting
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="audience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Target Audience</FormLabel>
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
                            <FormLabel className="text-slate-200">Minimum Basket (£)</FormLabel>
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxDiscount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Maximum Discount (£)</FormLabel>
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
                            <FormLabel className="text-slate-200">Geofence Radius (meters)</FormLabel>
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="stackable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200">Stackable with other offers</FormLabel>
                              <FormDescription className="text-slate-400 text-base">
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
                              <FormLabel className="text-slate-200">New customers only</FormLabel>
                              <FormDescription className="text-slate-400 text-base">
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
                    <CardTitle className="text-slate-100 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-blue-400" />
                      Scheduling & Availability
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="validFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Valid From</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="datetime-local"
                                className="input-dark"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="validTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Valid Until</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="datetime-local"
                                className="input-dark"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="daysOfWeek"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Days of Week</FormLabel>
                          <div className="grid grid-cols-4 gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <FormField
                                key={day.value}
                                control={form.control}
                                name="daysOfWeek"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={day.value}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <input
                                          type="checkbox"
                                          checked={field.value?.includes(day.value)}
                                          onChange={(checked) => {
                                            return checked.target.checked
                                              ? field.onChange([...field.value, day.value])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== day.value
                                                  )
                                                )
                                          }}
                                          className="rounded border-slate-600 bg-slate-800"
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm text-slate-300">
                                        {day.label}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="leadTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Advance Booking Required (hours)</FormLabel>
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
                          <FormDescription className="text-slate-400">
                            How many hours in advance must this offer be booked?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-slate-200">Blackout Periods</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addBlackout({ name: "", startDate: "", endDate: "", recurring: false })}
                          className="border-slate-600 text-slate-300"
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
                          <div className="grid grid-cols-3 gap-3">
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
                    <CardTitle className="text-slate-100 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-blue-400" />
                      Limits & Rules
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxPerTransaction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Max per Transaction</FormLabel>
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
                            <FormLabel className="text-slate-200">Max per Day</FormLabel>
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxPerWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Max per Week</FormLabel>
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
                        name="globalUsageLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Total Usage Limit</FormLabel>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="proofType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Proof Required</FormLabel>
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
                              <FormLabel className="text-slate-200">Staff PIN Required</FormLabel>
                              <FormDescription className="text-slate-400 text-base">
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="singleUse"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200">Single Use Only</FormLabel>
                              <FormDescription className="text-slate-400 text-base">
                                Each voucher can only be used once
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
                        name="deviceFingerprinting"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200">Device Fingerprinting</FormLabel>
                              <FormDescription className="text-slate-400 text-base">
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
                    <CardTitle className="text-slate-100 flex items-center">
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
                          <FormLabel className="text-slate-200">Terms & Conditions</FormLabel>
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dineInOnly"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200">Dine-in Only</FormLabel>
                              <FormDescription className="text-slate-400 text-base">
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
                              <FormLabel className="text-slate-200">Excludes Alcohol</FormLabel>
                              <FormDescription className="text-slate-400 text-base">
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="serviceChargeIncluded"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-slate-200">Service Charge Included</FormLabel>
                              <FormDescription className="text-slate-400 text-base">
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
                              <FormLabel className="text-slate-200">Valid on Bank Holidays</FormLabel>
                              <FormDescription className="text-slate-400 text-base">
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
                    <CardTitle className="text-slate-100 flex items-center">
                      <ImageIcon className="w-5 h-5 mr-2 text-blue-400" />
                      Media & Presentation
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Offer Image</FormLabel>
                          <FormControl>
                            <Input {...field} className="input-dark" placeholder="https://..." />
                          </FormControl>
                          <FormDescription className="text-slate-400">
                            URL to an image that represents this offer
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shortPromo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Short Promo Text (90 chars max)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="input-dark" 
                              placeholder="e.g., Perfect for date night!"
                              maxLength={90}
                            />
                          </FormControl>
                          <FormDescription className="text-slate-400">
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
                          <FormLabel className="text-slate-200">Display Priority</FormLabel>
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
                          <FormDescription className="text-slate-400">
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
                    <CardTitle className="text-slate-100 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                      Budget & Controls
                    </CardTitle>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="feeModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Fee Model</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="input-dark">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="default">Platform Default</SelectItem>
                                <SelectItem value="per_redemption">Per Redemption</SelectItem>
                                <SelectItem value="percent_discount">% of Discount</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("feeModel") !== "default" && (
                        <FormField
                          control={form.control}
                          name="customFee"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200">
                                Custom Fee ({form.watch("feeModel") === "per_redemption" ? "£ per redemption" : "% of discount"})
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  step={form.watch("feeModel") === "per_redemption" ? "0.01" : "1"}
                                  className="input-dark"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="budgetCap"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Budget Cap (£)</FormLabel>
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
                          <FormDescription className="text-slate-400 text-base">
                            Automatically pause offer when budget is reached
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
                            <FormLabel className="text-slate-200">Auto-pause on Abuse Detection</FormLabel>
                            <FormDescription className="text-slate-400 text-base">
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
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={createOfferMutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {createOfferMutation.isPending ? (editingOffer ? "Updating..." : "Creating...") : (editingOffer ? "Update Offer" : "Create Offer")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}