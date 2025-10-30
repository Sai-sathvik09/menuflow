import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OrderCard } from "@/components/order-card";
import { type Order, type Vendor } from "@shared/schema";
import { DollarSign, ShoppingBag, Clock, TrendingUp, Plus } from "lucide-react";
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
  const [isWaiterDialogOpen, setIsWaiterDialogOpen] = useState(false);
  const [waiterEmail, setWaiterEmail] = useState("");
  const [waiterPassword, setWaiterPassword] = useState("");
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

  // Fetch waiters for owners
  const { data: waiters = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/auth/waiters", vendor?.id],
    enabled: !!vendor?.id && vendor?.role === "owner",
  });

  // Fetch kitchen staff for owners
  const { data: kitchenStaff = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/auth/kitchen", vendor?.id],
    enabled: !!vendor?.id && vendor?.role === "owner",
  });

  // Mutation to create waiter
  const createWaiter = useMutation({
    mutationFn: async (data: { ownerId: string; email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/waiters", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/waiters", vendor?.id] });
      setIsWaiterDialogOpen(false);
      setWaiterEmail("");
      setWaiterPassword("");
      toast({
        title: "Success!",
        description: "Waiter account created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create waiter account",
        variant: "destructive",
      });
    },
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

  const handleCreateWaiter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor?.id || !waiterEmail || !waiterPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createWaiter.mutate({
      ownerId: vendor.id,
      email: waiterEmail,
      password: waiterPassword,
    });
  };

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

  const stats = {
    totalOrders: orders.length,
    activeOrders: orders.filter(o => o.status !== "completed").length,
    totalRevenue: orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0).toFixed(2),
    avgOrderValue: orders.length > 0 
      ? (orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0) / orders.length).toFixed(2)
      : "0.00",
  };

  const recentOrders = orders.filter(o => o.status !== "completed").slice(0, 3);

  // Helper function to get staff count label
  const getStaffCountLabel = (current: number, type: 'waiter' | 'kitchen') => {
    if (vendor?.subscriptionTier === "elite") {
      return `${current} ${type === 'waiter' ? 'waiters' : 'kitchen staff'} (unlimited)`;
    }
    if (vendor?.subscriptionTier === "pro") {
      return `${current}/2 ${type === 'waiter' ? 'waiters' : 'kitchen staff'}`;
    }
    return '';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders Today</CardTitle>
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display" data-testid="text-total-orders">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">All orders placed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
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
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
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
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
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

      {/* Staff Accounts Section - Only for Owners */}
      {vendor?.role === "owner" && (
        <>
          {/* Starter Tier Message */}
          {vendor.subscriptionTier === "starter" && (
            <div>
              <h2 className="text-2xl font-bold font-display mb-4">Staff Accounts</h2>
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground" data-testid="text-starter-message">
                    Staff accounts are available on Pro and Elite plans
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Waiter Accounts (Pro and Elite only) */}
          {vendor.subscriptionTier !== "starter" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold font-display">
                  Waiter Accounts
                  {vendor.subscriptionTier && (
                    <span className="text-sm font-normal text-muted-foreground ml-3" data-testid="text-waiter-count">
                      {getStaffCountLabel(waiters.length, 'waiter')}
                    </span>
                  )}
                </h2>
                <Dialog open={isWaiterDialogOpen} onOpenChange={setIsWaiterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-waiter">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Waiter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Waiter Account</DialogTitle>
                      <DialogDescription>
                        Create a new waiter account. They can use these credentials to log in and manage orders.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateWaiter} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="waiter-email">Email</Label>
                        <Input
                          id="waiter-email"
                          type="email"
                          placeholder="waiter@example.com"
                          value={waiterEmail}
                          onChange={(e) => setWaiterEmail(e.target.value)}
                          required
                          data-testid="input-waiter-email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="waiter-password">Password</Label>
                        <Input
                          id="waiter-password"
                          type="password"
                          placeholder="Enter password"
                          value={waiterPassword}
                          onChange={(e) => setWaiterPassword(e.target.value)}
                          required
                          minLength={6}
                          data-testid="input-waiter-password"
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsWaiterDialogOpen(false)}
                          data-testid="button-cancel-waiter"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createWaiter.isPending}
                          data-testid="button-submit-waiter"
                        >
                          {createWaiter.isPending ? "Creating..." : "Create Account"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Waiter List</CardTitle>
                </CardHeader>
                <CardContent>
                  {waiters.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-waiters">
                      No waiter accounts yet. Click "Add Waiter" to create one.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {waiters.map((waiter) => (
                        <div
                          key={waiter.id}
                          className="flex items-center justify-between gap-4 p-3 bg-muted rounded-md"
                          data-testid={`waiter-${waiter.id}`}
                        >
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Email</p>
                            <p className="font-medium font-mono text-sm" data-testid={`text-waiter-email-${waiter.id}`}>
                              {waiter.email}
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

          {/* Kitchen Staff Accounts (Pro and Elite only) */}
          {vendor.subscriptionTier !== "starter" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold font-display">
                  Kitchen Staff Accounts
                  {vendor.subscriptionTier && (
                    <span className="text-sm font-normal text-muted-foreground ml-3" data-testid="text-kitchen-count">
                      {getStaffCountLabel(kitchenStaff.length, 'kitchen')}
                    </span>
                  )}
                </h2>
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
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-kitchen">
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
        </>
      )}
    </div>
  );
}
