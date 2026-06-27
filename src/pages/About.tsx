import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Sparkles, MapPin, ShieldCheck, MessageSquareHeart, Store, Trophy } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { useT } from "@/contexts/A11yContext";
import { supabase } from "@/integrations/supabase/client";

function useCountUp(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  const ran = useRef(false);
  useEffect(() => {
    if (!target || ran.current) return;
    ran.current = true;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setVal(Math.round((1 - (1 - p) ** 3) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

const About = () => {
  const t = useT();
  const [stats, setStats] = useState({ businesses: 0, reviews: 0, bookmarks: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("reviews").select("*", { count: "exact", head: true }),
      supabase.from("bookmarks").select("*", { count: "exact", head: true }),
    ]).then(([b, r, bm]) => {
      setStats({ businesses: b.count ?? 0, reviews: r.count ?? 0, bookmarks: bm.count ?? 0 });
    });
  }, []);

  const bizCount = useCountUp(stats.businesses);
  const revCount = useCountUp(stats.reviews);
  const bkmCount = useCountUp(stats.bookmarks);

  const VALUES = [
    { icon: Store,              title: t("about.v1Title"), body: t("about.v1Body") },
    { icon: ShieldCheck,        title: t("about.v2Title"), body: t("about.v2Body") },
    { icon: MessageSquareHeart, title: t("about.v3Title"), body: t("about.v3Body") },
    { icon: Sparkles,           title: t("about.v4Title"), body: t("about.v4Body") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Hero — FBLA title as the typographic statement ──────── */}
      <section className="border-b overflow-hidden">
        <div className="container py-24 md:py-32">
          <Reveal>
            <div className="flex items-center gap-2.5 mb-8">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                FBLA 2025–2026 · Coding &amp; Programming
              </span>
            </div>
          </Reveal>
          <div className="max-w-5xl">
            <Reveal delay={40}>
              <h1 className="font-display font-black leading-[0.9] tracking-[-0.02em]">
                <span className="block text-[clamp(3rem,10vw,7rem)] text-foreground">Byte-Sized</span>
                <span className="block text-[clamp(3rem,10vw,7rem)] text-foreground">Business</span>
                <span className="block text-[clamp(3rem,10vw,7rem)] text-primary">Boost.</span>
              </h1>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed font-light mt-7">
                Huddle is a community-powered platform helping people discover, review, and support the small local businesses that make neighborhoods worth living in — from the coffee shop around the corner to the boutique down the street.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Live stats strip ───────────────────────────────────── */}
      <section className="border-b bg-foreground text-background">
        <div className="container py-10 md:py-14">
          <div className="grid grid-cols-3 divide-x divide-background/10">
            {[
              { value: bizCount, label: "Businesses listed" },
              { value: revCount, label: "Reviews written" },
              { value: bkmCount, label: "Times saved" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center px-4 md:px-8 py-2">
                <div className="font-display font-black text-[clamp(2.5rem,8vw,5rem)] text-primary tabular-nums leading-none">
                  {value.toLocaleString()}
                </div>
                <div className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.15em] mt-2 opacity-40">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main id="main" className="flex-1">

        {/* ── Story — mission + hyper-local focus ────────────────── */}
        <section className="border-b">
          <div className="container py-28 md:py-36">
            <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
              <Reveal>
                <div className="border-l-4 border-primary pl-8 py-2 space-y-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                    {t("about.missionLabel")}
                  </span>
                  <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.05] tracking-tight">
                    {t("about.missionTitle")}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{t("about.mission1")}</p>
                  <p className="text-muted-foreground leading-relaxed">{t("about.mission2")}</p>
                </div>
              </Reveal>

              <Reveal delay={100} variant="fade-left">
                <div className="space-y-6 pt-2">
                  <div className="space-y-3">
                    <h3 className="font-display text-2xl font-bold leading-tight">{t("about.hyperTitle")}</h3>
                    <p className="text-muted-foreground leading-relaxed">{t("about.hyperBody")}</p>
                  </div>
                  <div className="pt-2 flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Built in Cypress, TX</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Greater Houston area · FBLA Chapter</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t("about.fblaTitle")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("about.fblaBody")}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Values ─────────────────────────────────────────────── */}
        <section className="border-b bg-muted/20">
          <div className="container py-28 md:py-36">
            <Reveal>
              <div className="mb-16 space-y-3 max-w-xl">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {t("about.valuesLabel")}
                </span>
                <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
                  {t("about.valuesTitle")}
                </h2>
                <p className="text-muted-foreground leading-relaxed">{t("about.valuesIntro")}</p>
              </div>
            </Reveal>

            <div className="divide-y divide-border/60">
              {VALUES.map(({ icon: Icon, title, body }, i) => (
                <Reveal key={title} delay={i * 60}>
                  <div className="py-8 flex gap-5 items-start group">
                    <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/15 transition-colors duration-300">
                      <Icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-base tracking-tight">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────── */}
        <section className="container py-28 md:py-36">
          <Reveal variant="scale">
            <div className="grid md:grid-cols-[1fr_auto] gap-10 items-start border-t pt-12">
              <div className="space-y-4">
                <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
                  {t("about.ctaTitle")}
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-lg">{t("about.ctaBody")}</p>
              </div>
              <div className="flex flex-col gap-3 self-start">
                <Button
                  asChild size="lg"
                  className="rounded-full pl-6 pr-2 gap-3 group whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                >
                  <Link to="/business/onboarding">
                    {t("about.ctaList")}
                    <span className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                  </Link>
                </Button>
                <Button
                  asChild variant="outline" size="lg"
                  className="rounded-full px-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                >
                  <Link to="/">{t("about.ctaExplore")}</Link>
                </Button>
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
