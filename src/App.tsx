import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { A11yProvider } from "@/contexts/A11yContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AskHuddleWidget } from "@/components/AskHuddleWidget";
import Landing from "./pages/Landing.tsx";
import Discover from "./pages/Discover.tsx";
import Feed from "./pages/Feed.tsx";
import Auth from "./pages/Auth.tsx";
import BusinessDetail from "./pages/BusinessDetail.tsx";
import BusinessOnboarding from "./pages/BusinessOnboarding.tsx";
import MyHuddle from "./pages/MyHuddle.tsx";
import Account from "./pages/Account.tsx";
import Admin from "./pages/Admin.tsx";
import Ask from "./pages/Ask.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Insights from "./pages/Insights.tsx";
import About from "./pages/About.tsx";
import NotFound from "./pages/NotFound.tsx";
import { RequireAdmin } from "./components/RequireAdmin";

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
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/account" element={<Account />} />
                <Route path="/business/onboarding" element={<BusinessOnboarding />} />
                <Route path="/business/:id" element={<BusinessDetail />} />
                <Route path="/my-huddle" element={<MyHuddle />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/ask" element={<Ask />} />
                <Route path="/dashboard" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/about" element={<About />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <AskHuddleWidget />
            </A11yProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
