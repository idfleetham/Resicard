import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { generateCustomerAlias } from "@shared/schema";
import { useRewardAnimationContext } from "./reward-animation-provider";
import { PulsingBadge, ShimmerText } from "./reward-animations";
import { 
  Zap, 
  User, 
  CreditCard, 
  Gift, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Shield
} from "lucide-react";

interface StaffEarningToolProps {
  merchantId: string;
  program?: {
    model: "points" | "stamps" | "hybrid";
    pointsPerCurrency: number;
    minBasketEarn: number;
    earnCooldownMinutes: number;
    dailyEarnCap: number;
  };
}

export function StaffEarningTool({ merchantId, program }: StaffEarningToolProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { triggerPointsEarned, triggerTierUpgrade } = useRewardAnimationContext();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerId: "",
    customerAlias: "", // Store alias instead of real name
    earnType: "purchase", // purchase, visit
    basketAmount: "",
    staffPin: "",
    notes: ""
  });

  const awardPointsMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("POST", "/api/loyalty/earn", data),
    onSuccess: (response) => {
      const result = response as any;
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/balance"] });
      
      // Trigger reward animations
      if (result.pointsAdded > 0) {
        triggerPointsEarned(result.pointsAdded);
      }
      
      if (result.tierChanged && result.newTier) {
        triggerTierUpgrade(result.newTier);
      }
      
      toast({ 
        title: "Points awarded successfully!",
        description: `Awarded ${result.pointsAdded || 0} points and ${result.stampsAdded || 0} stamps`
      });
      setIsOpen(false);
      setStep(1);
      setFormData({
        customerId: "",
        customerAlias: "",
        earnType: "purchase",
        basketAmount: "",
        staffPin: "",
        notes: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error awarding points",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const basketAmount = parseFloat(formData.basketAmount) || 0;
    
    // Validation
    if (!formData.customerId || (!basketAmount && formData.earnType === 'purchase')) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (program?.minBasketEarn && basketAmount < program.minBasketEarn) {
      toast({
        title: "Basket too small",
        description: `Minimum basket amount is £${program.minBasketEarn}`,
        variant: "destructive",
      });
      return;
    }

    awardPointsMutation.mutate({
      userId: formData.customerId,
      merchantId,
      amount: basketAmount,
      type: formData.earnType,
      metadata: {
        staffUserId: user?.id,
        staffPin: formData.staffPin,
        customerAlias: formData.customerAlias,
        notes: formData.notes,
        source: "staff_tool"
      }
    });
  };

  const calculateEarning = () => {
    if (!program) return { points: 0, stamps: 0 };
    
    const basketAmount = parseFloat(formData.basketAmount) || 0;
    let points = 0;
    let stamps = 0;

    if (program.model === 'points' && formData.earnType === 'purchase') {
      points = Math.floor(basketAmount * (program.pointsPerCurrency || 10));
    } else if (program.model === 'stamps' && formData.earnType === 'visit') {
      stamps = 1;
    } else if (program.model === 'hybrid') {
      if (formData.earnType === 'purchase') {
        points = Math.floor(basketAmount * (program.pointsPerCurrency || 10));
      }
      stamps = 1; // Always award stamp for any interaction in hybrid mode
    }

    return { points, stamps };
  };

  const earning = calculateEarning();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-elev-1">
          <Zap className="w-4 h-4 mr-2" />
          Award Points
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Award Loyalty Points
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Award points or stamps to customers after verified purchases or visits
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= i 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {step > i ? <CheckCircle className="w-4 h-4" /> : i}
              </div>
            ))}
          </div>

          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="text-slate-200">Customer ID</Label>
                <Input
                  placeholder="Enter customer ID or scan QR"
                  value={formData.customerId}
                  onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Customer Identifier (Optional)</Label>
                <Input
                  placeholder="Username or alias for verification"
                  value={formData.customerAlias}
                  onChange={(e) => setFormData({...formData, customerAlias: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>

              <Button 
                onClick={() => setStep(2)} 
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                disabled={!formData.customerId}
              >
                Continue
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="text-slate-200">Transaction Type</Label>
                <Select 
                  value={formData.earnType} 
                  onValueChange={(value) => setFormData({...formData, earnType: value})}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="purchase">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Purchase
                      </div>
                    </SelectItem>
                    <SelectItem value="visit">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Visit Only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.earnType === 'purchase' && (
                <div className="space-y-2">
                  <Label className="text-slate-200">Basket Amount (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.basketAmount}
                    onChange={(e) => setFormData({...formData, basketAmount: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-slate-100"
                  />
                  {program?.minBasketEarn && (
                    <p className="text-xs text-slate-400">
                      Minimum: £{program.minBasketEarn}
                    </p>
                  )}
                </div>
              )}

              {/* Preview Earning */}
              {(earning.points > 0 || earning.stamps > 0) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="p-3 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Gift className="w-4 h-4 text-green-400" />
                    </motion.div>
                    <ShimmerText>
                      <span className="text-sm font-medium text-green-400">Will Award</span>
                    </ShimmerText>
                  </div>
                  <div className="flex gap-4 text-sm">
                    {earning.points > 0 && (
                      <PulsingBadge isActive={true}>
                        <div>
                          <span className="font-bold text-white">{earning.points}</span>
                          <span className="text-slate-300"> points</span>
                        </div>
                      </PulsingBadge>
                    )}
                    {earning.stamps > 0 && (
                      <PulsingBadge isActive={true}>
                        <div>
                          <span className="font-bold text-white">{earning.stamps}</span>
                          <span className="text-slate-300"> stamp{earning.stamps !== 1 ? 's' : ''}</span>
                        </div>
                      </PulsingBadge>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600"
                  disabled={formData.earnType === 'purchase' && !formData.basketAmount}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label className="text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Staff PIN (Required)
                </Label>
                <Input
                  type="password"
                  placeholder="Enter your staff PIN"
                  value={formData.staffPin}
                  onChange={(e) => setFormData({...formData, staffPin: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Notes (Optional)</Label>
                <Textarea
                  placeholder="Transaction details, special circumstances..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-slate-100 min-h-[60px]"
                />
              </div>

              {/* Anti-gaming notice */}
              <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div className="text-xs text-yellow-300">
                    <p className="font-medium mb-1">Anti-Gaming Protection Active</p>
                    <p>• {program?.earnCooldownMinutes || 30} min cooldown between awards</p>
                    <p>• Max {program?.dailyEarnCap || 3} awards per customer per day</p>
                    <p>• All transactions are logged and auditable</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.staffPin || awardPointsMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
                >
                  {awardPointsMutation.isPending ? "Processing..." : "Award Points"}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}