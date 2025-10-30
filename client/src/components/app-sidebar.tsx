import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ListOrdered, 
  QrCode, 
  MapPin, 
  BarChart3,
  Settings as SettingsIcon,
  LogOut
} from "lucide-react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["owner"], // Only owners see dashboard
  },
  {
    title: "Live Orders",
    url: "/orders",
    icon: ListOrdered,
    roles: ["owner", "kitchen"], // Kitchen and owners manage orders
  },
  {
    title: "Take Order",
    url: "/orders",
    icon: ListOrdered,
    roles: ["waiter"], // Waiters use this to create orders
  },
  {
    title: "Menu",
    url: "/menu",
    icon: UtensilsCrossed,
    roles: ["owner", "waiter"], // Waiters view menu to take orders
  },
  {
    title: "QR Codes",
    url: "/qr-codes",
    icon: QrCode,
    roles: ["owner"], // Only owners manage QR codes
  },
  {
    title: "Tables",
    url: "/tables",
    icon: MapPin,
    proOnly: true,
    roles: ["owner", "waiter"], // Waiters view tables to assign orders
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    proOnly: true,
    roles: ["owner"], // Only owners see analytics
  },
  {
    title: "Settings",
    url: "/settings",
    icon: SettingsIcon,
    roles: ["owner", "waiter", "kitchen"], // All roles can change their password
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { vendor, logout } = useAuth();

  const isProOrElite = vendor?.subscriptionTier === "pro" || vendor?.subscriptionTier === "elite";
  const userRole = vendor?.role || "owner";

  // Filter menu items based on role
  const visibleMenuItems = menuItems.filter((item) => {
    // Check if user's role is allowed for this item
    if (!item.roles.includes(userRole)) return false;
    
    // Check subscription tier for Pro-only features
    if (item.proOnly && !isProOrElite) return true; // Show but disabled
    
    return true;
  });

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80 text-base font-display font-bold px-4 py-3">
            MenuFlow
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const isActive = location === item.url;
                const isDisabled = item.proOnly && !isProOrElite;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild={!isDisabled}
                      className={`${
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                      } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      data-testid={`link-${item.url.slice(1)}`}
                    >
                      {isDisabled ? (
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                          <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            Pro
                          </span>
                        </div>
                      ) : (
                        <Link href={item.url}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="space-y-3">
          <div className="text-sm">
            <div className="font-semibold text-sidebar-foreground">{vendor?.businessName}</div>
            <div className="text-sidebar-foreground/60 text-xs mt-0.5">{vendor?.email}</div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary capitalize">
                {vendor?.subscriptionTier} Plan
              </span>
              {userRole !== "owner" && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-status-preparing/20 text-status-preparing capitalize">
                  {userRole}
                </span>
              )}
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full bg-sidebar-accent hover:bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border gap-2"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
