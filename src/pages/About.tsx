import { Link } from "react-router-dom";
import { ArrowRight, Users, Sparkles, MapPin, ShieldCheck, MessageSquareHeart, Store, Trophy } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { useT } from "@/contexts/A11yContext";

const About = () => {
  const t = useT();

  const VALUES = [
    { icon: Store,              title: t("about.v1Title"), body: t("about.v1Body") },
    { icon: ShieldCheck,        title: t("about.v2Title"), body: t("about.v2Body") },
    { icon: MessageSquareHeart, title: t("about.v3Title"), body: t("about.v3Body") },
    { icon: Sparkles,           title: t("about.v4Title"), body: t("about.v4Body") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Hero — large editorial */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/8 via-background to-accent/6" />
        <div className="container py-24 md:py-32">
          <div className="max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t("about.badge")}
            </span>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight text-foreground">
              {t("about.heroTitle")}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed font-light">
              {t("about.heroSubtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* FBLA competition banner */}
      <section className="border-b bg-primary text-primary-foreground">
        <div className="container py-8">
          <Reveal>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
              <div className="h-12 w-12 rounded-2xl bg-primary-foreground/15 flex items-center justify-center shrink-0">
                <Trophy className="h-6 w-6 text-primary-foreground" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">
                  {t("about.fblaLabel")}
                </span>
                <h2 className="font-display text-xl md:text-2xl font-bold mt-0.5">{t("about.fblaTitle")}</h2>
                <p className="text-sm text-primary-foreground/70 mt-1 leading-relaxed max-w-2xl">
                  {t("about.fblaBody")}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <main id="main" className="flex-1">

        {/* Mission — editorial pullquote layout */}
        <section className="border-b">
          <div className="container py-28 md:py-36">
            <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
              <Reveal>
                <div className="space-y-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {t("about.missionLabel")}
                  </span>
                  <h2 className="font-display text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight">
                    {t("about.missionTitle")}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {t("about.mission1")}
                  </p>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {t("about.mission2")}
                  </p>
                </div>
              </Reveal>

              <Reveal delay={120} variant="fade-left">
                {/* Pullquote card */}
                <div className="border-l-4 border-primary pl-8 py-2 space-y-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-2xl font-bold leading-tight">{t("about.hyperTitle")}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {t("about.hyperBody")}
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Values — horizontal list */}
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
                <p className="text-muted-foreground leading-relaxed">
                  {t("about.valuesIntro")}
                </p>
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

        {/* CTA */}
        <section className="container py-28 md:py-36">
          <Reveal variant="scale">
            <div className="grid md:grid-cols-[1fr_auto] gap-10 items-start border-t pt-12">
              <div className="space-y-4">
                <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
                  {t("about.ctaTitle")}
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-lg text-base">
                  {t("about.ctaBody")}
                </p>
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
