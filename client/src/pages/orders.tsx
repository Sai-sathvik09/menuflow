import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderCard } from "@/components/order-card";
import { type Order } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useWebSocket } from "@/lib/use-websocket";

export default function Orders() {
  const { toast } = useToast();
  const { vendor } = useAuth();
  const queryClient = useQueryClient();
  
  // Connect to WebSocket for real-time order updates
  useWebSocket();

  // Fetch active (non-archived) orders
  const { data: allOrders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders", vendor?.id],
    enabled: !!vendor?.id,
  });

  // Fetch archived orders using the same pattern as active orders
  const { data: archivedOrders = [], isLoading: isLoadingArchived, isError: isErrorArchived } = useQuery<Order[]>({
    queryKey: ["/api/orders", vendor?.id, "archived"],
    enabled: !!vendor?.id,
  });

  const newOrders = allOrders.filter(o => o.status === "new");
  const preparingOrders = allOrders.filter(o => o.status === "preparing");
  const readyOrders = allOrders.filter(o => o.status === "ready");
  const completedOrders = allOrders.filter(o => o.status === "completed");

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: Order["status"] }) => {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      return response.json();
    },
    onSuccess: () => {
      if (vendor?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders", vendor.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/orders", vendor.id, "archived"] });
      }
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (orderId: string, newStatus: Order["status"]) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Live Orders</h1>
        <p className="text-muted-foreground mt-1">Manage incoming orders in real-time</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6 max-w-3xl">
          <TabsTrigger value="all" data-testid="tab-all">
            All ({allOrders.length})
          </TabsTrigger>
          <TabsTrigger value="new" data-testid="tab-new">
            New ({newOrders.length})
          </TabsTrigger>
          <TabsTrigger value="preparing" data-testid="tab-preparing">
            Preparing ({preparingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="ready" data-testid="tab-ready">
            Ready ({readyOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            History ({archivedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {allOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No orders yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="new" className="mt-6">
          {newOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No new orders
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {newOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preparing" className="mt-6">
          {preparingOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No orders being prepared
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {preparingOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ready" className="mt-6">
          {readyOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No orders ready for pickup
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {readyOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No completed orders</p>
                <p className="text-sm mt-2">Completed orders will auto-archive after 1 minute</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                These orders will be automatically moved to Order History after 1 minute
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {isLoadingArchived ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading order history...
              </CardContent>
            </Card>
          ) : isErrorArchived ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Failed to load archived orders
              </CardContent>
            </Card>
          ) : archivedOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No archived orders
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Order history - archived completed orders
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archivedOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
