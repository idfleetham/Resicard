import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Calendar, CreditCard, Users, User, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequestWithAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import StripeCheckout from "@/components/stripe-checkout";

interface SubscriptionManagementProps {
  subscription: any;
  plans: any;
  onSubscriptionChange: () => void;
}

export default function SubscriptionManagement({ 
  subscription, 
  plans, 
  onSubscriptionChange 
}: SubscriptionManagementProps) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create/Change subscription mutation
  const changeSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionType, subscriptionPlan }: { subscriptionType: string; subscriptionPlan: string }) => {
      const response = await apiRequestWithAuth('POST', '/api/subscription/change', {
        subscriptionType,
        subscriptionPlan,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Updated",
        description: data.message || "Your subscription has been updated successfully.",
      });
      onSubscriptionChange();
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
    },
    onError: (error: any) => {
      if (error.message?.includes('Authentication expired')) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Subscription Update Failed",
        description: error.message || "Unable to update subscription",
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequestWithAuth('POST', '/api/subscription/cancel');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Cancelled",
        description: data.message || "Your subscription has been cancelled.",
      });
      setShowCancelDialog(false);
      onSubscriptionChange();
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
    },
    onError: (error: any) => {
      if (error.message?.includes('Authentication expired')) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Cancellation Failed",
        description: error.message || "Unable to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const handleSubscriptionChange = () => {
    if (!selectedType || !selectedPlan) {
      toast({
        title: "Selection Required",
        description: "Please select both subscription type and plan",
        variant: "destructive",
      });
      return;
    }

    // Show checkout dialog for payment processing
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    changeSubscriptionMutation.mutate({
      subscriptionType: selectedType,
      subscriptionPlan: selectedPlan,
    });
  };

  const handleCancelSubscription = () => {
    cancelSubscriptionMutation.mutate();
  };

  const isCurrentPlan = (type: string, plan: string) => {
    return subscription?.type === type && subscription?.plan === plan;
  };

  const getPlanPrice = (type: string, plan: string) => {
    return plans?.[type]?.[plan]?.price || 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'inactive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
              <Badge className={getStatusColor(subscription.status)}>
                {subscription.status || 'inactive'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Type</p>
                <p className="text-lg flex items-center gap-2">
                  {subscription.type === 'family' ? (
                    <><Users className="h-4 w-4" /> Family</>
                  ) : (
                    <><User className="h-4 w-4" /> Individual</>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Plan</p>
                <p className="text-lg capitalize">{subscription.plan}</p>
              </div>
            </div>
            
            {subscription.expiresAt && (
              <div>
                <p className="text-sm font-medium">Next Billing Date</p>
                <p className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(subscription.expiresAt)}
                </p>
              </div>
            )}

            {subscription.status === 'active' && (
              <div className="flex gap-2 pt-2">
                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Subscription</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to cancel your subscription? You'll lose access to creating vouchers when your current billing period ends.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowCancelDialog(false)}
                      >
                        Keep Subscription
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleCancelSubscription}
                        disabled={cancelSubscriptionMutation.isPending}
                      >
                        {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Change Subscription</CardTitle>
          <CardDescription>
            Select a new subscription type and plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subscription Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Subscription Type</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select subscription type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Individual
                  </div>
                </SelectItem>
                <SelectItem value="family">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Family (up to 4 members)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plan Selection */}
          {selectedType && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Billing Plan</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans?.[selectedType] && Object.entries(plans[selectedType]).map(([planKey, planData]: [string, any]) => (
                  <Card 
                    key={planKey}
                    className={`cursor-pointer border-2 transition-colors ${
                      selectedPlan === planKey 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    } ${isCurrentPlan(selectedType, planKey) ? 'ring-2 ring-green-500' : ''}`}
                    onClick={() => setSelectedPlan(planKey)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium capitalize">{planKey}</h3>
                        {isCurrentPlan(selectedType, planKey) && (
                          <Badge variant="secondary">
                            <Check className="h-3 w-3 mr-1" />
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(planData.price)}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{planKey === 'monthly' ? 'month' : 'year'}
                        </span>
                      </p>
                      {planKey === 'annual' && planData.discount && (
                        <p className="text-sm text-green-600 mt-1">
                          Save {planData.discount}% compared to monthly
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selectedType && selectedPlan && (
            <div className="space-y-4">
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {selectedType === 'family' ? 'Family' : 'Individual'} - {selectedPlan}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(getPlanPrice(selectedType, selectedPlan))} per {selectedPlan === 'monthly' ? 'month' : 'year'}
                  </p>
                </div>
                
                <Button 
                  onClick={handleSubscriptionChange}
                  disabled={changeSubscriptionMutation.isPending || isCurrentPlan(selectedType, selectedPlan)}
                  className="min-w-[140px]"
                >
                  {changeSubscriptionMutation.isPending ? "Processing..." : 
                   isCurrentPlan(selectedType, selectedPlan) ? "Current Plan" : "Update Subscription"}
                </Button>
              </div>

              {!isCurrentPlan(selectedType, selectedPlan) && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Note about subscription changes:</p>
                    <p>Changes will take effect immediately. You'll be charged/credited the prorated amount.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Payment</DialogTitle>
            <DialogDescription>
              Secure payment processing for your subscription
            </DialogDescription>
          </DialogHeader>
          <StripeCheckout
            subscriptionType={selectedType}
            subscriptionPlan={selectedPlan}
            price={getPlanPrice(selectedType, selectedPlan)}
            onSuccess={handleCheckoutSuccess}
            onCancel={() => setShowCheckout(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}