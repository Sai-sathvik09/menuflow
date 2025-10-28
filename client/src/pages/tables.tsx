import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QRCodeSVG } from "qrcode.react";
import { insertTableSchema, type Table, type InsertTable } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

export default function Tables() {
  const { toast } = useToast();
  const { vendor } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isProOrElite = vendor?.subscriptionTier === "pro" || vendor?.subscriptionTier === "elite";

  // Fetch tables (will be implemented in backend phase)
  const { data: tables = [], isLoading } = useQuery<Table[]>({
    queryKey: ["/api/tables", vendor?.id],
    enabled: isProOrElite,
  });

  const form = useForm<InsertTable>({
    resolver: zodResolver(insertTableSchema),
    defaultValues: {
      vendorId: vendor?.id || "",
      tableNumber: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTable) => {
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create table");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", vendor?.id] });
      toast({
        title: "Table created",
        description: "New table has been added successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Create failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tableId: string) => {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete table");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", vendor?.id] });
      toast({
        title: "Table deleted",
        description: "Table has been removed",
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

  const handleSubmit = (data: InsertTable) => {
    createMutation.mutate(data);
  };

  const handleDelete = (tableId: string) => {
    if (confirm("Are you sure you want to delete this table?")) {
      deleteMutation.mutate(tableId);
    }
  };

  const handleDownloadQR = (tableNumber: string) => {
    toast({
      title: "Download functionality",
      description: "Backend integration coming soon",
    });
  };

  if (!isProOrElite) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display">Table Management</CardTitle>
            <CardDescription className="text-base">
              Upgrade to Pro or Elite to access table-specific QR codes and table management features
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Perfect for restaurants - each table gets its own QR code that automatically assigns orders to the right table
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Table Management</h1>
          <p className="text-muted-foreground mt-1">Manage your restaurant tables and QR codes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-table">
              <Plus className="w-4 h-4" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Table</DialogTitle>
              <DialogDescription>
                Create a new table with its own unique QR code
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="tableNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table Number</FormLabel>
                      <FormControl>
                        <Input placeholder="1, 2, A1, etc." {...field} data-testid="input-table-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-save">
                    Create Table
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading tables...</div>
      ) : tables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-4">No tables yet</p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Table
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tables.map(table => {
            const tableUrl = `${window.location.origin}/menu/${vendor?.id}/table/${table.tableNumber}`;
            
            return (
              <Card key={table.id} className="hover-elevate transition-all duration-300" data-testid={`card-table-${table.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-display flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Table {table.tableNumber}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {table.isActive ? (
                          <Badge variant="outline" className="bg-status-ready/10 text-status-ready border-status-ready/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(table.id)}
                      data-testid={`button-delete-${table.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center p-4 bg-background rounded-lg border">
                    <QRCodeSVG
                      value={tableUrl}
                      size={160}
                      level="H"
                      includeMargin
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground break-all">{tableUrl}</p>
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      onClick={() => handleDownloadQR(table.tableNumber)}
                      data-testid={`button-download-${table.id}`}
                    >
                      <Download className="w-4 h-4" />
                      Download QR Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
