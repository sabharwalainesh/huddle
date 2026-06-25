import { useEffect, useMemo, useState } from "react";
import { Download, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/contexts/A11yContext";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

type Business = Tables<"businesses">;
type Review = Tables<"reviews">;

const toCsv = (rows: Record<string, string | number>[]): string => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
};

const downloadCsv = (filename: string, rows: Record<string, string | number>[]) => {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const Dashboard = () => {
  const t = useT();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [b, r] = await Promise.all([
        supabase.from("businesses").select("*").limit(1000),
        supabase.from("reviews").select("*").limit(1000),
      ]);
      if (b.error || r.error) {
        toast({ title: "Couldn't load dashboard data", variant: "destructive" });
      } else {
        setBusinesses((b.data ?? []) as Business[]);
        setReviews((r.data ?? []) as Review[]);
      }
      setLoading(false);
    })();
  }, []);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    businesses.forEach((b) => map.set(b.category, (map.get(b.category) ?? 0) + 1));
    return [...map.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  }, [businesses]);

  const topRated = useMemo(() => {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentByBusiness = new Map<string, { sum: number; n: number }>();
    reviews.forEach((r) => {
      if (new Date(r.created_at).getTime() < monthAgo) return;
      const cur = recentByBusiness.get(r.business_id) ?? { sum: 0, n: 0 };
      cur.sum += r.rating; cur.n += 1;
      recentByBusiness.set(r.business_id, cur);
    });
    return businesses
      .filter((b) => b.review_count > 0)
      .map((b) => {
        const rec = recentByBusiness.get(b.id);
        return {
          name: b.name,
          rating: Number(b.avg_rating),
          recent_avg: rec ? Number((rec.sum / rec.n).toFixed(2)) : 0,
          review_count: b.review_count,
        };
      })
      .sort((a, b) => b.rating - a.rating || b.review_count - a.review_count)
      .slice(0, 10);
  }, [businesses, reviews]);

  const reviewVelocity = useMemo(() => {
    const days = 14;
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(5, 10), 0);
    }
    reviews.forEach((r) => {
      const k = r.created_at.slice(5, 10);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    });
    return [...buckets.entries()].map(([day, reviews]) => ({ day, reviews }));
  }, [reviews]);

  const exportCategories = () => downloadCsv("huddle-trending-categories.csv", categoryData);
  const exportTop = () => downloadCsv(
    "huddle-top-rated.csv",
    topRated.map((r) => ({ name: r.name, avg_rating: r.rating, recent_avg_30d: r.recent_avg, review_count: r.review_count })),
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">

      <main id="main" className="container py-10 space-y-6 flex-1">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-tight">{t("dash.title")}</h1>
            <p className="text-xs text-muted-foreground">Platform-wide analytics</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8">{t("dash.loading")}</p>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { label: t("dash.businesses"), value: businesses.length },
                { label: t("dash.totalReviews"), value: reviews.length },
                {
                  label: t("dash.avgRating"),
                  value: businesses.length
                    ? (businesses.reduce((s, b) => s + Number(b.avg_rating), 0) / businesses.length).toFixed(2)
                    : "—",
                },
              ].map(({ label, value }) => (
                <div key={label} className="p-[4px] rounded-[1.25rem] bg-foreground/[0.03] border border-border/50">
                  <div className="rounded-[calc(1.25rem-4px)] bg-background p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">{label}</p>
                    <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
              <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="px-6 pt-6 pb-5 border-b border-border/60 flex items-center justify-between">
                  <p className="font-semibold tracking-tight">{t("dash.topCategories")}</p>
                  <Button size="sm" variant="outline" onClick={exportCategories} className="rounded-full gap-1.5">
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> CSV
                  </Button>
                </div>
                <div className="p-6">
                  {categoryData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("dash.noData")}</p>
                  ) : (
                    <ChartContainer config={{ count: { label: "Businesses", color: "hsl(var(--primary))" } }} className="h-64 w-full">
                      <ResponsiveContainer>
                        <BarChart data={categoryData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="category" className="text-xs" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} className="text-xs" tick={{ fontSize: 11 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
              <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="px-6 pt-6 pb-5 border-b border-border/60 flex items-center justify-between">
                  <p className="font-semibold tracking-tight">{t("dash.highestRated")}</p>
                  <Button size="sm" variant="outline" onClick={exportTop} className="rounded-full gap-1.5">
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} /> CSV
                  </Button>
                </div>
                <div className="p-2">
                  {topRated.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-4 py-4">{t("dash.noReviews")}</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          {[t("dash.business"), t("dash.rating"), t("dash.recentAvg"), t("dash.reviews")].map((h) => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {topRated.map((r) => (
                          <tr key={r.name} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium">{r.name}</td>
                            <td className="px-4 py-3 tabular-nums">{r.rating.toFixed(2)}</td>
                            <td className="px-4 py-3 tabular-nums">{r.recent_avg ? r.recent_avg.toFixed(2) : "—"}</td>
                            <td className="px-4 py-3 tabular-nums">{r.review_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
              <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="px-6 pt-6 pb-5 border-b border-border/60">
                  <p className="font-semibold tracking-tight">{t("dash.velocity")}</p>
                </div>
                <div className="p-6">
                  <ChartContainer config={{ reviews: { label: "Reviews", color: "hsl(var(--accent))" } }} className="h-64 w-full">
                    <ResponsiveContainer>
                      <BarChart data={reviewVelocity}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} className="text-xs" tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="reviews" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
