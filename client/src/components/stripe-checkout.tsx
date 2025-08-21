import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CreditCard, Lock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StripeCheckoutProps {
  subscriptionType: string;
  subscriptionPlan: string;
  price: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StripeCheckout({ 
  subscriptionType, 
  subscriptionPlan, 
  price, 
  onSuccess, 
  onCancel 
}: StripeCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleCheckout = async () => {
    setIsProcessing(true);
    
    try {
      // Stripe integration placeholder
      // When STRIPE_PUBLIC_KEY is available, this will initialize Stripe Elements
      const stripeEnabled = !!import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      
      if (!stripeEnabled) {
        // Placeholder for when Stripe is not configured
        toast({
          title: "Stripe Not Configured",
          description: "Payment processing is not yet configured. This is a preview of the checkout flow.",
          variant: "destructive",
        });
        
        // Simulate processing delay for demo
        setTimeout(() => {
          setIsProcessing(false);
          toast({
            title: "Demo Mode",
            description: "In demo mode, subscription would be activated without payment.",
          });
          onSuccess();
        }, 2000);
        
        return;
      }

      // Real Stripe integration would go here
      // const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
      // const response = await fetch('/api/stripe/create-checkout-session', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ subscriptionType, subscriptionPlan, price })
      // });
      // const session = await response.json();
      // await stripe.redirectToCheckout({ sessionId: session.id });
      
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Failed",
        description: error.message || "Unable to process payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Your Subscription
        </CardTitle>
        <CardDescription>
          Secure payment processing powered by Stripe
        </CardDescription>
      </CardHeader>
      
      <CardBody className="space-y-6">
        {/* Order Summary */}
        <div className="space-y-4">
          <h3 className="font-medium">Order Summary</h3>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium capitalize">
                {subscriptionType} Plan
              </span>
              <Badge variant="secondary" className="capitalize">
                {subscriptionPlan}
              </Badge>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total</span>
              <span>{formatPrice(price)}</span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Billed {subscriptionPlan === 'monthly' ? 'monthly' : 'annually'}
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Secure Payment</p>
            <p>Your payment information is encrypted and secure</p>
          </div>
        </div>

        {/* Stripe Configuration Warning */}
        {!import.meta.env.VITE_STRIPE_PUBLIC_KEY && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Demo Mode</p>
              <p>Stripe is not configured. This is a preview of the checkout experience.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={handleCheckout}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            <Lock className="h-4 w-4 mr-2" />
            {isProcessing ? "Processing..." : `Pay ${formatPrice(price)}`}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full"
          >
            Cancel
          </Button>
        </div>

        {/* Terms */}
        <p className="text-xs text-muted-foreground text-center">
          By completing your purchase, you agree to our terms of service. 
          You can cancel your subscription at any time from your account settings.
        </p>
      </CardBody>
    </Card>
  );
}