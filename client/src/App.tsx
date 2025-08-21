import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AdminSignup from "@/pages/admin-signup";
import ResidentDashboard from "@/pages/resident-dashboard";
import MerchantDashboard from "@/pages/merchant-dashboard";
import MerchantPortal from "@/pages/merchant-portal";
import AdminDashboard from "@/pages/admin-dashboard";
import EditProfile from "@/pages/edit-profile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin-signup" component={AdminSignup} />
      <Route path="/resident-dashboard" component={ResidentDashboard} />
      <Route path="/merchant-dashboard" component={MerchantDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/resident" component={ResidentDashboard} />
      <Route path="/merchant" component={MerchantPortal} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/edit-profile" component={EditProfile} />
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
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
