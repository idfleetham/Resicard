import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Shield, Eye, EyeOff, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const adminSignupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  adminSecret: z.string().min(1, "Admin secret is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AdminSignupFormData = z.infer<typeof adminSignupSchema>;

export default function AdminSignup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminSecret, setShowAdminSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<AdminSignupFormData>({
    resolver: zodResolver(adminSignupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      adminSecret: "",
    },
  });

  const onSubmit = async (data: AdminSignupFormData) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/register-admin', {
        username: data.username,
        email: data.email,
        password: data.password,
        adminSecret: data.adminSecret,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store token and redirect to login
        localStorage.setItem('auth_token', result.token);
        
        toast({
          title: "Admin Account Created",
          description: "Welcome to LocalPerks administration. Redirecting to dashboard...",
        });
        
        setTimeout(() => {
          setLocation('/admin');
        }, 1500);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create admin account');
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create admin account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 text-primary hover:opacity-80">
            <MapPin className="h-8 w-8" />
            <span className="text-2xl font-bold">LocalPerks</span>
          </Link>
          <p className="text-muted-foreground mt-2">Administrator Registration</p>
        </div>

        {/* Admin Signup Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center space-x-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <span>Create Admin Account</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Admin Registration:</strong> This form is for creating platform administrator accounts. 
                You'll need the admin secret key to proceed.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="admin_username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            {...field} 
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adminSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Secret Key</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showAdminSecret ? "text" : "password"}
                            placeholder="Enter admin secret key"
                            {...field} 
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowAdminSecret(!showAdminSecret)}
                          >
                            {showAdminSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Contact the platform owner for the admin secret key
                      </p>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Create Admin Account'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>

            {/* Admin Secret Info */}
            <div className="mt-6 p-4 bg-slate-100 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">For Development:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Admin Secret: <code className="bg-white px-1 rounded">localperks-admin-2024</code></p>
                <p className="text-amber-600">Remove this in production!</p>
              </div>
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