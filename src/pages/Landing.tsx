import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, Sparkles, MapPin, Users, Star, Bookmark, MessageSquare, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";

const Landing = () => {
  const [videoEnded, setVideoEnded] = useState(false);
  const [activeLoop, setActiveLoop] = useState<0 | 1>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loopRefA = useRef<HTMLVideoElement>(null);
  const loopRefB = useRef<HTMLVideoElement>(null);
  const featuresRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (videoEnded) loopRefA.current?.play();
  }, [videoEnded]);

  const handleLoopEnd = () => {
    const next = activeLoop === 0 ? loopRefB : loopRefA;
    const prev = activeLoop === 0 ? loopRefA : loopRefB;
    next.current?.play();
    setActiveLoop(activeLoop === 0 ? 1 : 0);
    setTimeout(() => { if (prev.current) prev.current.currentTime = 0; }, 800);
  };

  const watchAgain = () => {
    // Stop and reset both loop videos
    [loopRefA, loopRefB].forEach((ref) => {
      if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; }
    });
    setActiveLoop(0);
    setVideoEnded(false);
    // Small delay so opacity transition fires before play() to avoid a flash
    setTimeout(() => {
      if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
    }, 50);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main id="main" className="flex-1">

        {/* ── Hero: full-screen video ────────────────────────────── */}
        <section className="relative h-[100dvh] -mt-20 overflow-hidden bg-black">
          {/* Intro video — fades out when done */}
          <video
            ref={videoRef}
            src="/intro.mp4"
            autoPlay
            muted
            playsInline
            onCanPlay={() => { if (videoRef.current) videoRef.current.playbackRate = 1; }}
            onEnded={() => setVideoEnded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoEnded ? "opacity-0" : "opacity-100"}`}
          />

          {/* Loop video A & B — crossfade between them on each cycle */}
          {([loopRefA, loopRefB] as const).map((ref, i) => (
            <video
              key={i}
              ref={ref}
              src="/intro_2.mp4"
              muted
              playsInline
              onEnded={activeLoop === i ? handleLoopEnd : undefined}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: videoEnded && activeLoop === i ? 1 : 0,
                transition: "opacity 0.8s ease-in-out",
              }}
            />
          ))}

          {/* Subtle gradient always present so Navbar stays readable */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

          {/* Post-video CTA overlay — fades in when video ends */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-10 transition-opacity duration-1000 ease-out ${
              videoEnded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Dim layer over the looping background video */}
            <div className="absolute inset-0 bg-black/55" />

            {/* Content sits above the backdrop */}
            <div className="relative z-10 flex flex-col items-center gap-8 text-center px-6">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-white/80 tracking-[0.16em] uppercase backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
                  Community-powered discovery
                </span>
                <h1 className="text-7xl md:text-[8rem] font-bold tracking-[-0.04em] leading-none text-white">
                  Huddle
                </h1>
                <p className="text-lg md:text-xl text-white/60 max-w-[38ch] leading-relaxed">
                  Find what makes your neighborhood worth showing up for.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full pl-8 pr-2.5 gap-4 group text-base transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shadow-[0_0_32px_rgba(0,0,0,0.4)]"
                >
                  <Link to="/discover">
                    Get Started
                    <span className="h-9 w-9 rounded-full bg-primary-foreground/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                      <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </Link>
                </Button>
                <button
                  onClick={watchAgain}
                  className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors duration-300 group"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 group-hover:-rotate-45 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 8a6 6 0 1 0 1.5-4" />
                    <path d="M2 4v4h4" />
                  </svg>
                  Watch again
                </button>
              </div>
            </div>
          </div>

          {/* Scroll-down indicator — appears after video ends */}
          <div
            className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-1000 ${
              videoEnded ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <button
              onClick={() => featuresRef.current?.scrollIntoView({ behavior: "smooth" })}
              aria-label="Scroll to explore features"
              className="group flex flex-col items-center gap-3 focus:outline-none"
            >
              <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/70 group-hover:text-white transition-colors duration-300">
                Scroll to explore
              </span>
              <div className="relative flex items-center justify-center">
                {/* Pulsing outer ring */}
                <span className="absolute h-14 w-14 rounded-full border-2 border-white/40 animate-scroll-ring" />
                {/* Static ring */}
                <div className="relative h-14 w-14 rounded-full border-2 border-white/60 group-hover:border-white group-hover:bg-white/10 backdrop-blur-sm transition-all duration-300 flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.12)] group-hover:shadow-[0_0_32px_rgba(255,255,255,0.25)]">
                  <ChevronDown className="h-7 w-7 text-white animate-scroll-arrow" strokeWidth={2} />
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────── */}
        <section ref={featuresRef} className="container py-28 md:py-36">
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
