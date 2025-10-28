import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Zap, BarChart3, Sparkles } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold font-display text-foreground leading-tight">
            Welcome to{" "}
            <span className="text-primary">MenuFlow</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            The modern QR code-based digital menu platform that helps restaurants and street vendors streamline ordering and delight customers.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button size="lg" className="text-lg px-8" asChild data-testid="button-get-started">
              <Link href="/register">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild data-testid="button-login">
              <Link href="/login">Owner Login</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-6xl mx-auto">
          <Card className="hover-elevate transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <QrCode className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="font-display">Easy QR Ordering</CardTitle>
              <CardDescription className="text-base">
                Customers scan, browse, and order instantly—no app download required.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-status-preparing/20 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-status-preparing" />
              </div>
              <CardTitle className="font-display">Reduce Wait Times</CardTitle>
              <CardDescription className="text-base">
                Queue-busting workflow lets customers order while waiting, dramatically cutting line congestion.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate transition-all duration-300">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="font-display">Smart Analytics</CardTitle>
              <CardDescription className="text-base">
                Track popular items, peak hours, and sales trends to optimize your menu and operations.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Subscription Tiers */}
        <div className="mt-20 text-center max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">Choose Your Plan</h2>
          <p className="text-muted-foreground text-lg mb-12">
            Flexible plans designed for street vendors and restaurants of all sizes
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover-elevate transition-all duration-300">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Starter</CardTitle>
                <CardDescription className="text-base">Perfect for street vendors</CardDescription>
                <div className="text-4xl font-bold font-display text-primary py-4">Free</div>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Core QR menu system</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Live order tracking</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Basic menu customization</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Queue-busting workflow</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all duration-300 border-primary">
              <CardHeader>
                <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-semibold mb-2 self-start">
                  Most Popular
                </div>
                <CardTitle className="font-display text-2xl">Pro</CardTitle>
                <CardDescription className="text-base">For restaurants & cafes</CardDescription>
                <div className="text-4xl font-bold font-display text-primary py-4">
                  $29-79<span className="text-lg text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                <div className="font-semibold mb-2">Everything in Starter, plus:</div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Table-specific QR codes</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Table management system</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Waiter tablet access</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Basic CRM & analytics</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all duration-300">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Elite</CardTitle>
                <CardDescription className="text-base">Advanced features & AI</CardDescription>
                <div className="text-4xl font-bold font-display text-primary py-4">Custom</div>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                <div className="font-semibold mb-2">Everything in Pro, plus:</div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>AI analytics dashboard</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Wait time predictions</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Kiosk mode support</span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Priority support</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} MenuFlow. Streamlining hospitality, one order at a time.</p>
        </div>
      </div>
    </div>
  );
}
