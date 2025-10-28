import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { type Order } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Hash, MapPin } from "lucide-react";

interface OrderCardProps {
  order: Order & { table?: { tableNumber: string } | null };
  onStatusChange?: (orderId: string, newStatus: Order["status"]) => void;
}

export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const getNextStatus = (currentStatus: Order["status"]): Order["status"] | null => {
    const statusFlow: Record<Order["status"], Order["status"] | null> = {
      new: "preparing",
      preparing: "ready",
      ready: "completed",
      completed: null,
    };
    return statusFlow[currentStatus];
  };

  const nextStatus = getNextStatus(order.status);

  const actionLabels: Record<Order["status"], string> = {
    new: "Start Preparing",
    preparing: "Mark Ready",
    ready: "Complete",
    completed: "Completed",
  };

  return (
    <Card 
      className="overflow-hidden hover-elevate transition-all duration-300"
      data-testid={`card-order-${order.id}`}
    >
      <CardHeader className="pb-3 space-y-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full">
              <Hash className="w-4 h-4" />
              <span className="text-2xl font-bold font-display" data-testid={`text-order-number-${order.orderNumber}`}>
                {order.orderNumber}
              </span>
            </div>
            {order.table && (
              <div className="flex items-center gap-1.5 bg-sidebar text-sidebar-foreground px-3 py-1.5 rounded-full text-sm font-medium">
                <MapPin className="w-3.5 h-3.5" />
                <span data-testid={`text-table-${order.table.tableNumber}`}>Table {order.table.tableNumber}</span>
              </div>
            )}
          </div>
          <StatusBadge status={order.status} />
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center text-sm py-1.5 px-3 rounded-md bg-muted/30"
              data-testid={`item-${order.id}-${idx}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground min-w-[1.5rem]">{item.quantity}x</span>
                <span className="font-medium">{item.name}</span>
              </div>
              <span className="font-semibold">${item.price}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-3 mt-3 border-t">
          <span className="font-semibold text-muted-foreground">Total</span>
          <span className="text-xl font-bold text-primary font-display" data-testid={`text-total-${order.id}`}>
            ${order.totalAmount}
          </span>
        </div>

        {order.customerName && (
          <div className="text-sm text-muted-foreground mt-2">
            Customer: <span className="font-medium text-foreground">{order.customerName}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center pt-3 border-t">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
        </span>
        {nextStatus && onStatusChange && (
          <Button
            onClick={() => onStatusChange(order.id, nextStatus)}
            className="font-semibold"
            data-testid={`button-status-${order.id}`}
          >
            {actionLabels[order.status]}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
