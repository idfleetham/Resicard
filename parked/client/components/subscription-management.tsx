import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/ui/Card";
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
    <div className="space-y-8">
      {/* Current Subscription Status */}
      {subscription && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-8 border border-emerald-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-2xl">
                <CreditCard className="h-6 w-6 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-emerald-800">Current Subscription</span>
            </div>
            <Badge className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200 px-4 py-2 rounded-2xl text-lg font-bold shadow-sm">
              {subscription.status === 'active' ? 'Active' : subscription.status || 'Inactive'}
            </Badge>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/60 rounded-2xl p-4">
                <p className="text-emerald-600 font-bold mb-2">Type</p>
                <p className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                  {subscription.type === 'family' ? (
                    <><Users className="h-5 w-5" /> Family</>
                  ) : (
                    <><User className="h-5 w-5" /> Individual</>
                  )}
                </p>
              </div>
              <div className="bg-white/60 rounded-2xl p-4">
                <p className="text-emerald-600 font-bold mb-2">Plan</p>
                <p className="text-xl font-bold text-emerald-800 capitalize">{subscription.plan}</p>
              </div>
            </div>
            
            {subscription.expiresAt && (
              <div className="bg-white/60 rounded-2xl p-4">
                <p className="text-emerald-600 font-bold mb-2">Next Billing Date</p>
                <p className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {formatDate(subscription.expiresAt)}
                </p>
              </div>
            )}

            {subscription.status === 'active' && (
              <div className="flex gap-2 pt-4">
                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 rounded-2xl px-6 py-3 font-bold shadow-sm hover:shadow-md transition-all duration-300">
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
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-3xl p-8 border border-indigo-200">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-indigo-100 rounded-2xl">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <span className="text-2xl font-bold text-indigo-800">Change Subscription</span>
          </div>
          <p className="text-indigo-700 text-lg">
            Select a new subscription type and plan
          </p>
        </div>
        <div className="space-y-8">
          {/* Subscription Type Selection */}
          <div className="space-y-4">
            <label className="text-lg font-bold text-indigo-800">Subscription Type</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-14 rounded-2xl border-2 border-indigo-200 text-lg bg-white/60">
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
            <div className="space-y-4">
              <label className="text-lg font-bold text-indigo-800">Billing Plan</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans?.[selectedType] && Object.entries(plans[selectedType]).map(([planKey, planData]: [string, any]) => (
                  <div 
                    key={planKey}
                    className={`cursor-pointer rounded-3xl p-6 border-2 transition-all duration-300 transform hover:scale-105 ${
                      selectedPlan === planKey 
                        ? 'border-indigo-400 bg-white shadow-xl' 
                        : 'border-indigo-200 bg-white/60 hover:border-indigo-400 hover:bg-white hover:shadow-lg'
                    } ${isCurrentPlan(selectedType, planKey) ? 'ring-2 ring-emerald-500' : ''}`}
                    onClick={() => setSelectedPlan(planKey)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-xl text-indigo-800 capitalize">{planKey}</h3>
                      {isCurrentPlan(selectedType, planKey) && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1 rounded-2xl font-bold">
                          <Check className="h-3 w-3 mr-1" />
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-3xl font-bold text-indigo-600 mb-2">
                      {formatCurrency(planData.price)}
                      <span className="text-lg font-normal text-indigo-500">
                        /{planKey === 'monthly' ? 'month' : 'year'}
                      </span>
                    </p>
                    {planKey === 'annual' && planData.discount && (
                      <div className="inline-flex items-center px-3 py-1 bg-emerald-100 rounded-2xl">
                        <span className="text-emerald-700 font-bold text-sm">
                          Save {planData.discount}% compared to monthly
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {selectedType && selectedPlan && (
            <div className="space-y-6">
              <div className="h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent"></div>
              
              <div className="bg-white/60 rounded-3xl p-6 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xl text-indigo-800">
                    {selectedType === 'family' ? 'Family' : 'Individual'} - {selectedPlan}
                  </p>
                  <p className="text-indigo-600 text-lg">
                    {formatCurrency(getPlanPrice(selectedType, selectedPlan))} per {selectedPlan === 'monthly' ? 'month' : 'year'}
                  </p>
                </div>
                
                <Button 
                  onClick={handleSubscriptionChange}
                  disabled={changeSubscriptionMutation.isPending || isCurrentPlan(selectedType, selectedPlan)}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl px-8 py-3 font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 min-w-[160px]"
                >
                  {changeSubscriptionMutation.isPending ? "Processing..." : 
                   isCurrentPlan(selectedType, selectedPlan) ? "Current Plan" : "Update Subscription"}
                </Button>
              </div>

              {!isCurrentPlan(selectedType, selectedPlan) && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-amber-100 rounded-xl">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="text-amber-800">
                      <p className="font-bold text-lg mb-2">Note about subscription changes:</p>
                      <p className="text-amber-700">Changes will take effect immediately. You'll be charged/credited the prorated amount.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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