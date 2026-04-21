import { useEffect, useRef, useState } from "react";
import { ArrowDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroGlobe } from "./HeroGlobe";

export const ImmersiveHero = () => {
  const scrollRef = useRef(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const max = window.innerHeight * 0.9;
      const p = Math.min(window.scrollY / max, 1);
      scrollRef.current = p;
      setProgress(p);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative h-[90vh] min-h-[560px] overflow-hidden bg-[hsl(20_14%_10%)]">
      {/* Subtle radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, hsl(20 14% 8% / 0.7) 80%)",
        }}
      />

      {/* 3D canvas */}
      <div className="absolute inset-0">
        <HeroGlobe scrollRef={scrollRef} />
      </div>

      {/* Overlay copy */}
      <div
        className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4"
        style={{
          opacity: 1 - progress * 1.2,
          transform: `translateY(${progress * -40}px)`,
        }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur px-3 py-1 text-xs text-white/80 mb-5 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
          Your neighborhood, reimagined
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-4 animate-fade-in">
          Discover your
          <span className="block bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            local huddle.
          </span>
        </h1>
        <p className="text-base md:text-xl text-white/70 max-w-xl mx-auto mb-8 animate-fade-in">
          Trusted spots, real reviews, and community deals — all in one place.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-elegant hover-scale"
            onClick={() => document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" })}
          >
            Explore businesses
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            onClick={() => (window.location.href = "/auth")}
          >
            Join the community
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-white/60 text-xs"
        style={{ opacity: 1 - progress * 2 }}
      >
        <span>Scroll to explore</span>
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </div>
    </section>
  );
};
