import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Reveal } from "@/components/Reveal";
import { Sparkles, BookmarkCheck, BarChart3, Download, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/contexts/A11yContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Footer } from "@/components/Footer";
import { BusinessCard } from "@/components/BusinessCard";
import { PreferencesBanner } from "@/components/PreferencesBanner";
import { Button } from "@/components/ui/button";
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

  // Compute report data from saved businesses
  const report = useMemo(() => {
    if (!saved.length) return null;
    const categoryMap: Record<string, number> = {};
    let ratingSum = 0;
    let ratedCount = 0;
    let topBiz = saved[0];
    for (const b of saved) {
      categoryMap[b.category] = (categoryMap[b.category] ?? 0) + 1;
      const r = Number(b.avg_rating);
      if (r > 0) { ratingSum += r; ratedCount++; }
      if (Number(b.avg_rating) > Number(topBiz.avg_rating)) topBiz = b;
    }
    const categories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
    const avgRating = ratedCount > 0 ? (ratingSum / ratedCount).toFixed(2) : null;
    return { categories, avgRating, topBiz, total: saved.length };
  }, [saved]);

  const exportCsv = () => {
    if (!saved.length) return;
    const header = "Name,Category,Rating,Reviews,Address";
    const rows = saved.map((b) =>
      [b.name, b.category, b.avg_rating ?? 0, b.review_count ?? 0, b.address ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-huddle-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report downloaded!", description: `${saved.length} businesses exported as CSV.` });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      <main id="main" className="container py-10 space-y-10 flex-1">
        <PreferencesBanner />

        {/* Header */}
        <Reveal>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center animate-bounce-in">
              <BookmarkCheck className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-tight">{t("huddle.title")}</h1>
              <p className="text-xs text-muted-foreground">{saved.length} saved {saved.length === 1 ? "place" : "places"}</p>
            </div>
          </div>
        </Reveal>

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
              {saved.map((b, i) => (
                <div key={b.id} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <BusinessCard b={b} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Picks for you */}
        {matches.length > 0 && (
          <Reveal>
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
                    {matches.map((b, i) => (
                      <div key={b.id} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <BusinessCard b={b} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
          </Reveal>
        )}
        {/* Data report panel */}
        {report && (
          <Reveal>
          <section>
            <div className="p-[5px] rounded-[1.75rem] bg-foreground/[0.03] border border-border/50">
              <div className="rounded-[calc(1.75rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="px-7 pt-7 pb-5 border-b border-border/60 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="font-semibold tracking-tight">My Huddle Report</h2>
                      <p className="text-xs text-muted-foreground">Insights across your {report.total} saved place{report.total !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportCsv}
                    className="rounded-full gap-2"
                    aria-label="Download saved businesses as CSV"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Export CSV
                  </Button>
                </div>

                <div className="px-7 py-6 space-y-5">
                  {/* Summary stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-muted/30 border border-border/40 px-5 py-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Saved</p>
                      <p className="text-2xl font-bold tabular-nums mt-1">{report.total}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/30 border border-border/40 px-5 py-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Avg Rating</p>
                      <p className="text-2xl font-bold tabular-nums mt-1 flex items-center gap-1">
                        {report.avgRating ?? "—"}
                        {report.avgRating && <Star className="h-4 w-4 text-amber-400 fill-amber-400" strokeWidth={1} />}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/30 border border-border/40 px-5 py-4 sm:col-span-1 col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Top Rated</p>
                      <p className="text-sm font-semibold mt-1 truncate">{report.topBiz.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{report.topBiz.category} · ★ {Number(report.topBiz.avg_rating).toFixed(1)}</p>
                    </div>
                  </div>

                  {/* Category breakdown */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">By Category</p>
                    <div className="space-y-2" role="list" aria-label="Saved businesses by category">
                      {report.categories.map(([cat, count]) => (
                        <div key={cat} role="listitem" className="flex items-center gap-3">
                          <span className="text-sm capitalize w-24 shrink-0 text-muted-foreground">{cat}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden" aria-hidden>
                            <div
                              className="h-full bg-primary/70 rounded-full transition-all duration-500"
                              style={{ width: `${(count / report.total) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold tabular-nums w-6 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          </Reveal>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MyHuddle;
