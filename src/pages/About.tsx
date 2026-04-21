import { Link } from "react-router-dom";
import { Users, Sparkles, MapPin, ShieldCheck, MessageSquareHeart, Store } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const VALUES = [
  {
    icon: Store,
    title: "Local first",
    body: "We surface independent shops, cafés, and makers — not the chains that already get all the attention.",
  },
  {
    icon: ShieldCheck,
    title: "Real reviews",
    body: "Verified visits and community moderation keep ratings honest and useful.",
  },
  {
    icon: MessageSquareHeart,
    title: "Built for neighbors",
    body: "Bookmarks, check-ins, and the Pulse widget surface what's actually trending around you.",
  },
  {
    icon: Sparkles,
    title: "AI that helps",
    body: "Ask Huddle Bot for recommendations in plain language — it knows your local listings.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container py-14 md:py-20 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 mb-4 opacity-90">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wider">About Huddle</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">A neighborhood, in your pocket.</h1>
          <p className="text-base md:text-lg opacity-90">
            Huddle is the friendlier way to discover the small businesses, hidden gems, and trusted
            services around you — and to share them with the people who live nearby.
          </p>
        </div>
      </section>

      <main id="main" className="container py-12 space-y-16">
        {/* Mission */}
        <section className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">Why Huddle exists</h2>
            <p className="text-muted-foreground leading-relaxed">
              The big review sites are loud, gamed, and built for chains. Huddle is built for the
              independent coffee shop on the corner, the tailor everyone in the neighborhood quietly
              relies on, and the new bakery your friend hasn't told you about yet.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We pair real community reviews with light AI assistance so you can spend less time
              searching and more time showing up.
            </p>
          </div>
          <Card className="p-6 bg-gradient-card shadow-card">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Hyper-local by design</h3>
                <p className="text-sm text-muted-foreground">
                  Listings are tied to actual neighborhoods. The Pulse widget shows what's getting
                  bookmarked and visited near you in real time.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Values grid */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">What we believe</h2>
            <p className="text-muted-foreground">A few principles guide everything we build.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-5 hover:shadow-elegant transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section>
          <Card className="p-8 md:p-10 bg-gradient-primary text-primary-foreground text-center shadow-elegant">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Own a local business?</h2>
            <p className="opacity-90 max-w-xl mx-auto mb-6">
              List it on Huddle in a few minutes and start reaching neighbors who actually want to
              support you.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg" variant="secondary">
                <Link to="/business/onboarding">List your business</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/">Explore Huddle</Link>
              </Button>
            </div>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
