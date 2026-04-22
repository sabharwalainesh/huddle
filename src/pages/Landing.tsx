import { Link } from "react-router-dom";
import { ArrowRight, Search, Sparkles, MapPin, Users, Star, Bookmark, MessageSquare } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main id="main" className="flex-1">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden min-h-[100dvh] flex items-center">
          {/* Ambient glow blobs */}
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-primary/6 blur-[140px] translate-x-1/3 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-accent/6 blur-[120px] -translate-x-1/4 translate-y-1/4" />
          </div>

          <div className="container pt-8 pb-24 md:pt-16 md:pb-32">
            <div className="grid md:grid-cols-[1fr_400px] gap-16 items-center">

              {/* Left: copy */}
              <div className="space-y-8">
                <Reveal delay={0}>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/6 px-3.5 py-1.5 text-[11px] font-semibold text-primary tracking-[0.14em] uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
                    Community-powered discovery
                  </span>
                </Reveal>

                <Reveal delay={80}>
                  <h1 className="text-5xl md:text-[4.5rem] font-bold tracking-[-0.03em] leading-[1.04]">
                    Find what makes<br />
                    your{" "}
                    <span className="text-primary">neighborhood</span>
                    <br />
                    worth showing up for.
                  </h1>
                </Reveal>

                <Reveal delay={160}>
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-[50ch]">
                    Real check-ins, real reviews, real recommendations from
                    people who actually live and shop where you do.
                  </p>
                </Reveal>

                <Reveal delay={240}>
                  <div className="flex flex-wrap gap-3">
                    {/* Button-in-button CTA */}
                    <Button
                      asChild
                      size="lg"
                      className="rounded-full pl-6 pr-2 gap-3 group transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                    >
                      <Link to="/discover">
                        Start Discovering
                        <span className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="rounded-full px-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                    >
                      <Link to="/about">Learn more</Link>
                    </Button>
                  </div>
                </Reveal>
              </div>

              {/* Right: decorative stat card */}
              <Reveal delay={320} variant="fade-left">
                <div className="relative hidden md:block animate-float">
                  {/* Outer shell (double-bezel) */}
                  <div className="p-[6px] rounded-[1.75rem] bg-foreground/[0.04] border border-border/50 shadow-[0_20px_48px_-16px_rgba(0,0,0,0.1)]">
                    {/* Inner core */}
                    <div className="rounded-[calc(1.75rem-6px)] bg-background p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
                        Active this week
                      </p>
                      <div className="space-y-5">
                        {[
                          { label: "Local businesses", value: "2,847" },
                          { label: "Neighbor reviews", value: "14,392" },
                          { label: "Check-ins today", value: "318" },
                        ].map((s) => (
                          <div key={s.label} className="flex items-baseline justify-between gap-4">
                            <span className="text-sm text-muted-foreground">{s.label}</span>
                            <span className="text-2xl font-bold tracking-tight tabular-nums">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Floating preview card */}
                  <div className="absolute -bottom-5 -left-8 p-[4px] rounded-2xl bg-background border border-border/60 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.12)]">
                    <div className="rounded-[calc(1rem-4px)] bg-background px-4 py-3 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">Rosario's Bakery</p>
                        <div className="flex items-center gap-0.5 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < 5 ? "text-warning fill-warning" : "text-border"}`}
                              strokeWidth={1}
                            />
                          ))}
                          <span className="text-[10px] text-muted-foreground ml-1.5 tabular-nums">4.9 · 47 reviews</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────── */}
        <section className="container py-28 md:py-36">
          <Reveal>
            <div className="mb-16 space-y-3 max-w-xl">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                Why Huddle
              </span>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                Built around the places that matter to you
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Large card */}
            <Reveal delay={0}>
              <div className="p-[6px] rounded-[2rem] bg-foreground/[0.03] border border-border/50 h-full">
                <div className="rounded-[calc(2rem-6px)] bg-background h-full p-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] flex flex-col gap-7">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Search className="h-5.5 w-5.5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-2.5 flex-1">
                    <h3 className="text-xl font-semibold tracking-tight">Find local gems</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Search by category, vibe, or proximity. Pull in nearby spots from Google or browse trusted Huddle listings.
                    </p>
                  </div>
                  <div className="pt-5 border-t border-border/60">
                    <Link
                      to="/discover"
                      className="text-sm font-medium text-primary inline-flex items-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:gap-3"
                    >
                      Start exploring <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Stacked right column */}
            <div className="flex flex-col gap-4">
              <Reveal delay={100}>
                <div className="p-[6px] rounded-[2rem] bg-primary/5 border border-primary/12">
                  <div className="rounded-[calc(2rem-6px)] bg-background p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] flex gap-5 items-start">
                    <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-semibold tracking-tight">Powered by neighbors</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Real check-ins, real reviews from people who live and shop locally.
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={200}>
                <div className="p-[6px] rounded-[2rem] bg-accent/5 border border-accent/15">
                  <div className="rounded-[calc(2rem-6px)] bg-background p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] flex gap-5 items-start">
                    <div className="h-11 w-11 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="h-5 w-5 text-accent" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-semibold tracking-tight">Built for your block</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Set preferences, save favorites, and see what's trending around you in real time.
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────── */}
        <section className="border-y bg-muted/20">
          <div className="container py-28 md:py-36">
            <Reveal>
              <div className="mb-16 space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                  Simple to start
                </span>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  How Huddle works
                </h2>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-px bg-border/50 rounded-3xl overflow-hidden border border-border/50 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.04)]">
              {[
                {
                  icon: Search,
                  step: "01",
                  title: "Discover",
                  body: "Browse curated local businesses or search nearby places that match your taste.",
                },
                {
                  icon: Bookmark,
                  step: "02",
                  title: "Save & check in",
                  body: "Bookmark favorites, log visits, and build your own personal Huddle.",
                },
                {
                  icon: Star,
                  step: "03",
                  title: "Share the love",
                  body: "Leave honest reviews and help great local spots stand out.",
                },
              ].map((s, i) => (
                <Reveal key={s.step} delay={i * 100} variant="scale">
                  <div className="bg-background p-9 md:p-11 space-y-6 h-full">
                    <div className="flex items-start justify-between">
                      <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <s.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/50 tracking-[0.1em] pt-1">
                        {s.step}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── For business owners ───────────────────────────────── */}
        <section className="container py-28 md:py-36">
          <Reveal>
            <div className="p-[6px] rounded-[2.5rem] bg-foreground/[0.03] border border-border/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)]">
              <div className="rounded-[calc(2.5rem-6px)] bg-background overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="grid md:grid-cols-2">

                  {/* Left: copy */}
                  <div className="p-10 md:p-14 space-y-6">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary uppercase tracking-[0.15em]">
                      <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                      For business owners
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.1]">
                      Get found by your community
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      List your business, share what makes it special, and get in front of locals
                      actively looking for places like yours. Track views, check-ins, and reviews
                      with built-in insights.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Button
                        asChild
                        className="rounded-full pl-6 pr-2 gap-3 group transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                      >
                        <Link to="/business/onboarding">
                          List your business
                          <span className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                            <ArrowRight className="h-3 w-3" strokeWidth={2} />
                          </span>
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="rounded-full px-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                      >
                        <Link to="/insights">See insights</Link>
                      </Button>
                    </div>
                  </div>

                  {/* Right: benefits list */}
                  <div className="border-t md:border-t-0 md:border-l border-border/60 bg-muted/20 p-10 md:p-14 flex items-center">
                    <ul className="space-y-4 w-full">
                      {[
                        "Real-time view & interaction tracking",
                        "Customer reviews and star ratings",
                        "Featured placement opportunities",
                        "Export your business performance data",
                      ].map((benefit) => (
                        <li key={benefit} className="flex items-center gap-3.5">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </div>
                          <span className="text-sm font-medium">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────── */}
        <section className="container pb-32">
          <Reveal variant="scale">
            <div className="p-[6px] rounded-[2.5rem] bg-gradient-to-br from-primary/12 via-background to-accent/8 border border-primary/15 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)]">
              <div className="rounded-[calc(2.5rem-6px)] bg-background/80 px-10 py-14 md:px-16 md:py-16 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                        Ready to explore?
                      </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                      Discover what's happening in your neighborhood right now.
                    </h2>
                    <p className="text-muted-foreground">
                      Jump in — it's free, local, and built by people who actually care about your block.
                    </p>
                  </div>
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full pl-8 pr-2.5 gap-4 group whitespace-nowrap self-start md:self-auto transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  >
                    <Link to="/discover">
                      Get Started
                      <span className="h-9 w-9 rounded-full bg-primary-foreground/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                        <ArrowRight className="h-4 w-4" strokeWidth={2} />
                      </span>
                    </Link>
                  </Button>
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

export default Landing;
