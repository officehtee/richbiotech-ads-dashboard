import DashboardLayout from "@/components/DashboardLayout";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AccountsSettings from "./pages/AccountsSettings";
import AdIntelligence from "./pages/AdIntelligence";
import AdMetricBenchmark from "./pages/AdMetricBenchmark";
import AdsetDetail from "./pages/AdsetDetail";
import CommissionDashboard from "./pages/CommissionDashboard";
import CommissionPersonal from "./pages/CommissionPersonal";
import CommissionSettings from "./pages/CommissionSettings";
import CommissionTable from "./pages/CommissionTable";
import GroupOverview from "./pages/GroupOverview";
import GroupsSettings from "./pages/GroupsSettings";
import HubDashboard from "./pages/HubDashboard";
import InviteRedeem from "./pages/InviteRedeem";
import AIAdvisor from "./pages/AIAdvisor";
import Alerts from "./pages/Alerts";
import Cohort from "./pages/Cohort";
import Leaderboard from "./pages/Leaderboard";
import PerformanceComparison from "./pages/PerformanceComparison";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import ShareLinks from "./pages/ShareLinks";
import ShareView from "./pages/ShareView";
import SingleDashboard from "./pages/SingleDashboard";
import SmartScaling from "./pages/SmartScaling";
import UserManagement from "./pages/UserManagement";

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return <DashboardLayout>{null}</DashboardLayout>;
  }

  // Send pending users to onboarding
  if (user && user.role === "pending" && location !== "/onboarding") {
    return <Redirect to="/onboarding" />;
  }

  // Owner without companyCode also needs onboarding setup (just-promoted owner)
  // We rely on Onboarding page to detect this case via myCompany query.

  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      {/* Public share view */}
      <Route path="/share/:token">
        <ShareView />
      </Route>

      {/* Onboarding (rendered without sidebar) */}
      <Route path="/onboarding" component={Onboarding} />

      {/* Magic Invite Link (rendered without sidebar) */}
      <Route path="/invite/:token" component={InviteRedeem} />

      <Route path="/">
        <ProtectedShell>
          <HubDashboard />
        </ProtectedShell>
      </Route>
      <Route path="/group-overview">
        <ProtectedShell>
          <GroupOverview />
        </ProtectedShell>
      </Route>
      <Route path="/dashboard">
        <ProtectedShell>
          <SingleDashboard />
        </ProtectedShell>
      </Route>
      <Route path="/leaderboard">
        <ProtectedShell>
          <Leaderboard />
        </ProtectedShell>
      </Route>
      <Route path="/comparison">
        <ProtectedShell>
          <PerformanceComparison />
        </ProtectedShell>
      </Route>
      <Route path="/ai-advisor">
        <ProtectedShell>
          <AIAdvisor />
        </ProtectedShell>
      </Route>
      <Route path="/alerts">
        <ProtectedShell>
          <Alerts />
        </ProtectedShell>
      </Route>
      <Route path="/cohort">
        <ProtectedShell>
          <Cohort />
        </ProtectedShell>
      </Route>
      <Route path="/ad-intelligence">
        <ProtectedShell>
          <AdIntelligence />
        </ProtectedShell>
      </Route>
      <Route path="/adset/:accountId/:adsetId">
        <ProtectedShell>
          <AdsetDetail />
        </ProtectedShell>
      </Route>
      <Route path="/ad-metric-benchmark">
        <ProtectedShell>
          <AdMetricBenchmark />
        </ProtectedShell>
      </Route>
      <Route path="/smart-scaling">
        <ProtectedShell>
          <SmartScaling />
        </ProtectedShell>
      </Route>
      <Route path="/share-links">
        <ProtectedShell>
          <ShareLinks />
        </ProtectedShell>
      </Route>
      <Route path="/commission">
        <ProtectedShell>
          <CommissionTable />
        </ProtectedShell>
      </Route>
      <Route path="/commission/dashboard">
        <ProtectedShell>
          <CommissionDashboard />
        </ProtectedShell>
      </Route>
      <Route path="/commission/personal">
        <ProtectedShell>
          <CommissionPersonal />
        </ProtectedShell>
      </Route>
      <Route path="/commission/settings">
        <ProtectedShell>
          <CommissionSettings />
        </ProtectedShell>
      </Route>
      <Route path="/accounts">
        <ProtectedShell>
          <AccountsSettings />
        </ProtectedShell>
      </Route>
      <Route path="/groups">
        <ProtectedShell>
          <GroupsSettings />
        </ProtectedShell>
      </Route>
      <Route path="/users">
        <ProtectedShell>
          <UserManagement />
        </ProtectedShell>
      </Route>
      <Route path="/profile">
        <ProtectedShell>
          <Profile />
        </ProtectedShell>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
