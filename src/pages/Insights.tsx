import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Download, BarChart3, Eye, Users, Bookmark, MapPin, Star, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;
type Review = Tables<"reviews">;

interface InsightRow {
  business_id: string;
  owner_id: string | null;
  name: string;
  category: string;
  status: string;
  avg_rating: number;
  review_count: number;
  total_views: number;
  unique_viewers: number;
  views_30d: number;
  total_bookmarks: number;
  total_check_ins: number;
  check_ins_30d: number;
}

const toCsv = (rows: Record<string, string | number | null | undefined>[]): string => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
};

const downloadCsv = (filename: string, rows: Record<string, string | number | null | undefined>[]) => {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const Insights = () => {
  const { user, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState<InsightRow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [views, setViews] = useState<{ business_id: string; created_at: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [health, setHealth] = useState<{ score: number; narrative: string } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const autoHealthRan = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: biz } = await supabase.from("businesses").select("*").eq("owner_id", user.id);
      const ownedIds = (biz ?? []).map((b) => b.id);
      if (!ownedIds.length) {
        setBusinesses([]); setStats([]); setReviews([]); setViews([]);
        setLoading(false);
        return;
      }
      const [statsRes, revRes, viewRes] = await Promise.all([
        supabase.from("business_insights_summary").select("*").in("business_id", ownedIds),
        supabase.from("reviews").select("*").in("business_id", ownedIds).order("created_at", { ascending: false }),
        supabase.from("business_views").select("business_id, created_at").in("business_id", ownedIds),
      ]);
      setBusinesses((biz ?? []) as Business[]);
      setStats((statsRes.data ?? []) as InsightRow[]);
      setReviews((revRes.data ?? []) as Review[]);
      setViews((viewRes.data ?? []) as { business_id: string; created_at: string }[]);
      setSelectedId((biz ?? [])[0]?.id ?? null);
      setLoading(false);
    })();
  }, [user]);

  const selectedBusiness = useMemo(() => businesses.find((b) => b.id === selectedId) ?? null, [businesses, selectedId]);
  const selectedStats = useMemo(() => stats.find((s) => s.business_id === selectedId) ?? null, [stats, selectedId]);
  const selectedReviews = useMemo(() => reviews.filter((r) => r.business_id === selectedId), [reviews, selectedId]);
  const selectedViews = useMemo(() => views.filter((v) => v.business_id === selectedId), [views, selectedId]);

  // Reset AI output when the user switches businesses
  useEffect(() => {
    setSummary("");
    setHealth(null);
  }, [selectedId]);

  const viewsByDay = useMemo(() => {
    const days = 14;
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(5, 10), 0);
    }
    selectedViews.forEach((v) => {
      const k = v.created_at.slice(5, 10);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    });
    return [...buckets.entries()].map(([day, views]) => ({ day, views }));
  }, [selectedViews]);

  const generateSummary = async () => {
    if (!selectedBusiness || !selectedStats) return;
    setSummaryLoading(true);
    setSummary("");
    try {
      const { data, error } = await supabase.functions.invoke("insights-summary", {
        body: {
          business: {
            name: selectedBusiness.name,
            category: selectedBusiness.category,
            avg_rating: Number(selectedBusiness.avg_rating),
            review_count: selectedBusiness.review_count,
            total_views: selectedStats.total_views,
            unique_viewers: selectedStats.unique_viewers,
            views_30d: selectedStats.views_30d,
            total_bookmarks: selectedStats.total_bookmarks,
            total_check_ins: selectedStats.total_check_ins,
            check_ins_30d: selectedStats.check_ins_30d,
          },
          recent_reviews: selectedReviews.slice(0, 5).map((r) => ({ rating: r.rating, comment: r.comment })),
        },
      });
      if (error) throw error;
      setSummary((data as { summary?: string }).summary ?? "");
    } catch (e) {
      toast({ title: "Couldn't generate summary", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSummaryLoading(false);
    }
  };

  const generateHealth = async () => {
    if (!selectedBusiness || !selectedStats) return;
    setHealthLoading(true);
    setHealth(null);
    try {
      const { data, error } = await supabase.functions.invoke("insights-summary", {
        body: {
          mode: "health",
          business: {
            name: selectedBusiness.name,
            category: selectedBusiness.category,
            avg_rating: Number(selectedBusiness.avg_rating),
            review_count: selectedBusiness.review_count,
            total_views: selectedStats.total_views,
            unique_viewers: selectedStats.unique_viewers,
            views_30d: selectedStats.views_30d,
            total_bookmarks: selectedStats.total_bookmarks,
            total_check_ins: selectedStats.total_check_ins,
            check_ins_30d: selectedStats.check_ins_30d,
          },
          recent_reviews: selectedReviews.slice(0, 5).map((r) => ({ rating: r.rating, comment: r.comment })),
        },
      });
      if (error) throw error;
      const d = data as { summary?: string; health_score?: number };
      setHealth({ score: d.health_score ?? 0, narrative: d.summary ?? "" });
    } catch (e) {
      toast({ title: "Couldn't generate health score", description: (e as Error).message, variant: "destructive" });
    } finally {
      setHealthLoading(false);
    }
  };

  // Auto-generate health score once per business selection
  useEffect(() => {
    if (!selectedBusiness || !selectedStats) return;
    if (autoHealthRan.current === selectedBusiness.id) return;
    autoHealthRan.current = selectedBusiness.id;
    generateHealth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusiness?.id, selectedStats]);

  const exportFullReport = () => {
    if (!selectedBusiness || !selectedStats) return;
    const rows: Record<string, string | number | null | undefined>[] = [
      { section: "Business", field: "name", value: selectedBusiness.name },
      { section: "Business", field: "category", value: selectedBusiness.category },
      { section: "Business", field: "status", value: selectedBusiness.status },
      { section: "Business", field: "address", value: selectedBusiness.address ?? "" },
      { section: "Business", field: "phone", value: selectedBusiness.phone ?? "" },
      { section: "Business", field: "website", value: selectedBusiness.website ?? "" },
      { section: "Stats", field: "total_views", value: selectedStats.total_views },
      { section: "Stats", field: "unique_viewers", value: selectedStats.unique_viewers },
      { section: "Stats", field: "views_30d", value: selectedStats.views_30d },
      { section: "Stats", field: "total_bookmarks", value: selectedStats.total_bookmarks },
      { section: "Stats", field: "total_check_ins", value: selectedStats.total_check_ins },
      { section: "Stats", field: "check_ins_30d", value: selectedStats.check_ins_30d },
      { section: "Stats", field: "review_count", value: selectedStats.review_count },
      { section: "Stats", field: "avg_rating", value: Number(selectedStats.avg_rating) },
    ];
    downloadCsv(`huddle-insights-${selectedBusiness.name.replace(/\W+/g, "-")}.csv`, rows);
  };

  const exportReviews = () => {
    if (!selectedBusiness) return;
    downloadCsv(
      `huddle-reviews-${selectedBusiness.name.replace(/\W+/g, "-")}.csv`,
      selectedReviews.map((r) => ({
        rating: r.rating,
        verified: r.verified ? "yes" : "no",
        comment: r.comment,
        created_at: r.created_at,
      })),
    );
  };

  const scoreColor = (s: number) => {
    if (s >= 75) return "text-emerald-500";
    if (s >= 40) return "text-amber-500";
    return "text-destructive";
  };

  const scoreBg = (s: number) => {
    if (s >= 75) return "bg-emerald-500";
    if (s >= 40) return "bg-amber-500";
    return "bg-destructive";
  };

  const scoreLabel = (s: number) => {
    if (s >= 75) return "Strong";
    if (s >= 40) return "Growing";
    return "Needs work";
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main id="main" className="container py-10 space-y-6 flex-1">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-tight">Your Insights</h1>
            <p className="text-xs text-muted-foreground">Performance data for your businesses</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your data…
          </div>
        ) : businesses.length === 0 ? (
          <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
            <div className="rounded-[calc(1.5rem-5px)] bg-background p-12 text-center space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <p className="text-muted-foreground">You don't have any businesses listed yet.</p>
              <Button
                asChild
                className="rounded-full px-6"
              >
                <a href="/business/onboarding">List your business</a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {businesses.length > 1 && (
              <div className="max-w-sm">
                <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pick a business" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {businesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedBusiness && selectedStats && (
              <>
                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard icon={<Eye className="h-4 w-4" strokeWidth={1.5} />} label="Total views" value={selectedStats.total_views} sub={`${selectedStats.views_30d} last 30d`} />
                  <StatCard icon={<Users className="h-4 w-4" strokeWidth={1.5} />} label="Unique viewers" value={selectedStats.unique_viewers} />
                  <StatCard icon={<MapPin className="h-4 w-4" strokeWidth={1.5} />} label="Check-ins" value={selectedStats.total_check_ins} sub={`${selectedStats.check_ins_30d} last 30d`} />
                  <StatCard icon={<Bookmark className="h-4 w-4" strokeWidth={1.5} />} label="Bookmarks" value={selectedStats.total_bookmarks} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard icon={<Star className="h-4 w-4" strokeWidth={1.5} />} label="Reviews" value={selectedStats.review_count} />
                  <StatCard icon={<Star className="h-4 w-4" strokeWidth={1.5} />} label="Avg rating" value={Number(selectedStats.avg_rating).toFixed(2)} />
                  <StatCard
                    icon={<Sparkles className="h-4 w-4" strokeWidth={1.5} />}
                    label="View → check-in"
                    value={selectedStats.total_views > 0 ? `${((selectedStats.total_check_ins / selectedStats.total_views) * 100).toFixed(1)}%` : "—"}
                  />
                  <StatCard
                    icon={<Sparkles className="h-4 w-4" strokeWidth={1.5} />}
                    label="View → review"
                    value={selectedStats.total_views > 0 ? `${((selectedStats.review_count / selectedStats.total_views) * 100).toFixed(1)}%` : "—"}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={generateHealth}
                    disabled={healthLoading}
                    className="rounded-full gap-2"
                  >
                    {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" strokeWidth={1.5} />}
                    Health score
                  </Button>
                  <Button
                    onClick={generateSummary}
                    disabled={summaryLoading}
                    variant="outline"
                    className="rounded-full gap-2"
                  >
                    {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" strokeWidth={1.5} />}
                    AI summary
                  </Button>
                  <Button onClick={exportFullReport} variant="outline" className="rounded-full gap-2">
                    <Download className="h-4 w-4" strokeWidth={1.5} /> Export report
                  </Button>
                  <Button onClick={exportReviews} variant="outline" disabled={!selectedReviews.length} className="rounded-full gap-2">
                    <Download className="h-4 w-4" strokeWidth={1.5} /> Export reviews
                  </Button>
                </div>

                {/* Health score */}
                {(health || healthLoading) && (
                  <div className="p-[5px] rounded-[1.5rem] bg-gradient-to-br from-primary/10 to-accent/8 border border-primary/15">
                    <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] overflow-hidden">
                      <div className="px-6 pt-5 pb-4 border-b border-border/60 flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                        </div>
                        <span className="font-semibold text-sm">Business health score</span>
                      </div>
                      {healthLoading ? (
                        <div className="px-6 py-8 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculating…
                        </div>
                      ) : health && (
                        <div className="px-6 py-5 grid sm:grid-cols-[auto_1fr] gap-5 items-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className={`text-5xl font-bold tracking-tight tabular-nums ${scoreColor(health.score)}`}>
                              {health.score}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
                              out of 100
                            </div>
                            <div className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wider ${scoreColor(health.score)}`}>
                              {scoreLabel(health.score)}
                            </div>
                            <div className="w-24 h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${scoreBg(health.score)}`}
                                style={{ width: `${health.score}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                            {health.narrative}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI summary */}
                {(summary || summaryLoading) && (
                  <div className="p-[5px] rounded-[1.5rem] bg-primary/5 border border-primary/12">
                    <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <div className="px-6 pt-5 pb-4 border-b border-border/60 flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                        </div>
                        <span className="font-semibold text-sm">AI summary</span>
                      </div>
                      <div className="px-6 py-5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                        {summaryLoading ? (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                          </span>
                        ) : summary}
                      </div>
                    </div>
                  </div>
                )}

                {/* Views chart */}
                <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
                  <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="px-6 pt-6 pb-5 border-b border-border/60">
                      <p className="font-semibold tracking-tight">Views — last 14 days</p>
                    </div>
                    <div className="p-6">
                      <ChartContainer config={{ views: { label: "Views", color: "hsl(var(--primary))" } }} className="h-64 w-full">
                        <ResponsiveContainer>
                          <BarChart data={viewsByDay}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} className="text-xs" tick={{ fontSize: 11 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="views" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </div>
                </div>

                {/* Business details */}
                <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
                  <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="px-6 pt-6 pb-5 border-b border-border/60">
                      <p className="font-semibold tracking-tight">Business details</p>
                      <p className="text-xs text-muted-foreground mt-0.5">The information shown to visitors on Huddle.</p>
                    </div>
                    <div className="divide-y divide-border/50">
                      <DetailRow label="Name" value={selectedBusiness.name} />
                      <DetailRow label="Category" value={selectedBusiness.category} />
                      <DetailRow label="Status" value={<Badge variant="outline" className="capitalize rounded-full text-[11px]">{selectedBusiness.status}</Badge>} />
                      <DetailRow label="Address" value={selectedBusiness.address ?? "—"} />
                      <DetailRow label="Phone" value={selectedBusiness.phone ?? "—"} />
                      <DetailRow label="Website" value={selectedBusiness.website ?? "—"} />
                      <DetailRow
                        label="Tags"
                        value={
                          selectedBusiness.tags?.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedBusiness.tags.map((t) => (
                                <Badge key={t} variant="secondary" className="rounded-full text-[11px] px-2.5">{t}</Badge>
                              ))}
                            </div>
                          ) : "—"
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) => (
  <div className="p-[4px] rounded-[1.25rem] bg-foreground/[0.03] border border-border/50">
    <div className="rounded-[calc(1.25rem-4px)] bg-background p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
        {icon}{label}
      </div>
      <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">{sub}</p>}
    </div>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-3 gap-3 px-6 py-3.5 last:pb-5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="col-span-2 text-sm">{value}</div>
  </div>
);

export default Insights;
