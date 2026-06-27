import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Search, MapPin, Users, Star,
  Bookmark, MessageSquare, ChevronDown,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { useT } from "@/contexts/A11yContext";
import { supabase } from "@/integrations/supabase/client";

type CarouselBiz = {
  id: string;
  name: string;
  category: string;
  avg_rating: number;
  image_url: string | null;
};

const CATEGORY_GRADIENT: Record<string, string> = {
  food:          "from-orange-400 to-amber-500",
  retail:        "from-violet-400 to-purple-500",
  services:      "from-sky-400 to-blue-500",
  health:        "from-emerald-400 to-green-500",
  entertainment: "from-pink-400 to-rose-500",
  other:         "from-slate-400 to-gray-500",
};

function CarouselCard({ biz }: { biz: CarouselBiz }) {
  const gradient = CATEGORY_GRADIENT[biz.category] ?? CATEGORY_GRADIENT.other;
  return (
    <Link
      to={`/business/${biz.id}`}
      tabIndex={-1}
      aria-label={biz.name}
      className="group shrink-0 w-56 block rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className={`h-32 relative bg-gradient-to-br ${gradient}`}>
        {biz.image_url && (
          <img
            src={biz.image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <span className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize tracking-wide">
          {biz.category}
        </span>
      </div>
      <div className="px-4 py-3.5">
        <p className="font-display font-bold text-sm leading-tight truncate group-hover:text-primary transition-colors duration-200">
          {biz.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Star className="h-3 w-3 fill-primary text-primary" strokeWidth={0} />
          <span className="text-xs text-muted-foreground font-medium">{biz.avg_rating.toFixed(1)}</span>
        </div>
      </div>
    </Link>
  );
}

const Landing = () => {
  const t = useT();
  const [videoEnded, setVideoEnded] = useState(false);
  const [activeLoop, setActiveLoop] = useState<0 | 1>(0);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const loopRefA    = useRef<HTMLVideoElement>(null);
  const loopRefB    = useRef<HTMLVideoElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const [businesses, setBusinesses] = useState<CarouselBiz[]>([]);

  useEffect(() => {
    if (videoEnded) loopRefA.current?.play();
  }, [videoEnded]);

  useEffect(() => {
    supabase
      .from("businesses")
      .select("id, name, category, avg_rating, image_url")
      .eq("status", "approved")
      .order("avg_rating", { ascending: false })
      .limit(24)
      .then(({ data }) => { if (data && data.length >= 4) setBusinesses(data); });
  }, []);

  const handleLoopEnd = () => {
    const next = activeLoop === 0 ? loopRefB : loopRefA;
    const prev = activeLoop === 0 ? loopRefA : loopRefB;
    next.current?.play();
    setActiveLoop(activeLoop === 0 ? 1 : 0);
    setTimeout(() => { if (prev.current) prev.current.currentTime = 0; }, 800);
  };

  const watchAgain = () => {
    [loopRefA, loopRefB].forEach((ref) => {
      if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; }
    });
    setActiveLoop(0);
    setVideoEnded(false);
    setTimeout(() => {
      if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); }
    }, 50);
  };

  const mid  = Math.ceil(businesses.length / 2);
  const row1 = businesses.slice(0, mid);
  const row2 = [...businesses].reverse().slice(0, mid);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main id="main" className="flex-1">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative h-[100dvh] -mt-20 overflow-hidden bg-black">
          <video
            ref={videoRef}
            src="/intro.mp4"
            autoPlay muted playsInline
            onCanPlay={() => { if (videoRef.current) videoRef.current.playbackRate = 1; }}
            onEnded={() => setVideoEnded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoEnded ? "opacity-0" : "opacity-100"}`}
          />
          {([loopRefA, loopRefB] as const).map((ref, i) => (
            <video
              key={i} ref={ref} src="/intro_2.mp4" muted playsInline
              onEnded={activeLoop === i ? handleLoopEnd : undefined}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: videoEnded && activeLoop === i ? 1 : 0, transition: "opacity 0.8s ease-in-out" }}
            />
          ))}

          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
          {/* Bottom gradient for text legibility */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          {/* Hero overlay — editorial bottom-anchored layout */}
          <div
            className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-1000 ease-out ${
              videoEnded ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="relative z-10 px-8 md:px-16 pb-16 md:pb-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
              {/* Left: wordmark + tagline */}
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-white/80 tracking-[0.16em] uppercase backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
                  {t("landing.communityPowered")}
                </span>
                <h1 className="font-display text-[5.5rem] md:text-[8rem] lg:text-[10rem] font-black leading-[0.88] tracking-[-0.03em] text-white">
                  Huddle.
                </h1>
                <p className="text-lg md:text-xl text-white/65 max-w-[38ch] leading-relaxed font-light">
                  {t("landing.tagline")}
                </p>
              </div>

              {/* Right: CTA */}
              <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                <Button
                  asChild size="lg"
                  className="rounded-full pl-8 pr-2.5 gap-4 group text-base transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shadow-[0_0_32px_rgba(0,0,0,0.5)]"
                >
                  <Link to="/discover">
                    {t("landing.getStarted")}
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
                    <path d="M2 8a6 6 0 1 0 1.5-4" /><path d="M2 4v4h4" />
                  </svg>
                  {t("landing.watchAgain")}
                </button>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-1000 ${videoEnded ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <button
              onClick={() => featuresRef.current?.scrollIntoView({ behavior: "smooth" })}
              aria-label={t("landing.scrollToExplore")}
              className="group flex flex-col items-center gap-3 focus:outline-none opacity-0"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute h-10 w-10 rounded-full border border-white/30 animate-scroll-ring" />
                <div className="h-10 w-10 rounded-full border border-white/50 group-hover:border-white flex items-center justify-center transition-all duration-300">
                  <ChevronDown className="h-5 w-5 text-white animate-scroll-arrow" strokeWidth={2} />
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* ── Business carousel ─────────────────────────────────── */}
        {businesses.length >= 4 && (
          <section aria-label="Trending businesses" className="relative overflow-hidden py-20 border-b">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-40 z-10 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-40 z-10 bg-gradient-to-l from-background to-transparent" />

            <div className="container mb-10">
              <Reveal>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t("landing.carousel")}</span>
                    <h2 className="font-display text-4xl md:text-5xl font-bold mt-1 tracking-tight leading-[1.0]">
                      {t("landing.carouselTitle")}
                    </h2>
                  </div>
                  <Link
                    to="/discover"
                    className="text-sm font-medium text-primary inline-flex items-center gap-1.5 transition-all duration-300 hover:gap-3 shrink-0"
                  >
                    {t("landing.browseAll")} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </Link>
                </div>
              </Reveal>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden">
                <div className="flex gap-4 pl-4 w-max animate-marquee">
                  {[...row1, ...row1].map((biz, i) => <CarouselCard key={`r1-${biz.id}-${i}`} biz={biz} />)}
                </div>
              </div>
              <div className="overflow-hidden">
                <div className="flex gap-4 pl-4 w-max animate-marquee-reverse">
                  {[...row2, ...row2].map((biz, i) => <CarouselCard key={`r2-${biz.id}-${i}`} biz={biz} />)}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Features — editorial split layout ─────────────────── */}
        <section ref={featuresRef} className="border-b">
          <div className="container py-28 md:py-36">
            <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">

              {/* Left: sticky statement */}
              <div className="md:sticky md:top-28 space-y-7">
                <Reveal>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t("landing.whyHuddle")}</span>
                  <h2 className="font-display text-5xl md:text-6xl lg:text-[4.5rem] font-bold leading-[1.0] tracking-tight mt-3">
                    {t("landing.builtAround")}
                  </h2>
                </Reveal>
                <Reveal delay={80}>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
                    Real listings, real reviews, and a community that actually shows up.
                  </p>
                </Reveal>
                <Reveal delay={120}>
                  <Link
                    to="/discover"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-all duration-300 hover:gap-3.5"
                  >
                    {t("landing.startExploring")} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </Link>
                </Reveal>
              </div>

              {/* Right: feature list with dividers */}
              <div className="divide-y divide-border/60">
                {[
                  { icon: Search,  titleKey: "landing.findLocalGems" as const,      bodyKey: "landing.findLocalGemsBody" as const },
                  { icon: Users,   titleKey: "landing.poweredByNeighbors" as const,  bodyKey: "landing.poweredByNeighborsBody" as const },
                  { icon: MapPin,  titleKey: "landing.builtForYourBlock" as const,   bodyKey: "landing.builtForYourBlockBody" as const },
                ].map(({ icon: Icon, titleKey, bodyKey }, i) => (
                  <Reveal key={titleKey} delay={i * 80}>
                    <div className="py-8 flex gap-5 items-start">
                      <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-semibold text-base tracking-tight">{t(titleKey)}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{t(bodyKey)}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works — large numbered steps ───────────────── */}
        <section className="bg-muted/25 border-b">
          <div className="container py-28 md:py-36">
            <Reveal>
              <div className="mb-16 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{t("landing.simpleToStart")}</span>
                  <h2 className="font-display text-4xl md:text-5xl font-bold mt-2 tracking-tight leading-[1.0]">
                    {t("landing.howHuddleWorks")}
                  </h2>
                </div>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-px bg-border/40 rounded-2xl overflow-hidden border border-border/40">
              {[
                { icon: Search,   step: "01", titleKey: "landing.step1Title" as const, bodyKey: "landing.step1Body" as const },
                { icon: Bookmark, step: "02", titleKey: "landing.step2Title" as const, bodyKey: "landing.step2Body" as const },
                { icon: Star,     step: "03", titleKey: "landing.step3Title" as const, bodyKey: "landing.step3Body" as const },
              ].map((s, i) => (
                <Reveal key={s.step} delay={i * 80} variant="scale">
                  <div className="bg-background px-8 py-10 md:px-10 md:py-12 h-full relative overflow-hidden">
                    {/* Large decorative step number */}
                    <span className="absolute -top-4 -right-2 font-display text-[8rem] font-black text-foreground/[0.04] leading-none select-none pointer-events-none">
                      {s.step}
                    </span>
                    <div className="relative space-y-5">
                      <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <s.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg tracking-tight">{t(s.titleKey)}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{t(s.bodyKey)}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── For business owners — orange accent section ────────── */}
        <section className="bg-primary text-primary-foreground">
          <div className="container py-28 md:py-36">
            <div className="grid md:grid-cols-2 gap-16 items-start">
              {/* Left: statement */}
              <Reveal>
                <div className="space-y-6">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-foreground/70 uppercase tracking-[0.18em]">
                    <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {t("landing.forOwners")}
                  </span>
                  <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.0] tracking-tight">
                    {t("landing.getFoundTitle")}
                  </h2>
                  <p className="text-primary-foreground/70 leading-relaxed text-lg max-w-md">
                    {t("landing.getFoundBody")}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      asChild
                      className="rounded-full pl-6 pr-2 gap-3 group bg-white text-primary hover:bg-white/90 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                    >
                      <Link to="/business/onboarding">
                        {t("landing.listYourBusiness")}
                        <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                          <ArrowRight className="h-3 w-3" strokeWidth={2} />
                        </span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="rounded-full px-6 bg-transparent border border-white/40 text-white hover:bg-white/10 hover:border-white/70 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                    >
                      <Link to="/insights">{t("landing.seeInsights")}</Link>
                    </Button>
                  </div>
                </div>
              </Reveal>

              {/* Right: benefits */}
              <Reveal delay={100}>
                <ul className="divide-y divide-primary-foreground/15">
                  {(["landing.benefit1", "landing.benefit2", "landing.benefit3", "landing.benefit4"] as const).map((key) => (
                    <li key={key} className="flex items-center gap-4 py-5">
                      <div className="h-2 w-2 rounded-full bg-primary-foreground/60 shrink-0" />
                      <span className="text-primary-foreground/90 font-medium">{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default Landing;
