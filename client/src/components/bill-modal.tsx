import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, Receipt } from "lucide-react";
import { type Bill } from "@shared/schema";

interface BillModalProps {
  bill: Bill | null;
  businessName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillModal({ bill, businessName, open, onOpenChange }: BillModalProps) {
  const handlePrint = () => {
    // Create a print-friendly version in a new window
    const printWindow = window.open('', '_blank');
    if (printWindow && bill) {
      const content = document.getElementById('bill-content');
      if (content) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Bill #${bill.orderNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h2 { text-align: center; margin-bottom: 10px; }
                .bill-detail { display: flex; justify-content: space-between; margin: 5px 0; }
                .bill-item { background: #f3f4f6; padding: 10px; margin: 5px 0; border-radius: 5px; }
                .total { font-size: 1.5em; font-weight: bold; text-align: right; margin-top: 20px; }
                hr { margin: 15px 0; }
              </style>
            </head>
            <body>${content.innerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-bill">
        {!bill ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
                <Receipt className="w-5 h-5" />
                Bill Not Available
              </DialogTitle>
            </DialogHeader>
            <div className="py-8 text-center text-muted-foreground">
              <p>Bill is being generated...</p>
              <p className="text-sm mt-2">Bills are automatically created when orders are completed.</p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
                <Receipt className="w-5 h-5" />
                Bill #{bill.orderNumber}
              </DialogTitle>
            </DialogHeader>

        <div className="space-y-4 print:p-8" id="bill-content">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold font-display">{businessName || "MenuFlow"}</h2>
            <p className="text-sm text-muted-foreground">Order Bill</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Number:</span>
              <span className="font-semibold" data-testid="text-bill-order-number">
                #{bill.orderNumber}
              </span>
            </div>
            {bill.tableNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Table:</span>
                <span className="font-semibold" data-testid="text-bill-table">
                  {bill.tableNumber}
                </span>
              </div>
            )}
            {bill.customerName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold" data-testid="text-bill-customer">
                  {bill.customerName}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-semibold">
                {new Date(bill.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Items</h3>
            {bill.items.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-start gap-4 py-2 px-3 rounded-md bg-muted/30"
                data-testid={`bill-item-${idx}`}
              >
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    ${item.price} × {item.quantity}
                  </div>
                </div>
                <div className="font-semibold">
                  ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary font-display" data-testid="text-bill-total">
                ${bill.totalAmount}
              </span>
            </div>
          </div>

          <div className="pt-4 print:hidden">
            <Button
              onClick={handlePrint}
              className="w-full gap-2"
              data-testid="button-print-bill"
            >
              <Printer className="w-4 h-4" />
              Print Bill
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground print:block hidden">
            Thank you for your business!
          </div>
        </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
