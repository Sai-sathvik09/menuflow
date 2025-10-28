import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderCard } from "@/components/order-card";
import { type Order } from "@shared/schema";
import { DollarSign, ShoppingBag, Clock, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useWebSocket } from "@/lib/use-websocket";

export default function Dashboard() {
  const { vendor } = useAuth();
  
  // Connect to WebSocket for real-time order updates
  useWebSocket();

  // Fetch orders
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders", vendor?.id],
    enabled: !!vendor?.id,
  });

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
    </div>
  );
}
