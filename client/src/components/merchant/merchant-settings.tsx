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
  const { user } = useAuth();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">Manage your merchant account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            <Button
              variant={activeTab === "business" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("business")}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Business Details
            </Button>
            <Button
              variant={activeTab === "hours" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("hours")}
            >
              <Clock className="w-4 h-4 mr-2" />
              Business Hours
            </Button>
            <Button
              variant={activeTab === "logo" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("logo")}
            >
              <Camera className="w-4 h-4 mr-2" />
              Logo & Branding
            </Button>
            <Button
              variant={activeTab === "api" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("api")}
            >
              <Key className="w-4 h-4 mr-2" />
              API Access
            </Button>
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-2">
          {activeTab === "business" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Business Details</span>
                </CardTitle>
                <CardDescription>
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
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Business Name" {...field} />
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
                    <Button type="submit" disabled={updateBusinessMutation.isPending}>
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
          )}

          {activeTab === "hours" && (
            <Card>
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
        </div>
      </div>
    </div>
  );
}