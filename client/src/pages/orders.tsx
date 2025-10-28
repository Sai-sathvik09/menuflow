import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderCard } from "@/components/order-card";
import { BillModal } from "@/components/bill-modal";
import { type Order, type Bill } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useWebSocket } from "@/lib/use-websocket";

export default function Orders() {
  const { toast } = useToast();
  const { vendor } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // Connect to WebSocket for real-time order updates
  useWebSocket();

  // For waiters, use owner's ID for queries. For owners, use their own ID
  const effectiveVendorId = vendor?.role === "waiter" && vendor?.ownerId 
    ? vendor.ownerId 
    : vendor?.id;

  // Fetch active (non-archived) orders
  const { data: allOrders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders", effectiveVendorId],
    enabled: !!effectiveVendorId,
  });

  // Fetch archived orders using the same pattern as active orders
  const { data: archivedOrders = [], isLoading: isLoadingArchived, isError: isErrorArchived } = useQuery<Order[]>({
    queryKey: ["/api/orders", effectiveVendorId, "archived"],
    enabled: !!effectiveVendorId,
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
      if (effectiveVendorId) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders", effectiveVendorId] });
        queryClient.invalidateQueries({ queryKey: ["/api/orders", effectiveVendorId, "archived"] });
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

  const removeItemMutation = useMutation({
    mutationFn: async ({ orderId, itemIndex }: { orderId: string; itemIndex: number }) => {
      // Get the order first
      const order = allOrders.find(o => o.id === orderId);
      if (!order) throw new Error("Order not found");

      // Remove the item at the specified index
      const updatedItems = order.items.filter((_, idx) => idx !== itemIndex);

      const response = await fetch(`/api/orders/${orderId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updatedItems }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove item");
      }

      return response.json();
    },
    onSuccess: () => {
      if (effectiveVendorId) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders", effectiveVendorId] });
        queryClient.invalidateQueries({ queryKey: ["/api/orders", effectiveVendorId, "archived"] });
      }
      toast({
        title: "Item removed",
        description: "Item has been removed from the order",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Remove failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleRemoveItem = (orderId: string, itemIndex: number) => {
    removeItemMutation.mutate({ orderId, itemIndex });
  };

  // Fetch bill for selected order
  const { data: selectedBill, isLoading: isBillLoading } = useQuery<Bill>({
    queryKey: ["/api/bills", selectedOrderId],
    enabled: !!selectedOrderId,
  });

  const handleViewBill = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  const handleCloseBill = () => {
    setSelectedOrderId(null);
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
                  onRemoveItem={handleRemoveItem}
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
                  onRemoveItem={handleRemoveItem}
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
                  onRemoveItem={handleRemoveItem}
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
                  onRemoveItem={handleRemoveItem}
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
                  <OrderCard 
                    key={order.id} 
                    order={order}
                    onViewBill={handleViewBill}
                  />
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
                  <OrderCard 
                    key={order.id} 
                    order={order}
                    onViewBill={handleViewBill}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BillModal
        bill={selectedBill || null}
        businessName={vendor?.businessName}
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && handleCloseBill()}
      />
    </div>
  );
}
