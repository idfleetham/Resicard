import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@assets/IMG_5180_1749763959712.jpeg";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { login, isLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    }
  };

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

          {/* Login Form */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-center text-slate-900 text-2xl">Welcome Back</CardTitle>
            </CardHeader>
            <CardBody>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-900 font-semibold">Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="your@email.com"
                            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-900 font-semibold">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
                              {...field} 
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
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

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  <Link href="/forgot-password" className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold" data-testid="link-forgot-password">
                    Forgot your password?
                  </Link>
                </p>
                <p className="text-sm text-slate-600">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold">
                    Sign up here
                  </Link>
                </p>
              </div>

              {/* Demo accounts */}
              <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm font-semibold text-slate-900 mb-2">Demo Accounts:</p>
                <div className="space-y-1 text-xs text-slate-600">
                  <p>Admin: admin@localperks.com / admin123</p>
                  <p>Use the registration form to create resident or merchant accounts</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="text-center">
            <Link href="/" className="text-sm text-white/70 hover:text-white">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
