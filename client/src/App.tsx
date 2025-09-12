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
import ResidentDashboard from "@/pages/resident-dashboard";
import MerchantDashboard from "@/pages/merchant-dashboard";
import MerchantPortal from "@/pages/merchant-portal";
import AdminDashboard from "@/pages/admin-dashboard";
import EditProfile from "@/pages/edit-profile";
import OfferDetails from "@/pages/offer-details";
import LoyaltyDashboard from "@/pages/loyalty-dashboard";
import TierMemberships from "@/pages/tier-memberships";
import WalletAdd from "@/pages/wallet-add";
import VerifyVoucher from "@/pages/verify-voucher";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/admin-signup" component={AdminSignup} />
      <Route path="/resident-dashboard" component={ResidentDashboard} />
      <Route path="/merchant-dashboard" component={MerchantDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/resident" component={ResidentDashboard} />
      <Route path="/resident-new" component={ResidentDashboard} />
      <Route path="/merchant" component={MerchantPortal} />
      <Route path="/merchant-portal" component={MerchantPortal} />
      <Route path="/merchant/offers/:id" component={OfferDetails} />
      <Route path="/merchant/loyalty" component={LoyaltyDashboard} />
      <Route path="/loyalty-dashboard" component={LoyaltyDashboard} />
      <Route path="/loyalty" component={LoyaltyDashboard} />
      <Route path="/tier-memberships" component={TierMemberships} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/wallet/add" component={WalletAdd} />
      <Route path="/edit-profile" component={EditProfile} />
      <Route path="/verify-voucher" component={VerifyVoucher} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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

export default App;
