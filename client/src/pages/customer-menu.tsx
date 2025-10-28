import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MenuItemCard } from "@/components/menu-item-card";
import { type MenuItem } from "@shared/schema";
import { Search, ShoppingCart, X } from "lucide-react";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function CustomerMenu() {
  const [, params] = useRoute("/menu/:vendorId");
  const [, tableParams] = useRoute("/menu/:vendorId/table/:tableId");
  const { toast } = useToast();

  const vendorId = params?.vendorId || tableParams?.vendorId;
  const tableId = tableParams?.tableId;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState("");

  // Fetch menu items (will be implemented in backend phase)
  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu", vendorId],
    enabled: !!vendorId,
  });

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(menuItems.map(item => item.category));
    return ["all", ...Array.from(cats)];
  }, [menuItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  const handleQuantityChange = (itemId: string, quantity: number) => {
    if (quantity === 0) {
      const newCart = { ...cart };
      delete newCart[itemId];
      setCart(newCart);
    } else {
      setCart({ ...cart, [itemId]: quantity });
    }
  };

  const cartItems = useMemo(() => {
    return Object.entries(cart).map(([itemId, quantity]) => {
      const item = menuItems.find(i => i.id === itemId);
      return item ? { ...item, quantity } : null;
    }).filter(Boolean) as (MenuItem & { quantity: number })[];
  }, [cart, menuItems]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  }, [cartItems]);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart first",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderData = {
        vendorId: vendorId!,
        tableId: tableId || null,
        items: cartItems.map(item => ({
          menuItemId: item.id,
          name: item.name,
          price: String(item.price),
          quantity: item.quantity,
        })),
        totalAmount: totalAmount.toFixed(2),
        customerName: customerName || null,
        status: "new" as const,
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error("Failed to place order");
      }

      const order = await response.json();

      toast({
        title: "Order placed!",
        description: `Your order number is #${order.orderNumber}. We'll prepare it shortly!`,
      });

      // Clear cart
      setCart({});
      setCustomerName("");
      setShowCart(false);
    } catch (error: any) {
      toast({
        title: "Order failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  if (!vendorId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Invalid menu link</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold font-display text-primary">MenuFlow</h1>
            <Button
              variant="default"
              className="gap-2 relative"
              onClick={() => setShowCart(!showCart)}
              data-testid="button-cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {Object.keys(cart).length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                  {Object.keys(cart).length}
                </Badge>
              )}
              <span className="hidden sm:inline">Cart</span>
            </Button>
          </div>

          {tableId && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Badge variant="outline" className="font-semibold">
                Table {tableId}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className="capitalize whitespace-nowrap"
                data-testid={`button-category-${category}`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading menu...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No items found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                quantity={cart[item.id] || 0}
                onQuantityChange={(qty) => handleQuantityChange(item.id, qty)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cart Sidebar/Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 md:hidden" onClick={() => setShowCart(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold font-display">Your Order</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowCart(false)} data-testid="button-close-cart">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {cartItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.quantity}x ${item.price}</p>
                        </div>
                        <p className="font-bold">${(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <Input
                      placeholder="Your name (optional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mb-4"
                      data-testid="input-customer-name"
                    />
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xl font-semibold">Total</span>
                      <span className="text-3xl font-bold text-primary font-display" data-testid="text-total">
                        ${totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <Button className="w-full text-lg py-6" onClick={handlePlaceOrder} data-testid="button-place-order">
                      Place Order
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Cart */}
      <div className="hidden md:block fixed right-0 top-0 bottom-0 w-96 bg-card border-l shadow-xl overflow-y-auto">
        <div className="p-6 space-y-4">
          <h2 className="text-2xl font-bold font-display">Your Order</h2>

          {cartItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
          ) : (
            <>
              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.quantity}x ${item.price}</p>
                    </div>
                    <p className="font-bold">${(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <Input
                  placeholder="Your name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mb-4"
                  data-testid="input-customer-name"
                />
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-semibold">Total</span>
                  <span className="text-3xl font-bold text-primary font-display" data-testid="text-total">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
                <Button className="w-full text-lg py-6" onClick={handlePlaceOrder} data-testid="button-place-order">
                  Place Order
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
