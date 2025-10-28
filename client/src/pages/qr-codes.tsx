import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Copy, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function QRCodes() {
  const { vendor } = useAuth();
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const menuUrl = `${window.location.origin}/menu/${vendor?.id}`;

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast({
      title: "URL copied!",
      description: "The menu URL has been copied to your clipboard",
    });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleDownloadQR = (qrId: string) => {
    const canvas = document.getElementById(qrId) as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `menuflow-qr-${qrId}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">QR Codes</h1>
        <p className="text-muted-foreground mt-1">Generate and download QR codes for your customers</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Menu QR Code */}
        <Card className="hover-elevate transition-all duration-300">
          <CardHeader>
            <CardTitle className="font-display">General Menu QR Code</CardTitle>
            <CardDescription>
              For street vendors - place multiple copies around your shop for queue-busting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center p-6 bg-background rounded-lg border-2 border-dashed">
              <QRCodeSVG
                id="general-qr"
                value={menuUrl}
                size={256}
                level="H"
                includeMargin
                data-testid="qr-general"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <code className="flex-1 text-sm break-all" data-testid="text-menu-url">{menuUrl}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleCopyUrl(menuUrl)}
                  data-testid="button-copy-url"
                >
                  {copiedUrl === menuUrl ? (
                    <Check className="w-4 h-4 text-status-ready" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  variant="outline"
                  onClick={() => handleDownloadQR("general-qr")}
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  className="flex-1 gap-2"
                  variant="outline"
                  onClick={handlePrint}
                  data-testid="button-print"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card className="hover-elevate transition-all duration-300">
          <CardHeader>
            <CardTitle className="font-display">How to Use QR Codes</CardTitle>
            <CardDescription>Best practices for implementing your QR codes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Download & Print</h4>
                  <p className="text-sm text-muted-foreground">
                    Download the QR code and print it in high quality (recommended: 4x4 inches minimum)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Place Strategically</h4>
                  <p className="text-sm text-muted-foreground">
                    For street vendors: place 2-3 QR codes where customers wait in line. For restaurants: use table-specific QR codes
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Add Instructions</h4>
                  <p className="text-sm text-muted-foreground">
                    Include text like "Scan to order" or "Skip the line - order ahead"
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Monitor Orders</h4>
                  <p className="text-sm text-muted-foreground">
                    Watch the Live Orders page for incoming customer orders in real-time
                  </p>
                </div>
              </div>
            </div>

            {vendor?.subscriptionTier === "starter" && (
              <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <h4 className="font-semibold text-primary mb-2">Upgrade to Pro</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Get table-specific QR codes for dine-in service and advanced table management
                </p>
                <Button size="sm" className="w-full">
                  Upgrade Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #general-qr,
          #general-qr * {
            visibility: visible;
          }
          #general-qr {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
}
