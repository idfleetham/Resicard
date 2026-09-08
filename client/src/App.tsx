import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { RewardAnimationProvider } from "@/components/loyalty/reward-animation-provider";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import AdminSignup from "@/pages/admin-signup";
import EditProfile from "@/pages/edit-profile";
import Pricing from "@/pages/pricing";

import ResidentDashboard from "@/pages/resident/dashboard";
import ScanPage from "@/pages/resident/scan";
import RedemptionSuccess from "@/pages/resident/redemption-success";
import RewardClaimPage from "@/pages/resident/reward-claim";
import LoyaltyCardPage from "@/pages/resident/loyalty-card";
import OutletPage from "@/pages/resident/outlet";

import MerchantPortal from "@/pages/merchant/portal";
import OfferDetails from "@/pages/merchant/offer-details";
import LoyaltyDashboard from "@/pages/merchant/loyalty-dashboard";

import AdminDashboard from "@/pages/admin/dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/admin-signup" component={AdminSignup} />
      <Route path="/edit-profile" component={EditProfile} />

      <Route path="/resident" component={ResidentDashboard} />
      <Route path="/membership" component={ResidentDashboard} />
      <Route path="/scan/:scanCode" component={ScanPage} />
      <Route path="/redemptions/:id" component={RedemptionSuccess} />
      <Route path="/reward-claims/:id" component={RewardClaimPage} />
      <Route path="/loyalty/:merchantId" component={LoyaltyCardPage} />
      <Route path="/outlets/:id" component={OutletPage} />

      <Route path="/merchant" component={MerchantPortal} />
      <Route path="/merchant/plan" component={MerchantPortal} />
      <Route path="/merchant/offers/:id" component={OfferDetails} />
      <Route path="/merchant/loyalty" component={LoyaltyDashboard} />

      <Route path="/admin" component={AdminDashboard} />

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <RewardAnimationProvider>
              <Toaster />
              <Router />
            </RewardAnimationProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
