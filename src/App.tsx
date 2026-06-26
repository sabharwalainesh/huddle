import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { A11yProvider } from "@/contexts/A11yContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AskHuddleWidget } from "@/components/AskHuddleWidget";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Landing from "./pages/Landing.tsx";
import Discover from "./pages/Discover.tsx";
import Auth from "./pages/Auth.tsx";
import BusinessDetail from "./pages/BusinessDetail.tsx";
import GooglePlaceDetail from "./pages/GooglePlaceDetail.tsx";
import BusinessOnboarding from "./pages/BusinessOnboarding.tsx";
import MyHuddle from "./pages/MyHuddle.tsx";
import Account from "./pages/Account.tsx";
import Admin from "./pages/Admin.tsx";
import Ask from "./pages/Ask.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Insights from "./pages/Insights.tsx";
import BusinessDashboard from "./pages/BusinessDashboard.tsx";
import BusinessDashboardDetail from "./pages/BusinessDashboardDetail.tsx";
import About from "./pages/About.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Cookies from "./pages/Cookies.tsx";
import AccessibilityStatement from "./pages/AccessibilityStatement.tsx";
import NotFound from "./pages/NotFound.tsx";
import { RequireAdmin } from "./components/RequireAdmin";
import { Navbar } from "./components/Navbar";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <A11yProvider>
              <Navbar />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/account" element={<Account />} />
                <Route path="/business/onboarding" element={<BusinessOnboarding />} />
                <Route path="/business/:id" element={<BusinessDetail />} />
                <Route path="/google/:placeId" element={<GooglePlaceDetail />} />
                <Route path="/my-huddle" element={<MyHuddle />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/ask" element={<Ask />} />
                <Route path="/dashboard" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/business-dashboard" element={<BusinessDashboard />} />
                <Route path="/business-dashboard/:id" element={<BusinessDashboardDetail />} />
                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="/accessibility" element={<AccessibilityStatement />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <AskHuddleWidget />
            </A11yProvider>
          </AuthProvider>
        </BrowserRouter>
        <SpeedInsights />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
