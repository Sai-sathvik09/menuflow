import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SuperAdminAuthProvider } from "@/lib/super-admin-auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

// Pages
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import CustomerMenu from "@/pages/customer-menu";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import MenuEditor from "@/pages/menu-editor";
import QRCodes from "@/pages/qr-codes";
import Tables from "@/pages/tables";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import SuperAdminLogin from "@/pages/super-admin-login";
import SuperAdminDashboard from "@/pages/super-admin-dashboard";
import SuperAdminSettings from "@/pages/super-admin-settings";
import NotFound from "@/pages/not-found";

function OwnerLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-2 border-b bg-card">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="text-lg font-semibold font-display text-primary">MenuFlow</div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { vendor, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!vendor) {
    return <Login />;
  }

  return (
    <OwnerLayout>
      <Component />
    </OwnerLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Customer Menu Routes */}
      <Route path="/menu/:vendorId" component={CustomerMenu} />
      <Route path="/menu/:vendorId/table/:tableId" component={CustomerMenu} />

      {/* Super Admin Routes */}
      <Route path="/super-admin/login" component={SuperAdminLogin} />
      <Route path="/super-admin/dashboard" component={SuperAdminDashboard} />
      <Route path="/super-admin/settings" component={SuperAdminSettings} />

      {/* Owner Portal Routes (Protected) */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/orders">
        <ProtectedRoute component={Orders} />
      </Route>
      <Route path="/menu">
        <ProtectedRoute component={MenuEditor} />
      </Route>
      <Route path="/qr-codes">
        <ProtectedRoute component={QRCodes} />
      </Route>
      <Route path="/tables">
        <ProtectedRoute component={Tables} />
      </Route>
      <Route path="/analytics">
        <ProtectedRoute component={Analytics} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

      {/* 404 Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SuperAdminAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SuperAdminAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
