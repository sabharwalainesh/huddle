import { useEffect, useMemo, useState } from "react";
import { Download, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/contexts/A11yContext";
import { Navbar } from "@/components/Navbar";
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main" className="container py-8 space-y-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">{t("dash.title")}</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground">{t("dash.loading")}</p>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <Card><CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase">{t("dash.businesses")}</p>
                <p className="text-3xl font-bold mt-1">{businesses.length}</p>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase">{t("dash.totalReviews")}</p>
                <p className="text-3xl font-bold mt-1">{reviews.length}</p>
              </CardContent></Card>
              <Card><CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase">{t("dash.avgRating")}</p>
                <p className="text-3xl font-bold mt-1">
                  {businesses.length
                    ? (businesses.reduce((s, b) => s + Number(b.avg_rating), 0) / businesses.length).toFixed(2)
                    : "—"}
                </p>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{t("dash.topCategories")}</CardTitle>
                <Button size="sm" variant="outline" onClick={exportCategories}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("dash.noData")}</p>
                ) : (
                  <ChartContainer config={{ count: { label: "Businesses", color: "hsl(var(--primary))" } }} className="h-64 w-full">
                    <ResponsiveContainer>
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="category" className="text-xs" />
                        <YAxis allowDecimals={false} className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{t("dash.highestRated")}</CardTitle>
                <Button size="sm" variant="outline" onClick={exportTop}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent>
                {topRated.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("dash.noReviews")}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground uppercase">
                      <tr><th className="py-2">{t("dash.business")}</th><th>{t("dash.rating")}</th><th>{t("dash.recentAvg")}</th><th>{t("dash.reviews")}</th></tr>
                    </thead>
                    <tbody>
                      {topRated.map((r) => (
                        <tr key={r.name} className="border-t">
                          <td className="py-2 font-medium">{r.name}</td>
                          <td>{r.rating.toFixed(2)}</td>
                          <td>{r.recent_avg ? r.recent_avg.toFixed(2) : "—"}</td>
                          <td>{r.review_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">{t("dash.velocity")}</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{ reviews: { label: "Reviews", color: "hsl(var(--accent))" } }} className="h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart data={reviewVelocity}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" className="text-xs" />
                      <YAxis allowDecimals={false} className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="reviews" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
