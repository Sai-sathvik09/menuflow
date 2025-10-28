import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Order, type MenuItem } from "@shared/schema";
import { BarChart3, TrendingUp, Clock, Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function Analytics() {
  const { vendor } = useAuth();
  const isProOrElite = vendor?.subscriptionTier === "pro" || vendor?.subscriptionTier === "elite";

  // Fetch orders and menu items
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders", vendor?.id],
    enabled: isProOrElite && !!vendor?.id,
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu", vendor?.id],
    enabled: isProOrElite && !!vendor?.id,
  });

  // Calculate analytics
  const itemCounts: Record<string, { count: number; revenue: number; name: string }> = {};
  
  orders.forEach(order => {
    order.items.forEach(item => {
      if (!itemCounts[item.menuItemId]) {
        itemCounts[item.menuItemId] = {
          count: 0,
          revenue: 0,
          name: item.name,
        };
      }
      itemCounts[item.menuItemId].count += item.quantity;
      itemCounts[item.menuItemId].revenue += parseFloat(item.price) * item.quantity;
    });
  });

  const sortedByCount = Object.entries(itemCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5);

  const leastOrdered = Object.entries(itemCounts)
    .sort(([, a], [, b]) => a.count - b.count)
    .slice(0, 5);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  if (!isProOrElite) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display">Analytics & Insights</CardTitle>
            <CardDescription className="text-base">
              Upgrade to Pro or Elite to access powerful analytics and business insights
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Track your most popular items, revenue trends, and make data-driven decisions to grow your business
            </p>
            <Button size="lg" className="gap-2">
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Analytics</h1>
        <p className="text-muted-foreground mt-1">Insights into your business performance</p>
        {vendor?.subscriptionTier === "elite" && (
          <Badge className="mt-2 gap-1.5" variant="outline">
            <Star className="w-3.5 h-3.5" />
            Elite AI Analytics (Coming Soon)
          </Badge>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display" data-testid="text-total-orders">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display text-primary" data-testid="text-total-revenue">
              ${totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display" data-testid="text-avg-order">
              ${avgOrderValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Items */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Most Ordered Items
            </CardTitle>
            <CardDescription>Your top sellers by quantity</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedByCount.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No data yet</p>
            ) : (
              <div className="space-y-3">
                {sortedByCount.map(([itemId, data], idx) => (
                  <div
                    key={itemId}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover-elevate"
                    data-testid={`item-top-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-sm text-muted-foreground">${data.revenue.toFixed(2)} revenue</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-semibold">
                      {data.count} sold
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Least Ordered Items
            </CardTitle>
            <CardDescription>Items that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            {leastOrdered.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No data yet</p>
            ) : (
              <div className="space-y-3">
                {leastOrdered.map(([itemId, data], idx) => (
                  <div
                    key={itemId}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover-elevate"
                    data-testid={`item-least-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-sm text-muted-foreground">${data.revenue.toFixed(2)} revenue</p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {data.count} sold
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {vendor?.subscriptionTier === "elite" && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription>Advanced analytics features coming soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>✨ Wait time predictions</p>
            <p>✨ Peak traffic analysis</p>
            <p>✨ Revenue forecasting</p>
            <p>✨ Menu optimization suggestions</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
