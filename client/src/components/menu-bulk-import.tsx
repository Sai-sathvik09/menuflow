import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface ImportResult {
  success: boolean;
  itemsImported: number;
  errors?: string[];
}

export function MenuBulkImport() {
  const { toast } = useToast();
  const { vendor } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const downloadTemplate = () => {
    const csvTemplate = `name,description,price,category,image,tags,available
Masala Dosa,Crispy rice crepe filled with spiced potato curry,3.99,Dosas,https://example.com/dosa.jpg,vegetarian|spicy,true
Plain Dosa,Traditional South Indian rice crepe served with chutney,2.99,Dosas,,vegetarian,true
Pani Puri,Crispy hollow puris filled with spiced water,1.99,Chaats,,vegetarian|spicy,true
Samosa Chaat,Samosas topped with chickpeas and chutneys,4.99,Chaats,,vegetarian,true
Masala Chai,Traditional Indian spiced tea,1.50,Beverages,,vegetarian,true
Mango Lassi,Refreshing yogurt-based mango drink,2.99,Beverages,,vegetarian,true`;

    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Template downloaded",
      description: "Edit the CSV file and upload it to import your menu",
    });
  };

  const importMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const response = await fetch('/api/menu/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: vendor?.id,
          csvData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import CSV');
      }

      return response.json();
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/menu", vendor?.id] });
      
      if (data.errors && data.errors.length > 0) {
        toast({
          title: "Import completed with warnings",
          description: `${data.itemsImported} items imported. Check details below.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Import successful",
          description: `${data.itemsImported} menu items imported successfully`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import CSV file",
        variant: "destructive",
      });
    },
  });

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target?.result as string;
      importMutation.mutate(csvData);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Bulk Import Menu Items
        </CardTitle>
        <CardDescription>
          Upload a CSV file to quickly add multiple menu items at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="gap-2"
            data-testid="button-download-template"
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleChange}
            className="hidden"
            data-testid="input-file-upload"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-muted">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Drop your CSV file here, or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports .csv files with menu item data
              </p>
            </div>
          </div>
        </div>

        {importMutation.isPending && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Importing menu items...</p>
            <Progress value={undefined} className="w-full" />
          </div>
        )}

        {importResult && (
          <Alert variant={importResult.errors && importResult.errors.length > 0 ? "default" : "default"}>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  Import completed: {importResult.itemsImported} items added
                </p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-destructive mb-1">Warnings:</p>
                    <ul className="text-sm space-y-1">
                      {importResult.errors.slice(0, 5).map((error, idx) => (
                        <li key={idx} className="text-muted-foreground">• {error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li className="text-muted-foreground">
                          • ... and {importResult.errors.length - 5} more warnings
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground space-y-1 border-t pt-4">
          <p className="font-medium">CSV Format Requirements:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Required columns: <span className="font-mono text-xs">name, price, category</span></li>
            <li>Optional columns: <span className="font-mono text-xs">description, image, tags, available</span></li>
            <li>Separate multiple tags with | (e.g., vegetarian|spicy)</li>
            <li>Set available to false or 0 to mark items as unavailable</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
