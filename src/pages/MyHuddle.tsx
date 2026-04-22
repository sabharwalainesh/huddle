import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/contexts/A11yContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BusinessCard } from "@/components/BusinessCard";
import { PreferencesBanner } from "@/components/PreferencesBanner";
import { toast } from "@/hooks/use-toast";
import { hasAnyPrefs, scoreBusiness, type UserPreferences } from "@/lib/preferences";
import type { Business } from "@/lib/sorting";

const huddleMatch = (saved: Business[], all: Business[]): Business[] => {
  if (!saved.length) return [];
  const counts = new Map<string, number>();
  saved.forEach((b) => counts.set(b.category, (counts.get(b.category) ?? 0) + 1));
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const savedIds = new Set(saved.map((b) => b.id));
  const candidates = all.filter((b) => !savedIds.has(b.id) && ranked.includes(b.category));
  return candidates
    .map((b) => ({
      b,
      score: (ranked.length - ranked.indexOf(b.category)) * 2 + Number(b.avg_rating),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.b);
};

const prefsMatch = (
  saved: Business[],
  all: Business[],
  prefs: UserPreferences,
  limit = 6,
): Business[] => {
  const savedIds = new Set(saved.map((b) => b.id));
  return all
    .filter((b) => !savedIds.has(b.id))
    .map((b) => ({ b, score: scoreBusiness(b, prefs) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.b.avg_rating) - Number(a.b.avg_rating))
    .slice(0, limit)
    .map((x) => x.b);
};

const MyHuddle = () => {
  const { user, loading: authLoading } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<Business[]>([]);
  const [all, setAll] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [bm, allRes] = await Promise.all([
        supabase.from("bookmarks").select("business_id").eq("user_id", user.id),
        supabase.from("businesses").select("*").limit(500),
      ]);
      if (bm.error || allRes.error) {
        toast({ title: "Couldn't load your huddle", variant: "destructive" });
        setLoading(false);
        return;
      }
      const ids = new Set((bm.data ?? []).map((r) => r.business_id));
      const allRows = (allRes.data ?? []) as Business[];
      setSaved(allRows.filter((b) => ids.has(b.id)));
      setAll(allRows);
      setLoading(false);
    })();
  }, [user]);

  const { prefs } = useUserPreferences();
  const personalize = hasAnyPrefs(prefs);

  const matches = useMemo(() => {
    if (personalize) return prefsMatch(saved, all, prefs, 6);
    return huddleMatch(saved, all);
  }, [saved, all, prefs, personalize]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main id="main" className="container py-10 space-y-10 flex-1">
        <PreferencesBanner />

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookmarkCheck className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-tight">{t("huddle.title")}</h1>
            <p className="text-xs text-muted-foreground">{saved.length} saved {saved.length === 1 ? "place" : "places"}</p>
          </div>
        </div>

        {/* Saved businesses */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-[1.5rem] bg-muted/40 border border-border/40 aspect-[4/3] animate-pulse" />
              ))}
            </div>
          ) : saved.length === 0 ? (
            <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
              <div className="rounded-[calc(1.5rem-5px)] bg-background p-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="h-12 w-12 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
                  <BookmarkCheck className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <p className="font-medium text-foreground mb-1">{t("huddle.empty")}</p>
                <p className="text-sm text-muted-foreground">Browse Discover to start saving places.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {saved.map((b) => <BusinessCard key={b.id} b={b} />)}
            </div>
          )}
        </section>

        {/* Picks for you */}
        {matches.length > 0 && (
          <section>
            <div className="p-[5px] rounded-[1.75rem] bg-gradient-to-br from-primary/6 to-accent/5 border border-primary/12">
              <div className="rounded-[calc(1.75rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="px-7 pt-7 pb-5 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="font-semibold tracking-tight">
                        {personalize ? "Picked for your vibe" : t("huddle.matchTitle")}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {personalize
                          ? "Based on your preferences and saved places."
                          : t("huddle.matchHint")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-7">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {matches.map((b) => <BusinessCard key={b.id} b={b} />)}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MyHuddle;
