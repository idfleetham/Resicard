import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import heroImage from "@assets/IMG_5180_1749763959712.jpeg";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", data);
      
      setIsSubmitted(true);
      toast({
        title: "Reset link sent",
        description: "If an account with that email exists, we've sent you a password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

          {/* Form Card */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
            <CardHeader className="bg-white text-slate-900">
              <CardTitle className="text-center !text-slate-900 text-2xl font-bold">
                {isSubmitted ? "Check Your Email" : "Reset Password"}
              </CardTitle>
            </CardHeader>
            <CardBody>
              {isSubmitted ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Mail className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="space-y-2">
                    <p className="!text-slate-900 font-medium">
                      We've sent a password reset link to your email address.
                    </p>
                    <p className="text-sm !text-slate-700">
                      Didn't receive the email? Check your spam folder or try again.
                    </p>
                  </div>
                  <div className="space-y-3 pt-4">
                    <Button
                      onClick={() => {
                        setIsSubmitted(false);
                        form.reset();
                      }}
                      variant="outline"
                      className="w-full"
                      data-testid="button-try-again"
                    >
                      Try Another Email
                    </Button>
                    <Link href="/login">
                      <Button variant="ghost" className="w-full" data-testid="button-back-login">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Login
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-slate-700">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                  </div>

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
                                className="h-11 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                {...field}
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                        disabled={isLoading}
                        data-testid="button-send-reset"
                      >
                        {isLoading ? "Sending..." : "Send Reset Link"}
                      </Button>
                    </form>
                  </Form>

                  <div className="text-center pt-4">
                    <Link href="/login">
                      <Button variant="ghost" className="text-slate-600 hover:text-slate-900" data-testid="link-back-login">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Login
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}