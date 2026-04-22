import { Link } from "react-router-dom";
import { ArrowRight, Search, Sparkles, MapPin, Users, Star, Bookmark, MessageSquare } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/Reveal";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <div className="container py-20 md:py-28 flex flex-col items-center text-center gap-6 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Discover the heartbeat of your neighborhood
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Welcome to <span className="text-primary">Huddle</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              A community-powered way to find, review, and rally around the local businesses
              that make your town worth showing up for.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="lg">
                <Link to="/discover">
                  Start Discovering Businesses <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/about">Learn more</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* What is Huddle */}
        <section className="container py-16 md:py-20">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                title: "Find local gems",
                body: "Search by category, vibe, or proximity. Pull in nearby spots from Google or browse trusted Huddle listings.",
              },
              {
                icon: Users,
                title: "Powered by neighbors",
                body: "Real check-ins, real reviews, real recommendations from people who actually live and shop locally.",
              },
              {
                icon: MapPin,
                title: "Built for your block",
                body: "Set preferences, save favorites, and see what's trending around you in real time.",
              },
            ].map((f) => (
              <Card key={f.title} className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y bg-muted/30">
          <div className="container py-16 md:py-20">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold">How Huddle works</h2>
              <p className="text-muted-foreground">Three simple steps to get plugged into your local scene.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Search, step: "01", title: "Discover", body: "Browse curated local businesses or search nearby places that match your taste." },
                { icon: Bookmark, step: "02", title: "Save & check in", body: "Bookmark favorites, log visits, and build your own personal Huddle." },
                { icon: Star, step: "03", title: "Share the love", body: "Leave honest reviews and help great local spots stand out." },
              ].map((s) => (
                <Card key={s.step} className="p-6 space-y-3 relative">
                  <span className="absolute top-4 right-4 text-xs font-mono text-muted-foreground">{s.step}</span>
                  <div className="h-10 w-10 rounded-md bg-accent/30 text-accent-foreground flex items-center justify-center">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* For business owners */}
        <section className="container py-16 md:py-20">
          <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-medium text-primary">
                  <MessageSquare className="h-4 w-4" /> For business owners
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">Get found by your community</h2>
                <p className="text-muted-foreground">
                  List your business, share what makes it special, and get in front of locals
                  actively looking for places like yours. Track views, check-ins, and reviews
                  with built-in insights.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/business/onboarding">List your business <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/insights">See insights</Link>
                  </Button>
                </div>
              </div>
              <ul className="space-y-3 text-sm">
                {[
                  "Real-time view & interaction tracking",
                  "Customer reviews and star ratings",
                  "Featured placement opportunities",
                  "Export your business performance data",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </section>

        {/* Final CTA */}
        <section className="container pb-20">
          <div className="text-center max-w-2xl mx-auto space-y-5">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to explore your neighborhood?</h2>
            <p className="text-muted-foreground">
              Jump in and see what's happening around you right now.
            </p>
            <Button asChild size="lg">
              <Link to="/discover">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
