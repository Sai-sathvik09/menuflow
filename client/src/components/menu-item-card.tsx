import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type MenuItem } from "@shared/schema";
import { Plus, Minus, Flame, Leaf, AlertCircle, UtensilsCrossed } from "lucide-react";

interface MenuItemCardProps {
  item: MenuItem;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  readonly?: boolean;
}

const dietaryIcons: Record<string, { icon: typeof Flame; label: string; color: string }> = {
  spicy: { icon: Flame, label: "Spicy", color: "text-destructive" },
  vegetarian: { icon: Leaf, label: "Vegetarian", color: "text-accent" },
  vegan: { icon: Leaf, label: "Vegan", color: "text-accent" },
};

export function MenuItemCard({ item, quantity = 0, onQuantityChange, readonly = false }: MenuItemCardProps) {
  const handleIncrement = () => {
    if (onQuantityChange && item.isAvailable) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (onQuantityChange && quantity > 0) {
      onQuantityChange(quantity - 1);
    }
  };

  return (
    <Card
      className={`overflow-hidden hover-elevate transition-all duration-300 ${
        !item.isAvailable ? "opacity-60" : ""
      }`}
      data-testid={`card-menu-item-${item.id}`}
    >
      <div className="relative aspect-[16/9] bg-muted">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-accent/5">
            <UtensilsCrossed className="w-16 h-16 text-muted-foreground/40" />
          </div>
        )}

        {/* Dietary Tags */}
        {item.dietaryTags && item.dietaryTags.length > 0 && (
          <div className="absolute top-2 left-2 flex gap-1.5">
            {item.dietaryTags.map((tag) => {
              const config = dietaryIcons[tag.toLowerCase()];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <div
                  key={tag}
                  className="bg-card/95 backdrop-blur-sm rounded-full p-1.5"
                  title={config.label}
                >
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                </div>
              );
            })}
          </div>
        )}

        {!item.isAvailable && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Badge variant="destructive" className="gap-1.5 text-sm py-1.5 px-3">
              <AlertCircle className="w-4 h-4" />
              Sold Out
            </Badge>
          </div>
        )}

        {/* Add Button (only when not readonly and available) */}
        {!readonly && item.isAvailable && quantity === 0 && (
          <Button
            size="icon"
            className="absolute bottom-2 right-2 rounded-full shadow-lg"
            onClick={handleIncrement}
            data-testid={`button-add-${item.id}`}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg leading-tight" data-testid={`text-item-name-${item.id}`}>
                {item.name}
              </h3>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <span className="text-xl font-bold text-primary font-display whitespace-nowrap" data-testid={`text-price-${item.id}`}>
              ${item.price}
            </span>
          </div>

          {/* Quantity Controls */}
          {!readonly && quantity > 0 && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                size="icon"
                variant="outline"
                className="rounded-full h-8 w-8"
                onClick={handleDecrement}
                data-testid={`button-decrease-${item.id}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <span className="text-lg font-bold min-w-[2rem] text-center" data-testid={`text-quantity-${item.id}`}>
                {quantity}
              </span>
              <Button
                size="icon"
                className="rounded-full h-8 w-8"
                onClick={handleIncrement}
                data-testid={`button-increase-${item.id}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
