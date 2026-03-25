import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout";

import Login from "@/pages/login";
import EmbedPerforma from "@/pages/embed-performa";
import Dashboard from "@/pages/dashboard";
import ImportData from "@/pages/import";
import ImportDetail from "@/pages/import-detail";
import PerformaVis from "@/pages/visualisasi/performa";
import FunnelVis from "@/pages/visualisasi/funnel";
import ActivityVis from "@/pages/visualisasi/activity";
import TelegramBot from "@/pages/telegram";
import PengaturanPage from "@/pages/pengaturan";
import { Loader2 } from "lucide-react";

function AmManagement() {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <p className="text-lg font-semibold">Manajemen AM</p>
      <p className="text-sm mt-2">Fitur dalam pengembangan</p>
    </div>
  );
}

function PublicAmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <p className="text-lg font-medium text-muted-foreground">Public AM Profile (Dalam Pengembangan)</p>
    </div>
  );
}

function ProtectedApp() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/import" component={ImportData} />
        <Route path="/import/detail/:id">{(params: any) => <ImportDetail params={params} />}</Route>
        <Route path="/visualisasi/performa" component={PerformaVis} />
        <Route path="/visualisasi/funnel" component={FunnelVis} />
        <Route path="/visualisasi/activity" component={ActivityVis} />
        <Route path="/am" component={AmManagement} />
        <Route path="/telegram" component={TelegramBot} />
        <Route path="/pengaturan" component={PengaturanPage} />
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route>
          <div className="p-8 text-center text-muted-foreground">Halaman tidak ditemukan</div>
        </Route>
      </Switch>
    </DashboardLayout>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/am-public/:slug" component={PublicAmPage} />
      <Route path="/embed/performa" component={EmbedPerforma} />
      <Route path="/presentation" component={EmbedPerforma} />
      <Route component={ProtectedApp} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
