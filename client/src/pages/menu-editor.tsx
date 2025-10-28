import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMenuItemSchema, type MenuItem, type InsertMenuItem, VENDOR_CATEGORIES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MenuItemCard } from "@/components/menu-item-card";
import { MenuBulkImport } from "@/components/menu-bulk-import";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

const dietaryOptions = ["vegetarian", "vegan", "spicy", "gluten-free"];

export default function MenuEditor() {
  const { toast } = useToast();
  const { vendor } = useAuth();
  const queryClient = useQueryClient();
  
  // Get categories based on vendor's business type
  const businessType = (vendor?.businessType as keyof typeof VENDOR_CATEGORIES) || "restaurant";
  const categories = VENDOR_CATEGORIES[businessType] || VENDOR_CATEGORIES.restaurant;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Fetch menu items (will be implemented in backend phase)
  const { data: menuItems = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu", vendor?.id],
  });

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      vendorId: vendor?.id || "",
      name: "",
      description: "",
      price: "",
      category: categories[0] || "Main Course",
      imageUrl: "",
      isAvailable: true,
      dietaryTags: [],
    },
  });

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      form.reset({
        vendorId: item.vendorId,
        name: item.name,
        description: item.description || "",
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl || "",
        isAvailable: item.isAvailable,
        dietaryTags: item.dietaryTags || [],
      });
    } else {
      setEditingItem(null);
      form.reset({
        vendorId: vendor?.id || "",
        name: "",
        description: "",
        price: "",
        category: categories[0] || "Main Course",
        imageUrl: "",
        isAvailable: true,
        dietaryTags: [],
      });
    }
    setIsDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertMenuItem) => {
      const url = editingItem ? `/api/menu/${editingItem.id}` : "/api/menu";
      const method = editingItem ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save menu item");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu", vendor?.id] });
      toast({
        title: editingItem ? "Item updated" : "Item added",
        description: "Menu item has been saved successfully",
      });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete menu item");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu", vendor?.id] });
      toast({
        title: "Item deleted",
        description: "Menu item has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) => {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable }),
      });

      if (!response.ok) {
        throw new Error("Failed to update availability");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu", vendor?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertMenuItem) => {
    createMutation.mutate(data);
  };

  const handleDelete = (itemId: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(itemId);
    }
  };

  const toggleAvailability = (itemId: string, isAvailable: boolean) => {
    toggleMutation.mutate({ itemId, isAvailable });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Menu Editor</h1>
          <p className="text-muted-foreground mt-1">Manage your menu items and pricing</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => handleOpenDialog()} data-testid="button-add-item">
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
              <DialogDescription>
                Fill in the details for your menu item
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Spicy Chicken Tacos" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Delicious tacos with spicy chicken, fresh salsa, and guacamole"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="9.99" {...field} data-testid="input-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} value={field.value || ""} data-testid="input-image-url" />
                      </FormControl>
                      <FormDescription>Paste a link to your food image</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isAvailable"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Available</FormLabel>
                        <FormDescription>
                          Is this item currently available to order?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-available"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-save">
                    {editingItem ? "Update Item" : "Add Item"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <MenuBulkImport />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading menu...</div>
      ) : menuItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No menu items yet</p>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {menuItems.map(item => (
            <div key={item.id} className="relative group">
              <MenuItemCard item={item} readonly />
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full shadow-lg"
                  onClick={() => handleOpenDialog(item)}
                  data-testid={`button-edit-${item.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="rounded-full shadow-lg"
                  onClick={() => handleDelete(item.id)}
                  data-testid={`button-delete-${item.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-2">
                <Button
                  variant={item.isAvailable ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={() => toggleAvailability(item.id, !item.isAvailable)}
                  data-testid={`button-toggle-${item.id}`}
                >
                  {item.isAvailable ? "Mark as Sold Out" : "Mark as Available"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
