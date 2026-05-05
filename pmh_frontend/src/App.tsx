import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const EntryPage = lazy(() => import("./pages/EntryPage"));
const SupportInputPage = lazy(() => import("./pages/SupportInputPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const SupportDirectoryPage = lazy(() => import("./pages/SupportDirectoryPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Loading...
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/entry" element={<EntryPage />} />
                <Route path="/support-input" element={<SupportInputPage />} />
                <Route path="/onboarding" element={<Navigate to="/support-input" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/support" element={<SupportDirectoryPage />} />
                <Route path="/events" element={<Navigate to="/dashboard" replace />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/calls" element={<Navigate to="/dashboard" replace />} />
                <Route path="/chat" element={<Navigate to="/support" replace />} />
                <Route path="/profile" element={<Navigate to="/settings" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
