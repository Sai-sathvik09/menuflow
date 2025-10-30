import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuperAdminAuth } from "@/lib/super-admin-auth-context";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Building2,
  Calendar,
  Settings as SettingsIcon
} from "lucide-react";
import { type Vendor, type ContactInquiry } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SuperAdminDashboard() {
  const { superAdmin, logout } = useSuperAdminAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: stats } = useQuery<{
    totalVendors: number;
    starterCount: number;
    proCount: number;
    eliteCount: number;
    totalOrders: number;
    totalRevenue: string;
  }>({
    queryKey: ["/api/super-admin/stats"],
    enabled: !!superAdmin?.id,
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/super-admin/vendors"],
    enabled: !!superAdmin?.id,
  });

  const { data: contactInquiries = [] } = useQuery<ContactInquiry[]>({
    queryKey: ["/api/contact-inquiries"],
    enabled: !!superAdmin?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ inquiryId, status }: { inquiryId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/contact-inquiries/${inquiryId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-inquiries"] });
      toast({
        title: "Status Updated",
        description: "The inquiry status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update inquiry status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation("/super-admin/login");
  };

  if (!superAdmin) {
    setLocation("/super-admin/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">MenuFlow Super Admin</h1>
            <p className="text-sm text-muted-foreground">Platform Administration Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/super-admin/settings">
              <Button variant="ghost" size="icon" data-testid="button-settings">
                <SettingsIcon className="w-5 h-5" />
              </Button>
            </Link>
            <div className="text-right">
              <p className="text-sm font-medium">{superAdmin.name}</p>
              <p className="text-xs text-muted-foreground">{superAdmin.email}</p>
            </div>
            <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Platform Statistics */}
        <div>
          <h2 className="text-2xl font-bold font-display mb-4">Platform Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-vendors">
                  {stats?.totalVendors || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Registered restaurants & vendors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-orders">
                  {stats?.totalOrders || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all vendors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-revenue">
                  ₹{stats?.totalRevenue || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Platform-wide earnings
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Subscription Breakdown */}
        <div>
          <h3 className="text-xl font-bold font-display mb-4">Subscription Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Starter Plan</CardTitle>
                <CardDescription>Free tier users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600" data-testid="stat-starter-count">
                  {stats?.starterCount || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pro Plan</CardTitle>
                <CardDescription>₹999/month subscribers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600" data-testid="stat-pro-count">
                  {stats?.proCount || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Elite Plan</CardTitle>
                <CardDescription>Enterprise customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600" data-testid="stat-elite-count">
                  {stats?.eliteCount || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sales Inquiries */}
        {contactInquiries.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold font-display mb-4">Elite Plan Inquiries</h2>
            <Card>
              <CardHeader>
                <CardTitle>Sales Leads from Landing Page</CardTitle>
                <CardDescription>
                  Potential customers interested in the Elite plan ({contactInquiries.length} total)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contactInquiries.map((inquiry) => (
                    <Card key={inquiry.id} className="border-l-4 border-l-primary" data-testid={`inquiry-card-${inquiry.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{inquiry.businessName}</CardTitle>
                            <CardDescription>{inquiry.contactPerson}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={inquiry.status}
                              onValueChange={(value) => updateStatusMutation.mutate({ inquiryId: inquiry.id, status: value })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-[150px]" data-testid={`status-select-${inquiry.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="converted">Converted</SelectItem>
                                <SelectItem value="declined">Declined</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="text-sm text-muted-foreground whitespace-nowrap">
                              {new Date(inquiry.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <a href={`mailto:${inquiry.email}`} className="hover:underline truncate" data-testid={`inquiry-email-${inquiry.id}`}>
                              {inquiry.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <a href={`tel:${inquiry.phone}`} className="hover:underline" data-testid={`inquiry-phone-${inquiry.id}`}>
                              {inquiry.phone}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="capitalize">{inquiry.restaurantType.replace("-", " ")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span>{inquiry.numberOfLocations} location(s)</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 bg-muted/50 p-3 rounded-md">
                          <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <p className="text-sm flex-1" data-testid={`inquiry-message-${inquiry.id}`}>
                            {inquiry.message}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Vendor List */}
        <div>
          <h2 className="text-2xl font-bold font-display mb-4">All Registered Vendors</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {vendors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No vendors registered yet</p>
                ) : (
                  vendors.map((vendor) => (
                    <Card key={vendor.id} data-testid={`vendor-card-${vendor.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                              <h3 className="font-semibold text-lg" data-testid={`vendor-name-${vendor.id}`}>
                                {vendor.businessName}
                              </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm ml-8">
                              <p className="text-muted-foreground">
                                Email: <span className="text-foreground font-mono">{vendor.email}</span>
                              </p>
                              <p className="text-muted-foreground">
                                Type: <span className="text-foreground capitalize">{vendor.businessType}</span>
                              </p>
                              <p className="text-muted-foreground flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                Joined: <span className="text-foreground">{new Date(vendor.createdAt).toLocaleDateString()}</span>
                              </p>
                              {vendor.tableLimit && vendor.tableLimit > 0 && (
                                <p className="text-muted-foreground">
                                  Table Limit: <span className="text-foreground">{vendor.tableLimit === 999 ? "Unlimited" : vendor.tableLimit}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={
                              vendor.subscriptionTier === "elite"
                                ? "default"
                                : vendor.subscriptionTier === "pro"
                                ? "secondary"
                                : "outline"
                            }
                            className="capitalize"
                          >
                            {vendor.subscriptionTier}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
