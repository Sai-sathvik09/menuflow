import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-primary/5 p-4">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-9xl font-bold font-display text-primary">404</h1>
          <h2 className="text-3xl font-bold font-display mt-4">Page Not Found</h2>
          <p className="text-muted-foreground mt-2 text-lg">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button asChild size="lg" className="gap-2" data-testid="button-home">
          <Link href="/">
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
