import { Link } from "react-router-dom";
import { ArrowRight, Users, Sparkles, MapPin, ShieldCheck, MessageSquareHeart, Store } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";

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
    <div className="min-h-screen bg-background flex flex-col">


      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/8" />
        <div className="container py-20 md:py-28">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
              About Huddle
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.04] text-foreground">
              A neighborhood,<br />in your pocket.
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Huddle is the friendlier way to discover the small businesses, hidden gems, and trusted
              services around you — and to share them with the people who live nearby.
            </p>
          </div>
        </div>
      </section>

      <main id="main" className="flex-1 container py-24 space-y-28">

        {/* Mission */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="space-y-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                Our mission
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.1]">
                Why Huddle exists
              </h2>
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
          </Reveal>

          <Reveal delay={120} variant="fade-left">
            <div className="p-[6px] rounded-[2rem] bg-primary/6 border border-primary/15 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.08)]">
              <div className="rounded-[calc(2rem-6px)] bg-background p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg tracking-tight">Hyper-local by design</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Listings are tied to actual neighborhoods. The Pulse widget shows what's getting
                      bookmarked and visited near you in real time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Values */}
        <section className="space-y-12">
          <Reveal>
            <div className="space-y-3 max-w-xl">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                Our values
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">What we believe</h2>
              <p className="text-muted-foreground leading-relaxed">
                A few principles guide everything we build.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-4">
            {VALUES.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="p-[6px] rounded-[2rem] bg-foreground/[0.03] border border-border/50 h-full">
                  <div className="rounded-[calc(2rem-6px)] bg-background h-full p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] flex gap-5 items-start transition-shadow duration-500 hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)]">
                    <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section>
          <Reveal variant="scale">
            <div className="p-[6px] rounded-[2.5rem] bg-gradient-to-br from-primary/12 via-background to-accent/8 border border-primary/15">
              <div className="rounded-[calc(2.5rem-6px)] bg-background/80 px-10 py-14 md:px-16 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
                  <div className="space-y-3">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Own a local business?</h2>
                    <p className="text-muted-foreground leading-relaxed max-w-lg">
                      List it on Huddle in a few minutes and start reaching neighbors who actually want to support you.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 self-start md:self-auto">
                    <Button
                      asChild
                      size="lg"
                      className="rounded-full pl-6 pr-2 gap-3 group whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                    >
                      <Link to="/business/onboarding">
                        List your business
                        <span className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="rounded-full px-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                    >
                      <Link to="/">Explore Huddle</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default About;
