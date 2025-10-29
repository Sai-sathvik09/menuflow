import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderCard } from "@/components/order-card";
import { type Order, type Vendor } from "@shared/schema";
import { DollarSign, ShoppingBag, Clock, TrendingUp, Copy, Check, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWebSocket } from "@/lib/use-websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { vendor } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isKitchenDialogOpen, setIsKitchenDialogOpen] = useState(false);
  const [kitchenEmail, setKitchenEmail] = useState("");
  const [kitchenPassword, setKitchenPassword] = useState("");
  
  // Connect to WebSocket for real-time order updates
  useWebSocket();

  // Fetch orders
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders", vendor?.id],
    enabled: !!vendor?.id,
  });

  // Fetch waiter credentials for owners
  const { data: waiterCredentials } = useQuery<{ email: string; defaultPassword: string }>({
    queryKey: ["/api/auth/waiter", vendor?.id],
    enabled: !!vendor?.id && vendor?.role === "owner",
  });

  // Fetch kitchen staff for owners
  const { data: kitchenStaff = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/auth/kitchen", vendor?.id],
    enabled: !!vendor?.id && vendor?.role === "owner",
  });

  // Mutation to create kitchen staff
  const createKitchenStaff = useMutation({
    mutationFn: async (data: { ownerId: string; email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/kitchen", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/kitchen", vendor?.id] });
      setIsKitchenDialogOpen(false);
      setKitchenEmail("");
      setKitchenPassword("");
      toast({
        title: "Success!",
        description: "Kitchen staff account created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create kitchen staff account",
        variant: "destructive",
      });
    },
  });

  const handleCreateKitchenStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor?.id || !kitchenEmail || !kitchenPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createKitchenStaff.mutate({
      ownerId: vendor.id,
      email: kitchenEmail,
      password: kitchenPassword,
    });
  };

  const copyToClipboard = (text: string, type: 'email' | 'password') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
    toast({
      title: "Copied!",
      description: `Waiter ${type} copied to clipboard`,
    });
  };

  const stats = {
    totalOrders: orders.length,
    activeOrders: orders.filter(o => o.status !== "completed").length,
    totalRevenue: orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0).toFixed(2),
    avgOrderValue: orders.length > 0 
      ? (orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0) / orders.length).toFixed(2)
      : "0.00",
  };

  const recentOrders = orders.filter(o => o.status !== "completed").slice(0, 3);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders Today</CardTitle>
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display" data-testid="text-total-orders">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">All orders placed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-status-preparing" data-testid="text-active-orders">
              {stats.activeOrders}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Orders in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-primary" data-testid="text-revenue">
              ${stats.totalRevenue}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total sales today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display" data-testid="text-avg-order">
              ${stats.avgOrderValue}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per order value</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-2xl font-bold font-display mb-4">Recent Active Orders</h2>
        {recentOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No active orders at the moment
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>

      {/* Waiter Credentials (Only for Owners) */}
      {vendor?.role === "owner" && waiterCredentials && (
        <div>
          <h2 className="text-2xl font-bold font-display mb-4">Waiter Account</h2>
          <Card>
            <CardHeader>
              <CardTitle>Waiter Login Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Share these credentials with your waiter staff. They can change the password after logging in.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 p-3 bg-muted rounded-md">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                    <p className="font-medium font-mono text-sm" data-testid="text-waiter-email">
                      {waiterCredentials.email}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(waiterCredentials.email, 'email')}
                    data-testid="button-copy-email"
                  >
                    {copiedEmail ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-4 p-3 bg-muted rounded-md">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Default Password</p>
                    <p className="font-medium font-mono text-sm" data-testid="text-waiter-password">
                      {waiterCredentials.defaultPassword}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(waiterCredentials.defaultPassword, 'password')}
                    data-testid="button-copy-password"
                  >
                    {copiedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kitchen Staff Accounts (Only for Owners) */}
      {vendor?.role === "owner" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold font-display">Kitchen Staff Accounts</h2>
            <Dialog open={isKitchenDialogOpen} onOpenChange={setIsKitchenDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-kitchen-staff">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Kitchen Staff
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Kitchen Staff Account</DialogTitle>
                  <DialogDescription>
                    Create a new kitchen staff account. They can use these credentials to log in and view orders.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateKitchenStaff} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="kitchen-email">Email</Label>
                    <Input
                      id="kitchen-email"
                      type="email"
                      placeholder="kitchen@example.com"
                      value={kitchenEmail}
                      onChange={(e) => setKitchenEmail(e.target.value)}
                      required
                      data-testid="input-kitchen-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kitchen-password">Password</Label>
                    <Input
                      id="kitchen-password"
                      type="password"
                      placeholder="Enter password"
                      value={kitchenPassword}
                      onChange={(e) => setKitchenPassword(e.target.value)}
                      required
                      minLength={6}
                      data-testid="input-kitchen-password"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsKitchenDialogOpen(false)}
                      data-testid="button-cancel-kitchen"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createKitchenStaff.isPending}
                      data-testid="button-submit-kitchen"
                    >
                      {createKitchenStaff.isPending ? "Creating..." : "Create Account"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Kitchen Staff List</CardTitle>
            </CardHeader>
            <CardContent>
              {kitchenStaff.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No kitchen staff accounts yet. Click "Add Kitchen Staff" to create one.
                </p>
              ) : (
                <div className="space-y-3">
                  {kitchenStaff.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between gap-4 p-3 bg-muted rounded-md"
                      data-testid={`kitchen-staff-${staff.id}`}
                    >
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Email</p>
                        <p className="font-medium font-mono text-sm" data-testid={`text-kitchen-email-${staff.id}`}>
                          {staff.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
