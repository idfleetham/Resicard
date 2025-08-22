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
  type: z.enum(["percent", "fixed", "set_menu", "bogo"]),
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

export default function ComprehensiveOfferCreator({ onClose }: { onClose?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("core");

  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      type: "percent",
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
    },
  });

  const { fields: blackoutFields, append: addBlackout, remove: removeBlackout } = useFieldArray({
    control: form.control,
    name: "blackoutDates",
  });

  const createOfferMutation = useMutation({
    mutationFn: (data: OfferFormData) => apiRequest("POST", "/api/offers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      toast({ title: "Offer created successfully!" });
      onClose?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating offer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OfferFormData) => {
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
            <span>Create Comprehensive Offer</span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Build a complete offer with advanced targeting, scheduling, and controls
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
                          <FormLabel className="text-slate-200">Offer Title</FormLabel>
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
                          <FormLabel className="text-slate-200">Description</FormLabel>
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
                            <FormLabel className="text-slate-200">Offer Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="input-dark">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percent">Percentage Off</SelectItem>
                                <SelectItem value="fixed">Fixed Price</SelectItem>
                                <SelectItem value="set_menu">Set Menu</SelectItem>
                                <SelectItem value="bogo">Buy One Get One</SelectItem>
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
                            <FormLabel className="text-slate-200">Category</FormLabel>
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

                    {form.watch("type") === "percent" && (
                      <FormField
                        control={form.control}
                        name="percentOff"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Percentage Off</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                max="100"
                                className="input-dark"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch("type") === "fixed" && (
                      <FormField
                        control={form.control}
                        name="fixedPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Fixed Price (£)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                step="0.01"
                                className="input-dark"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
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
                  {createOfferMutation.isPending ? "Creating..." : "Create Offer"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}