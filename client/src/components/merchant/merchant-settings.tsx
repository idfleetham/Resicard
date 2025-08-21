import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Globe, 
  Clock, 
  Key, 
  Upload, 
  Copy, 
  RefreshCw,
  Save,
  Camera,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import { z } from "zod";
import { motion } from "framer-motion";

const businessDetailsSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  description: z.string().optional(),
});

const businessHoursSchema = z.object({
  monday: z.string(),
  tuesday: z.string(),
  wednesday: z.string(),
  thursday: z.string(),
  friday: z.string(),
  saturday: z.string(),
  sunday: z.string(),
});

type BusinessDetailsData = z.infer<typeof businessDetailsSchema>;
type BusinessHoursData = z.infer<typeof businessHoursSchema>;

export default function MerchantSettings() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("business");
  const [apiKey] = useState("sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const businessForm = useForm<BusinessDetailsData>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      name: user?.businessName || "",
      email: user?.email || "",
      phone: user?.businessPhone || "",
      address: user?.businessAddress || "",
      description: "",
    },
  });

  const hoursForm = useForm<BusinessHoursData>({
    resolver: zodResolver(businessHoursSchema),
    defaultValues: {
      monday: "9:00 AM - 6:00 PM",
      tuesday: "9:00 AM - 6:00 PM",
      wednesday: "9:00 AM - 6:00 PM",
      thursday: "9:00 AM - 6:00 PM",
      friday: "9:00 AM - 8:00 PM",
      saturday: "10:00 AM - 6:00 PM",
      sunday: "Closed",
    },
  });

  const updateBusinessMutation = useMutation({
    mutationFn: (data: BusinessDetailsData) =>
      apiRequest("PUT", `/api/merchants/${user!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Business details updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating business details",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateHoursMutation = useMutation({
    mutationFn: (data: BusinessHoursData) =>
      apiRequest("PUT", `/api/merchants/${user!.id}/hours`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants", user!.id] });
      toast({ title: "Business hours updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating business hours",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateApiKeyMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/merchants/${user!.id}/regenerate-api-key`),
    onSuccess: () => {
      toast({ title: "API key regenerated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error regenerating API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onBusinessSubmit = (data: BusinessDetailsData) => {
    updateBusinessMutation.mutate(data);
  };

  const onHoursSubmit = (data: BusinessHoursData) => {
    updateHoursMutation.mutate(data);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
        toast({ title: "Logo uploaded (preview only)" });
      };
      reader.readAsDataURL(file);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({ title: "API key copied to clipboard" });
  };

  const regenerateApiKey = () => {
    if (confirm("Are you sure you want to regenerate your API key? This will invalidate the current key.")) {
      regenerateApiKeyMutation.mutate();
    }
  };

  // Handle loading and authentication states
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className="h-96 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-slate-900/50 border-slate-700 p-8 text-center">
          <CardContent>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Authentication Required</h3>
            <p className="text-slate-400 mb-4">Please log in to access merchant settings.</p>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== 'merchant') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-slate-900/50 border-slate-700 p-8 text-center">
          <CardContent>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Access Denied</h3>
            <p className="text-slate-400 mb-4">This page is only accessible to merchant accounts.</p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
            >
              Go to Home
            </Button>
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
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-100">Settings</CardTitle>
              <CardDescription className="text-slate-400">
                Manage your merchant account settings and preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <nav className="space-y-2">
                <Button
                  variant={activeTab === "business" ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 ${
                    activeTab === "business" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("business")}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Business Details
                </Button>
                <Button
                  variant={activeTab === "hours" ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 ${
                    activeTab === "hours" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("hours")}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Business Hours
                </Button>
                <Button
                  variant={activeTab === "logo" ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 ${
                    activeTab === "logo" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("logo")}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Logo & Branding
                </Button>
                <Button
                  variant={activeTab === "api" ? "default" : "ghost"}
                  className={`w-full justify-start transition-all duration-200 ${
                    activeTab === "api" 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("api")}
                >
                  <Key className="w-4 h-4 mr-2" />
                  API Access
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-2">
          {activeTab === "business" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-slate-900/50 border-slate-700 hover:shadow-xl hover:border-slate-600 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <span>Business Details</span>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Update your business information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...businessForm}>
                  <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)} className="space-y-4">
                    <FormField
                      control={businessForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Business Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Business Name" {...field} className="bg-slate-800 border-slate-700 text-slate-100" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={businessForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <Input className="pl-10" type="email" placeholder="business@example.com" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={businessForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <Input className="pl-10" type="tel" placeholder="+44 1334 123456" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={businessForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                              <Textarea 
                                className="pl-10" 
                                placeholder="123 Market Street, St Andrews, KY16 9AB"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={businessForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell customers about your business..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={updateBusinessMutation.isPending}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                    >
                      {updateBusinessMutation.isPending ? (
                        <>
                          <Save className="w-4 h-4 mr-2 animate-pulse" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            </motion.div>
          )}

          {activeTab === "hours" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-slate-900/50 border-slate-700 hover:shadow-xl hover:border-slate-600 transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Business Hours</span>
                </CardTitle>
                <CardDescription>
                  Set your operating hours for customer reference
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...hoursForm}>
                  <form onSubmit={hoursForm.handleSubmit(onHoursSubmit)} className="space-y-4">
                    {Object.entries(hoursForm.getValues()).map(([day, hours]) => (
                      <FormField
                        key={day}
                        control={hoursForm.control}
                        name={day as keyof BusinessHoursData}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="capitalize">{day}</FormLabel>
                            <FormControl>
                              <Input placeholder="9:00 AM - 6:00 PM or 'Closed'" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                    <Button type="submit" disabled={updateHoursMutation.isPending}>
                      {updateHoursMutation.isPending ? (
                        <>
                          <Save className="w-4 h-4 mr-2 animate-pulse" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Hours
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            </motion.div>
          )}

          {activeTab === "logo" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="w-5 h-5" />
                  <span>Logo & Branding</span>
                </CardTitle>
                <CardDescription>
                  Upload your business logo and manage branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Current Logo</h4>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain rounded-lg" />
                      ) : (
                        <Camera className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload">
                        <Button asChild>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Logo
                          </span>
                        </Button>
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        Recommended: Square image, max 2MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Camera className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Logo Upload Placeholder</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Logo upload functionality is a placeholder in this demo. In a full implementation, 
                    this would integrate with cloud storage for secure file uploads.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "api" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>API Access</span>
                </CardTitle>
                <CardDescription>
                  Manage your API key for integrations and third-party access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">API Key</h4>
                  <div className="flex items-center space-x-2">
                    <Input 
                      readOnly
                      type="password"
                      value={apiKey}
                      className="font-mono"
                    />
                    <Button variant="outline" onClick={copyApiKey}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" onClick={regenerateApiKey} disabled={regenerateApiKeyMutation.isPending}>
                      {regenerateApiKeyMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Keep your API key secret. It provides full access to your merchant account.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">API Documentation</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium mb-2">Available Endpoints</h5>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li><code className="bg-white px-2 py-1 rounded">GET /api/offers</code> - List your offers</li>
                      <li><code className="bg-white px-2 py-1 rounded">POST /api/offers</code> - Create new offer</li>
                      <li><code className="bg-white px-2 py-1 rounded">GET /api/redemptions</code> - List redemptions</li>
                      <li><code className="bg-white px-2 py-1 rounded">POST /api/redemptions/redeem</code> - Process redemption</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Integration Status</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">No Active Integrations</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Connect third-party applications using your API key to automate offer management and redemption processing.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "hours" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-slate-900/50 border-slate-700 hover:shadow-xl hover:border-slate-600 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <Clock className="w-5 h-5 text-green-400" />
                    <span>Business Hours</span>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Set your operating hours for customer reference
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...hoursForm}>
                    <form onSubmit={hoursForm.handleSubmit(onHoursSubmit)} className="space-y-4">
                      {Object.entries(hoursForm.getValues()).map(([day, hours]) => (
                        <FormField
                          key={day}
                          control={hoursForm.control}
                          name={day as keyof BusinessHoursData}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="capitalize text-slate-200">{day}</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="9:00 AM - 6:00 PM or 'Closed'" 
                                  {...field} 
                                  className="bg-slate-800 border-slate-700 text-slate-100"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                      <Button 
                        type="submit" 
                        disabled={updateHoursMutation.isPending}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                      >
                        {updateHoursMutation.isPending ? "Saving..." : "Save Hours"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "logo" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-slate-900/50 border-slate-700 hover:shadow-xl hover:border-slate-600 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <Camera className="w-5 h-5 text-purple-400" />
                    <span>Logo & Branding</span>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Upload your business logo and customize branding
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-200">Business Logo</h4>
                    <div className="flex items-start space-x-4">
                      <div className="w-24 h-24 bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <Camera className="w-8 h-8 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-md cursor-pointer transition-all duration-200"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </label>
                        <p className="text-sm text-slate-400 mt-2">
                          Upload a square image (recommended: 400x400px, max 2MB)
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "api" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-slate-900/50 border-slate-700 hover:shadow-xl hover:border-slate-600 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <Key className="w-5 h-5 text-yellow-400" />
                    <span>API Access</span>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Manage API keys for third-party integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-200">API Key</h4>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={apiKey}
                        readOnly
                        className="font-mono text-sm bg-slate-800 border-slate-700 text-slate-300"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyApiKey}
                        className="border-slate-700 hover:bg-slate-800 text-slate-300"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={regenerateApiKey}
                        disabled={regenerateApiKeyMutation.isPending}
                        className="border-slate-700 hover:bg-slate-800 text-slate-300"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Keep your API key secret. It provides full access to your merchant account.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-200">API Documentation</h4>
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <h5 className="font-medium mb-2 text-slate-200">Available Endpoints</h5>
                      <ul className="space-y-1 text-sm text-slate-400">
                        <li><code className="bg-slate-700 px-2 py-1 rounded text-slate-300">GET /api/offers</code> - List your offers</li>
                        <li><code className="bg-slate-700 px-2 py-1 rounded text-slate-300">POST /api/offers</code> - Create new offer</li>
                        <li><code className="bg-slate-700 px-2 py-1 rounded text-slate-300">GET /api/redemptions</code> - List redemptions</li>
                        <li><code className="bg-slate-700 px-2 py-1 rounded text-slate-300">POST /api/redemptions/redeem</code> - Process redemption</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-200">Integration Status</h4>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-slate-700 text-slate-300 border-slate-600">No Active Integrations</Badge>
                    </div>
                    <p className="text-sm text-slate-400">
                      Connect third-party applications using your API key to automate offer management and redemption processing.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}