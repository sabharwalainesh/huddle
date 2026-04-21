import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Download, BarChart3, Eye, Users, Bookmark, MapPin, Star, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id);
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

  const exportFullReport = () => {
    if (!selectedBusiness || !selectedStats) return;
    const rows: Record<string, string | number | null | undefined>[] = [
      { section: "Business", field: "name", value: selectedBusiness.name },
      { section: "Business", field: "category", value: selectedBusiness.category },
      { section: "Business", field: "status", value: selectedBusiness.status },
      { section: "Business", field: "address", value: selectedBusiness.address ?? "" },
      { section: "Business", field: "phone", value: selectedBusiness.phone ?? "" },
      { section: "Business", field: "website", value: selectedBusiness.website ?? "" },
      { section: "Business", field: "description", value: selectedBusiness.description ?? "" },
      { section: "Business", field: "tags", value: (selectedBusiness.tags ?? []).join("; ") },
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

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main" className="container py-8 space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Your Insights</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : businesses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <p className="text-muted-foreground">You don't have any businesses listed yet.</p>
              <Button asChild><a href="/business/onboarding">List your business</a></Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {businesses.length > 1 && (
              <div className="max-w-sm">
                <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
                  <SelectTrigger><SelectValue placeholder="Pick a business" /></SelectTrigger>
                  <SelectContent>
                    {businesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedBusiness && selectedStats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={<Eye className="h-4 w-4" />} label="Total views" value={selectedStats.total_views} sub={`${selectedStats.views_30d} last 30d`} />
                  <StatCard icon={<Users className="h-4 w-4" />} label="Unique viewers" value={selectedStats.unique_viewers} />
                  <StatCard icon={<MapPin className="h-4 w-4" />} label="Check-ins" value={selectedStats.total_check_ins} sub={`${selectedStats.check_ins_30d} last 30d`} />
                  <StatCard icon={<Bookmark className="h-4 w-4" />} label="Bookmarks" value={selectedStats.total_bookmarks} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={<Star className="h-4 w-4" />} label="Reviews" value={selectedStats.review_count} />
                  <StatCard icon={<Star className="h-4 w-4" />} label="Avg rating" value={Number(selectedStats.avg_rating).toFixed(2)} />
                  <StatCard
                    icon={<Sparkles className="h-4 w-4" />}
                    label="View → check-in"
                    value={selectedStats.total_views > 0 ? `${((selectedStats.total_check_ins / selectedStats.total_views) * 100).toFixed(1)}%` : "—"}
                  />
                  <StatCard
                    icon={<Sparkles className="h-4 w-4" />}
                    label="View → review"
                    value={selectedStats.total_views > 0 ? `${((selectedStats.review_count / selectedStats.total_views) * 100).toFixed(1)}%` : "—"}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={generateSummary} disabled={summaryLoading} variant="default">
                    {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    AI summary
                  </Button>
                  <Button onClick={exportFullReport} variant="outline">
                    <Download className="h-4 w-4" /> Export report (CSV)
                  </Button>
                  <Button onClick={exportReviews} variant="outline" disabled={!selectedReviews.length}>
                    <Download className="h-4 w-4" /> Export reviews (CSV)
                  </Button>
                </div>

                {(summary || summaryLoading) && (
                  <Card className="border-primary/30">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" /> AI summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm whitespace-pre-wrap leading-relaxed">
                      {summaryLoading ? "Thinking…" : summary}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Views — last 14 days</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{ views: { label: "Views", color: "hsl(var(--primary))" } }} className="h-64 w-full">
                      <ResponsiveContainer>
                        <BarChart data={viewsByDay}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="day" className="text-xs" />
                          <YAxis allowDecimals={false} className="text-xs" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="views" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Business details</CardTitle>
                    <CardDescription>The information shown to visitors on Huddle.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <DetailRow label="Name" value={selectedBusiness.name} />
                    <DetailRow label="Category" value={selectedBusiness.category} />
                    <DetailRow label="Status" value={<Badge variant="outline" className="capitalize">{selectedBusiness.status}</Badge>} />
                    <DetailRow label="Address" value={selectedBusiness.address ?? "—"} />
                    <DetailRow label="Phone" value={selectedBusiness.phone ?? "—"} />
                    <DetailRow label="Website" value={selectedBusiness.website ?? "—"} />
                    <DetailRow label="Description" value={selectedBusiness.description || "—"} />
                    <DetailRow
                      label="Tags"
                      value={
                        selectedBusiness.tags?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedBusiness.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                          </div>
                        ) : "—"
                      }
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
        {icon}{label}
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-3 gap-3 py-1.5 border-b last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <div className="col-span-2">{value}</div>
  </div>
);

export default Insights;
