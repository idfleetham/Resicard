import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CreditCard, Settings, CheckCircle, AlertCircle, Building2 } from "lucide-react";

interface SubscriptionSettings {
  monthlyFee: number;
  processingFeePercent: number;
  status: 'active' | 'inactive' | 'trial';
  nextBillingDate: string;
  trialEndsAt?: string;
}

export default function SubscriptionManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [processingFeePercent, setProcessingFeePercent] = useState(10);

  // Fetch current subscription settings
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['/api/subscription/settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/subscription/settings');
      if (response.ok) {
        return response.json();
      }
      // Return default settings if not found
      return {
        monthlyFee: 29.99,
        processingFeePercent: 10,
        status: 'trial',
        nextBillingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    },
    enabled: !!user && user.role === 'merchant',
  });

  // Update subscription settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<SubscriptionSettings>) => {
      const response = await apiRequest('PUT', '/api/subscription/settings', settings);
      if (!response.ok) {
        throw new Error('Failed to update subscription settings');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your subscription settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/settings'] });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update subscription settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      processingFeePercent: processingFeePercent
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case "trial":
        return <Badge className="bg-blue-500 text-white">Trial</Badge>;
      case "inactive":
        return <Badge variant="destructive">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "trial":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-surface rounded-lg" />
          <div className="h-48 bg-surface rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Building2 className="h-8 w-8 text-brand1" />
        <div>
          <h1 className="text-3xl font-bold text-fg">Subscription Management</h1>
          <p className="text-lg text-slate-300">Manage your platform subscription and fee settings</p>
        </div>
      </div>

      {/* Current Subscription Status */}
      <Card className="bg-surface border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-6 w-6 text-brand1" />
              <CardTitle className="text-xl">Current Subscription</CardTitle>
            </div>
            {getStatusBadge(subscriptionData?.status || 'trial')}
          </div>
          <CardDescription>
            Your platform subscription details and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-400">Monthly Fee</Label>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-fg">£{subscriptionData?.monthlyFee || 29.99}</span>
                <span className="text-sm text-slate-400">per month</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-400">Next Billing Date</Label>
              <div className="flex items-center space-x-2">
                {getStatusIcon(subscriptionData?.status || 'trial')}
                <span className="text-lg text-fg">
                  {subscriptionData?.nextBillingDate 
                    ? new Date(subscriptionData.nextBillingDate).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-400">Status</Label>
              <div className="text-lg text-fg">
                {subscriptionData?.status === 'trial' && subscriptionData?.trialEndsAt ? (
                  <span>Trial ends {new Date(subscriptionData.trialEndsAt).toLocaleDateString('en-GB')}</span>
                ) : (
                  <span className="capitalize">{subscriptionData?.status || 'Trial'}</span>
                )}
              </div>
            </div>
          </div>

          {subscriptionData?.status === 'trial' && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-fg">Free Trial Active</h4>
                  <p className="text-sm text-slate-300 mt-1">
                    You're currently on a free trial. Your subscription will automatically start when the trial period ends.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Settings */}
      <Card className="bg-surface border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="h-6 w-6 text-brand1" />
              <CardTitle className="text-xl">Processing Fee Settings</CardTitle>
            </div>
            <Button
              variant="outline"
              onClick={() => isEditing ? handleSaveSettings() : setIsEditing(true)}
              disabled={updateSettingsMutation.isPending}
              className="border-white/20 text-fg hover:bg-white/10"
            >
              {isEditing ? 'Save Changes' : 'Edit Settings'}
            </Button>
          </div>
          <CardDescription>
            Configure your processing fee rate for voucher redemptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="processingFee" className="text-sm font-medium text-slate-400">
                Processing Fee (% of discount value)
              </Label>
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <Input
                    id="processingFee"
                    type="number"
                    value={processingFeePercent}
                    onChange={(e) => setProcessingFeePercent(parseFloat(e.target.value) || 0)}
                    className="w-24 bg-surface border-white/20 text-fg"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="text-fg">%</span>
                </div>
              ) : (
                <div className="text-2xl font-bold text-fg">
                  {subscriptionData?.processingFeePercent || processingFeePercent}%
                </div>
              )}
              <p className="text-sm text-slate-400">
                This percentage will be applied to the discount value of each voucher redemption.
              </p>
            </div>

            <Separator className="bg-white/10" />

            <div className="space-y-3">
              <h4 className="font-medium text-fg">Fee Structure Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Platform Fee:</span>
                    <span className="text-fg font-medium">£{subscriptionData?.monthlyFee || 29.99}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Processing Fee:</span>
                    <span className="text-fg font-medium">
                      {subscriptionData?.processingFeePercent || processingFeePercent}% of discount value
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">VAT:</span>
                    <span className="text-fg font-medium">20% (added to all fees)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Collection:</span>
                    <span className="text-fg font-medium">15 days after month end</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Calculations */}
      <Card className="bg-surface border-white/20">
        <CardHeader>
          <CardTitle className="text-xl">Fee Calculation Examples</CardTitle>
          <CardDescription>
            See how your processing fee rate applies to different redemption values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { discount: 15, description: "BOGO Cocktail (£15 discount)" },
              { discount: 50, description: "Meal Deal (£50 discount)" },
              { discount: 200, description: "Hotel Package (£200 discount)" }
            ].map((example, index) => {
              const fee = (example.discount * (subscriptionData?.processingFeePercent || processingFeePercent)) / 100;
              const vat = fee * 0.20;
              const total = fee + vat;

              return (
                <div key={index} className="p-4 bg-surface2 rounded-lg border border-white/10">
                  <h5 className="font-medium text-fg mb-2">{example.description}</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Processing Fee:</span>
                      <span className="text-fg">£{fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">VAT (20%):</span>
                      <span className="text-fg">£{vat.toFixed(2)}</span>
                    </div>
                    <Separator className="bg-white/10 my-1" />
                    <div className="flex justify-between font-medium">
                      <span className="text-fg">Total Fee:</span>
                      <span className="text-fg">£{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}