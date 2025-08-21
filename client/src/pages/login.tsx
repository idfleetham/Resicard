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
    <div data-theme="dim" className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 text-brand1 hover:opacity-80">
            <MapPin className="h-8 w-8" />
            <span className="text-2xl font-bold text-fg">Resicard</span>
          </Link>
          <p className="text-soft mt-2">St Andrews Community</p>
        </div>

        {/* Login Form */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-center text-fg">Welcome Back</CardTitle>
          </CardHeader>
          <CardBody>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-fg">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="your@email.com"
                          className="bg-surface border-dim text-fg placeholder:text-soft"
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
                      <FormLabel className="text-fg">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="bg-surface border-dim text-fg placeholder:text-soft"
                            {...field} 
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-soft hover:text-fg"
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
                  className="w-full"
                  style={{ 
                    backgroundColor: `rgb(var(--brand-1))`, 
                    color: 'white',
                    border: 'none'
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-soft">
                Don't have an account?{' '}
                <Link href="/register" className="text-brand1 hover:underline font-medium">
                  Sign up here
                </Link>
              </p>
            </div>

            {/* Demo accounts */}
            <div className="mt-6 p-4 bg-surface/50 border border-dim rounded-lg">
              <p className="text-sm font-medium text-fg mb-2">Demo Accounts:</p>
              <div className="space-y-1 text-xs text-soft">
                <p>Admin: admin@localperks.com / admin123</p>
                <p>Use the registration form to create resident or merchant accounts</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="text-center">
          <Link href="/" className="text-sm text-soft hover:text-brand1">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
