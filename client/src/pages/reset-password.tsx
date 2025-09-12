import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import heroImage from "@assets/IMG_5180_1749763959712.jpeg";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [token, setToken] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Extract token from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    setToken(tokenParam);
    setIsChecked(true);
    
    if (!tokenParam) {
      toast({
        title: "Invalid Reset Link",
        description: "The password reset link is invalid or has expired.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast({
        title: "Invalid Token",
        description: "The password reset token is missing or invalid.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });
      
      setIsSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You can now log in with your new password.",
      });
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "The reset link is invalid or has expired.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking for token
  if (!isChecked) {
    return (
      <div className="min-h-screen relative">
        {/* Background Image */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'grayscale(100%) contrast(1.1) brightness(1.2)',
          }}
        />
        <div className="absolute inset-0 bg-black/30"></div>
        
        {/* Content */}
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center">
              <Link href="/" className="inline-flex items-center space-x-2 hover:opacity-80">
                <MapPin className="h-8 w-8 text-white" />
                <span className="text-3xl font-bold text-white">Resicard</span>
              </Link>
              <p className="text-white/90 text-lg mt-2">St Andrews Community</p>
            </div>
            <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl mt-6">
              <CardBody>
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="text-slate-600 mt-4">Validating reset link...</p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if no token
  if (!token) {
    return (
      <div className="min-h-screen relative">
        {/* Background Image */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'grayscale(100%) contrast(1.1) brightness(1.2)',
          }}
        />
        <div className="absolute inset-0 bg-black/30"></div>
        
        {/* Content */}
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            {/* Header */}
            <div className="text-center">
              <Link href="/" className="inline-flex items-center space-x-2 hover:opacity-80">
                <MapPin className="h-8 w-8 text-white" />
                <span className="text-3xl font-bold text-white">Resicard</span>
              </Link>
              <p className="text-white/90 text-lg mt-2">St Andrews Community</p>
            </div>

            {/* Error Card */}
            <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
              <CardHeader className="bg-white">
                <CardTitle className="text-center text-slate-900 text-2xl font-bold">Invalid Reset Link</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="text-center space-y-4">
                  <p className="text-slate-700">
                    This password reset link is invalid or has expired.
                  </p>
                  <p className="text-sm text-slate-500">
                    Reset links are valid for 30 minutes. Please request a new one.
                  </p>
                  <div className="space-y-3 pt-4">
                    <Link href="/forgot-password">
                      <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700" data-testid="button-new-reset">
                        Request New Reset Link
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button variant="ghost" className="w-full" data-testid="button-back-login">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Login
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'grayscale(100%) contrast(1.1) brightness(1.2)',
        }}
      />
      <div className="absolute inset-0 bg-black/30"></div>
      
      {/* Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center space-x-2 hover:opacity-80">
              <MapPin className="h-8 w-8 text-white" />
              <span className="text-3xl font-bold text-white">Resicard</span>
            </Link>
            <p className="text-white/90 text-lg mt-2">St Andrews Community</p>
          </div>

          {/* Form Card */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
            <CardHeader className="bg-white">
              <CardTitle className="text-center text-slate-900 text-2xl font-bold">
                {isSuccess ? "Password Updated" : "Set New Password"}
              </CardTitle>
            </CardHeader>
            <CardBody>
              {isSuccess ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-slate-700">
                      Your password has been successfully updated.
                    </p>
                    <p className="text-sm text-slate-500">
                      You can now log in with your new password.
                    </p>
                  </div>
                  <div className="pt-4">
                    <Link href="/login">
                      <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700" data-testid="button-login-now">
                        Log In Now
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-slate-700">
                      Enter your new password below.
                    </p>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-900 font-semibold">New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter new password"
                                  className="h-11 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                                  {...field}
                                  data-testid="input-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                  data-testid="button-toggle-password"
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
                            <FormLabel className="text-slate-900 font-semibold">Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm new password"
                                  className="h-11 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                                  {...field}
                                  data-testid="input-confirm-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                  data-testid="button-toggle-confirm-password"
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                        disabled={isLoading}
                        data-testid="button-reset-password"
                      >
                        {isLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </form>
                  </Form>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}