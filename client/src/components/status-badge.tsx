import { Badge } from "@/components/ui/badge";
import { type OrderStatus } from "@shared/schema";
import { Clock, ChefHat, CheckCircle2, Package } from "lucide-react";

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    new: {
      label: "New",
      icon: Clock,
      className: "bg-status-new text-status-new-foreground border-status-new/30",
    },
    preparing: {
      label: "Preparing",
      icon: ChefHat,
      className: "bg-status-preparing text-status-preparing-foreground border-status-preparing/30",
    },
    ready: {
      label: "Ready",
      icon: CheckCircle2,
      className: "bg-status-ready text-status-ready-foreground border-status-ready/30",
    },
    completed: {
      label: "Completed",
      icon: Package,
      className: "bg-status-completed text-status-completed-foreground border-status-completed/30",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} ${className} font-medium gap-1.5 border`} data-testid={`badge-status-${status}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
}
