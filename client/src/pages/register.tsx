import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Eye, EyeOff, Home, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { validatePostcode } from "@/lib/utils";

const baseSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const residentSchema = baseSchema.extend({
  role: z.literal("resident"),
  postcode: z.string().min(1, "Postcode is required")
    .refine(validatePostcode, "Postcode must be within 10 miles of St Andrews"),
});

const merchantSchema = baseSchema.extend({
  role: z.literal("merchant"),
  businessName: z.string().min(1, "Business name is required"),
  businessCategory: z.string().min(1, "Business category is required"),
  businessAddress: z.string().min(1, "Business address is required"),
  businessPhone: z.string().min(1, "Business phone is required"),
});

type ResidentFormData = z.infer<typeof residentSchema>;
type MerchantFormData = z.infer<typeof merchantSchema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearch();
  const initialRole = new URLSearchParams(searchParams).get('role') || 'resident';
  const [activeTab, setActiveTab] = useState(initialRole);
  const { register, isLoading } = useAuth();
  const { toast } = useToast();

  const residentForm = useForm<ResidentFormData>({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "resident",
      postcode: "",
    },
  });

  const merchantForm = useForm<MerchantFormData>({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "merchant",
      businessName: "",
      businessCategory: "",
      businessAddress: "",
      businessPhone: "",
    },
  });

  const onResidentSubmit = async (data: ResidentFormData) => {
    try {
      await register(data);
      toast({
        title: "Welcome to LocalPerks!",
        description: "Your resident account has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  const onMerchantSubmit = async (data: MerchantFormData) => {
    try {
      await register(data);
      toast({
        title: "Business Application Submitted!",
        description: "Your application is pending admin approval. You'll be notified once verified.",
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 text-primary hover:opacity-80">
            <MapPin className="h-8 w-8" />
            <span className="text-2xl font-bold">Resicard</span>
          </Link>
          <p className="text-muted-foreground mt-2">Join the St Andrews Community</p>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Create Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="resident" className="flex items-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span>Local Resident</span>
                </TabsTrigger>
                <TabsTrigger value="merchant" className="flex items-center space-x-2">
                  <Store className="h-4 w-4" />
                  <span>Business Owner</span>
                </TabsTrigger>
              </TabsList>

              {/* Resident Registration */}
              <TabsContent value="resident" className="space-y-4 mt-6">
                <div className="bg-coastal-bg p-4 rounded-lg border coastal-border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Resident Membership:</strong> Verify your local status with a valid postcode 
                    within 10 miles of St Andrews. Annual membership fee applies.
                  </p>
                </div>

                <Form {...residentForm}>
                  <form onSubmit={residentForm.handleSubmit(onResidentSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={residentForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={residentForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={residentForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a secure password"
                                {...field} 
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={residentForm.control}
                      name="postcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postcode</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="KY16 9SS" 
                              {...field} 
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            Must be within 10 miles of St Andrews
                          </p>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full coastal-gradient"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Resident Account'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Merchant Registration */}
              <TabsContent value="merchant" className="space-y-4 mt-6">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>Business Application:</strong> Your application will be reviewed by our admin team. 
                    You'll be notified once your business is verified and approved.
                  </p>
                </div>

                <Form {...merchantForm}>
                  <form onSubmit={merchantForm.handleSubmit(onMerchantSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={merchantForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="businessowner" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={merchantForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="business@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={merchantForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a secure password"
                                {...field} 
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={merchantForm.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Name</FormLabel>
                            <FormControl>
                              <Input placeholder="The Seafood Ristorante" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={merchantForm.control}
                        name="businessCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Category</FormLabel>
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
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={merchantForm.control}
                      name="businessAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="123 Market Street, St Andrews, KY16 9XX"
                              className="h-20"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={merchantForm.control}
                      name="businessPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="01334 123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-slate-600 hover:bg-slate-700"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Submitting Application...' : 'Submit Business Application'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
