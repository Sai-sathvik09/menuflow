import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderCard } from "@/components/order-card";
import { BillModal } from "@/components/bill-modal";
import { type Order, type Bill, type MenuItem, type Table } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, X, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useWebSocket } from "@/lib/use-websocket";

export default function Orders() {
  const { toast } = useToast();
  const { vendor } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  
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

  // Fetch menu items for order creation
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu", effectiveVendorId],
    enabled: !!effectiveVendorId,
  });

  // Fetch tables for order creation (Pro/Elite only)
  const isProOrElite = vendor?.subscriptionTier === "pro" || vendor?.subscriptionTier === "elite";
  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["/api/tables", effectiveVendorId],
    enabled: !!effectiveVendorId && isProOrElite,
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

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderItems = Object.entries(selectedItems).map(([itemId, quantity]) => {
        const menuItem = menuItems.find(m => m.id === itemId);
        if (!menuItem) throw new Error("Menu item not found");
        return {
          menuItemId: itemId,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
        };
      });

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: effectiveVendorId,
          tableId: selectedTableId || null,
          items: orderItems,
          customerName: customerName || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      return response.json();
    },
    onSuccess: () => {
      if (effectiveVendorId) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders", effectiveVendorId] });
      }
      toast({
        title: "Order created",
        description: "New order has been added successfully",
      });
      setIsCreateOrderOpen(false);
      setSelectedItems({});
      setCustomerName("");
      setSelectedTableId("");
    },
    onError: (error: any) => {
      toast({
        title: "Create failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleAddItem = (itemId: string) => {
    setSelectedItems(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const handleRemoveItemFromCart = (itemId: string) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      if (newItems[itemId] > 1) {
        newItems[itemId]--;
      } else {
        delete newItems[itemId];
      }
      return newItems;
    });
  };

  const calculateTotal = () => {
    return Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
      const menuItem = menuItems.find(m => m.id === itemId);
      return total + (menuItem ? parseFloat(menuItem.price) * quantity : 0);
    }, 0).toFixed(2);
  };

  const canCreateOrder = Object.keys(selectedItems).length > 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-display">Live Orders</h1>
          <p className="text-muted-foreground mt-1">Manage incoming orders in real-time</p>
        </div>
        <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-create-order">
              <Plus className="w-4 h-4" />
              Create Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
              <DialogDescription>
                Select menu items and assign to a table
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Customer Details */}
              <div className="space-y-3">
                <Label>Customer Name (Optional)</Label>
                <Input
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  data-testid="input-customer-name"
                />
              </div>

              {/* Table Selection */}
              {isProOrElite && tables.length > 0 && (
                <div className="space-y-3">
                  <Label>Table (Optional)</Label>
                  <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                    <SelectTrigger data-testid="select-table">
                      <SelectValue placeholder="Select a table" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No table</SelectItem>
                      {tables.map(table => (
                        <SelectItem key={table.id} value={table.id}>
                          Table {table.tableNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selected Items */}
              {Object.keys(selectedItems).length > 0 && (
                <div className="space-y-3">
                  <Label>Selected Items</Label>
                  <div className="space-y-2">
                    {Object.entries(selectedItems).map(([itemId, quantity]) => {
                      const menuItem = menuItems.find(m => m.id === itemId);
                      if (!menuItem) return null;
                      return (
                        <div key={itemId} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                          <div className="flex-1">
                            <div className="font-medium">{menuItem.name}</div>
                            <div className="text-sm text-muted-foreground">${menuItem.price}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => handleRemoveItemFromCart(itemId)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => handleAddItem(itemId)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="font-semibold w-20 text-right">
                            ${(parseFloat(menuItem.price) * quantity).toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-bold text-primary">${calculateTotal()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Items */}
              <div className="space-y-3">
                <Label>Menu Items</Label>
                <div className="grid gap-2">
                  {menuItems.filter(item => item.isAvailable).map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover-elevate transition-all cursor-pointer"
                      onClick={() => handleAddItem(item.id)}
                      data-testid={`menu-item-${item.id}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        )}
                      </div>
                      <div className="font-semibold text-primary">${item.price}</div>
                      {selectedItems[item.id] && (
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          {selectedItems[item.id]}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {menuItems.filter(item => item.isAvailable).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No menu items available
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOrderOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createOrderMutation.mutate()}
                disabled={!canCreateOrder || createOrderMutation.isPending}
                className="gap-2"
                data-testid="button-submit-order"
              >
                <ShoppingCart className="w-4 h-4" />
                Create Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
