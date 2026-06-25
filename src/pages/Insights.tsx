import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Download, BarChart3, Eye, Users, Bookmark, MapPin, Star, Sparkles, Loader2, TrendingUp, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, AreaChart, Area, Cell } from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
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

const downloadHtml = (filename: string, html: string) => {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

interface HtmlReportParams {
  business: Tables<"businesses">;
  stats: InsightRow;
  reviews: Tables<"reviews">[];
  viewsByDay: { day: string; views: number }[];
  health: { score: number; narrative: string } | null;
  summary: string;
}

const buildHtmlReport = ({ business, stats, reviews, viewsByDay, health, summary }: HtmlReportParams): string => {
  const maxViews = Math.max(...viewsByDay.map((v) => v.views), 1);
  const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: reviews.filter((rev) => rev.rating === r).length,
  }));
  const maxRatingCount = Math.max(...ratingDist.map((r) => r.count), 1);

  const chartW = 760;
  const chartH = 180;
  const padL = 36, padB = 28, padR = 12, padT = 12;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padB - padT;
  const bw = (innerW / viewsByDay.length) - 4;

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => {
    const y = padT + innerH - f * innerH;
    const v = Math.round(maxViews * f);
    return `<line x1="${padL}" y1="${y}" x2="${chartW - padR}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>
    <text x="${padL - 5}" y="${y + 3.5}" text-anchor="end" font-size="9" fill="#94a3b8">${v}</text>`;
  }).join("\n");

  const bars = viewsByDay.map((d, i) => {
    const bh = Math.max((d.views / maxViews) * innerH, d.views > 0 ? 3 : 0);
    const x = padL + i * (innerW / viewsByDay.length) + 2;
    const y = padT + innerH - bh;
    const label = i % 2 === 0 ? `<text x="${x + bw / 2}" y="${chartH - 6}" text-anchor="middle" font-size="9" fill="#94a3b8">${d.day}</text>` : "";
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="#3b82f6" opacity="0.78"/>${label}`;
  }).join("\n");

  const viewsSvg = `<svg viewBox="0 0 ${chartW} ${chartH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">${gridLines}${bars}</svg>`;

  const rBars = ratingDist.map((r, i) => {
    const bw2 = (r.count / maxRatingCount) * 220;
    const y = i * 26 + 4;
    const col = r.rating >= 4 ? "#10b981" : r.rating === 3 ? "#f59e0b" : "#ef4444";
    return `<text x="0" y="${y + 14}" font-size="11" fill="#64748b">${r.rating}★</text>
    <rect x="24" y="${y + 3}" width="${Math.max(bw2, r.count > 0 ? 4 : 0)}" height="14" rx="3" fill="${col}" opacity="0.75"/>
    <text x="${24 + Math.max(bw2, r.count > 0 ? 4 : 0) + 5}" y="${y + 14}" font-size="10" fill="#94a3b8">${r.count}</text>`;
  }).join("\n");

  const ratingSvg = `<svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:280px;height:auto;display:block">${rBars}</svg>`;

  const engRows = [
    { label: "Check-in rate", val: stats.total_views > 0 ? ((stats.total_check_ins / stats.total_views) * 100).toFixed(1) : "0", col: "#3b82f6" },
    { label: "Review rate",   val: stats.total_views > 0 ? ((stats.review_count / stats.total_views) * 100).toFixed(1) : "0", col: "#8b5cf6" },
    { label: "Bookmark rate", val: stats.total_views > 0 ? ((stats.total_bookmarks / stats.total_views) * 100).toFixed(1) : "0", col: "#10b981" },
  ].map((m) => {
    const pct = Math.min(parseFloat(m.val) * 12, 100);
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:5px">
        <span>${m.label}</span>
        <span style="font-family:monospace;font-weight:600;color:#0f172a">${m.val}%</span>
      </div>
      <div style="height:7px;border-radius:4px;background:#f1f5f9;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${m.col};border-radius:4px;transition:width 0.6s ease"></div>
      </div>
    </div>`;
  }).join("");

  let gaugeSvg = "";
  if (health) {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const cx = 80, cy = 78, r = 58;
    const startDeg = -210, totalDeg = 240;
    const scoreDeg = (health.score / 100) * totalDeg;
    const arcPath = (a1: number, a2: number) => {
      const x1 = cx + r * Math.cos(toRad(a1)), y1 = cy + r * Math.sin(toRad(a1));
      const x2 = cx + r * Math.cos(toRad(a2)), y2 = cy + r * Math.sin(toRad(a2));
      return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
    };
    const col = health.score >= 75 ? "#10b981" : health.score >= 40 ? "#f59e0b" : "#ef4444";
    gaugeSvg = `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" style="width:160px;height:120px;flex-shrink:0">
      <path d="${arcPath(startDeg, startDeg + totalDeg)}" stroke="#e2e8f0" stroke-width="11" fill="none" stroke-linecap="round"/>
      ${scoreDeg > 2 ? `<path d="${arcPath(startDeg, startDeg + scoreDeg)}" stroke="${col}" stroke-width="11" fill="none" stroke-linecap="round"/>` : ""}
      <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="26" font-weight="700" fill="${col}">${health.score}</text>
      <text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="9" fill="#94a3b8">OUT OF 100</text>
    </svg>`;
  }

  const reviewRows = reviews.slice(0, 15).map((r) => {
    const stars = "★".repeat(r.rating ?? 0) + "☆".repeat(5 - (r.rating ?? 0));
    return `<tr>
      <td style="padding:10px 14px;font-size:13px;color:#f59e0b;letter-spacing:1px">${stars}</td>
      <td style="padding:10px 14px;font-size:13px;color:#334155;max-width:340px">${r.comment ?? "—"}</td>
      <td style="padding:10px 14px;font-size:11px;color:#94a3b8;white-space:nowrap">${new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
      <td style="padding:10px 14px">${r.verified ? `<span style="font-size:10px;background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:99px;font-weight:600">Verified</span>` : ""}</td>
    </tr>`;
  }).join("");

  const statCards = [
    { label: "Total Views",      val: stats.total_views.toLocaleString() },
    { label: "Views (30d)",      val: stats.views_30d.toLocaleString() },
    { label: "Unique Viewers",   val: stats.unique_viewers.toLocaleString() },
    { label: "Check-ins",        val: stats.total_check_ins.toLocaleString() },
    { label: "Check-ins (30d)",  val: stats.check_ins_30d.toLocaleString() },
    { label: "Bookmarks",        val: stats.total_bookmarks.toLocaleString() },
    { label: "Reviews",          val: stats.review_count.toLocaleString() },
    { label: "Avg Rating",       val: Number(stats.avg_rating).toFixed(2) },
  ].map((s) => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px">
    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:8px">${s.label}</div>
    <div style="font-size:24px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;letter-spacing:-0.02em">${s.val}</div>
  </div>`).join("");

  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Huddle Insights — ${business.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Geist',ui-sans-serif,system-ui,sans-serif;background:#f8fafc;color:#0f172a;-webkit-font-smoothing:antialiased}
.page{max-width:900px;margin:0 auto;padding:48px 24px 64px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 32px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
.section-label{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:16px}
h1{font-size:26px;font-weight:700;letter-spacing:-0.03em;line-height:1.2;color:#0f172a}
.cat-badge{display:inline-block;padding:2px 10px;border-radius:99px;background:#f1f5f9;color:#475569;font-size:11px;font-weight:600;margin-left:8px;vertical-align:middle}
.status-badge{display:inline-block;padding:2px 10px;border-radius:99px;background:#dcfce7;color:#16a34a;font-size:11px;font-weight:600;text-transform:capitalize}
.meta{font-size:12px;color:#94a3b8;margin-top:4px}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media(max-width:640px){.grid-4{grid-template-columns:repeat(2,1fr)}}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
@media(max-width:640px){.two-col{grid-template-columns:1fr}}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;padding:8px 14px 10px;border-bottom:1.5px solid #f1f5f9}
tr{border-bottom:1px solid #f8fafc}
.health-wrap{display:flex;align-items:center;gap:28px}
@media(max-width:500px){.health-wrap{flex-direction:column;align-items:flex-start}}
.summary-text{font-size:14px;line-height:1.75;color:#475569;white-space:pre-wrap}
.footer-line{text-align:center;font-size:11px;color:#cbd5e1;margin-top:48px;padding-top:24px;border-top:1px solid #f1f5f9}
</style>
</head>
<body>
<div class="page">

  <div class="card" style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
    <div>
      <p class="meta" style="margin-bottom:8px">Huddle &bull; Insights Report</p>
      <h1>${business.name}<span class="cat-badge">${business.category}</span></h1>
      <p class="meta" style="margin-top:8px">
        <span class="status-badge">${business.status}</span>
        &nbsp;&bull;&nbsp;Generated ${date}
        ${business.address ? `&nbsp;&bull;&nbsp;${business.address}` : ""}
      </p>
    </div>
  </div>

  <div class="card">
    <p class="section-label">Performance metrics</p>
    <div class="grid-4">${statCards}</div>
  </div>

  ${health ? `<div class="card">
    <p class="section-label">Business health score</p>
    <div class="health-wrap">
      ${gaugeSvg}
      <div>
        <p style="font-size:20px;font-weight:700;color:${health.score >= 75 ? "#10b981" : health.score >= 40 ? "#f59e0b" : "#ef4444"};margin-bottom:6px">${health.score >= 75 ? "Strong" : health.score >= 40 ? "Growing" : "Needs work"}</p>
        <p style="font-size:13px;color:#64748b;line-height:1.65;max-width:500px">${health.narrative}</p>
      </div>
    </div>
  </div>` : ""}

  <div class="card">
    <p class="section-label">Views — last 14 days</p>
    ${viewsSvg}
  </div>

  <div class="two-col">
    <div class="card" style="margin-bottom:0">
      <p class="section-label">Rating distribution</p>
      ${ratingSvg}
    </div>
    <div class="card" style="margin-bottom:0">
      <p class="section-label">Engagement breakdown</p>
      ${engRows}
    </div>
  </div>
  <div style="margin-bottom:20px"></div>

  ${reviews.length ? `<div class="card">
    <p class="section-label">Reviews (${reviews.length})</p>
    <table>
      <thead><tr><th>Rating</th><th>Comment</th><th>Date</th><th></th></tr></thead>
      <tbody>${reviewRows}</tbody>
    </table>
  </div>` : ""}

  ${summary ? `<div class="card">
    <p class="section-label">AI summary</p>
    <p class="summary-text">${summary}</p>
  </div>` : ""}

  <div class="footer-line">Huddle &mdash; ${date}</div>
</div>
</body>
</html>`;
};

const EXPORT_SECTIONS = [
  { id: "info",    label: "Business info",  desc: "Name, category, address, phone, website" },
  { id: "reviews", label: "Reviews",        desc: "Rating, comment, verified status, and date" },
  { id: "views",   label: "Views timeline", desc: "Daily view counts for the last 14 days" },
  { id: "summary", label: "AI summary",     desc: "Generated AI summary text (requires generation first)" },
] as const;

type SectionId = (typeof EXPORT_SECTIONS)[number]["id"];

const STAT_METRICS = [
  { id: "total_views",     label: "Total views",           field: "total_views" },
  { id: "views_30d",       label: "Views (last 30 days)",  field: "views_30d" },
  { id: "unique_viewers",  label: "Unique viewers",        field: "unique_viewers" },
  { id: "total_check_ins", label: "Check-ins (total)",     field: "total_check_ins" },
  { id: "check_ins_30d",   label: "Check-ins (last 30d)",  field: "check_ins_30d" },
  { id: "total_bookmarks", label: "Bookmarks",             field: "total_bookmarks" },
  { id: "review_count",    label: "Review count",          field: "review_count" },
  { id: "avg_rating",      label: "Avg rating",            field: "avg_rating" },
] as const;

type StatMetricId = (typeof STAT_METRICS)[number]["id"];

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
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSections, setExportSections] = useState<Set<SectionId>>(new Set(["info", "reviews"]));
  const [exportStatMetrics, setExportStatMetrics] = useState<Set<StatMetricId>>(
    new Set(STAT_METRICS.map((m) => m.id)),
  );

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

  const ratingDistribution = useMemo(() => [1, 2, 3, 4, 5].map((r) => ({
    rating: `${r}★`,
    count: selectedReviews.filter((rev) => rev.rating === r).length,
  })), [selectedReviews]);

  const engagementMetrics = useMemo(() => {
    if (!selectedStats) return [];
    const views = selectedStats.total_views || 1;
    return [
      { name: "Check-ins", value: selectedStats.total_check_ins, pct: +((selectedStats.total_check_ins / views) * 100).toFixed(1), fill: "#3b82f6" },
      { name: "Bookmarks", value: selectedStats.total_bookmarks, pct: +((selectedStats.total_bookmarks / views) * 100).toFixed(1), fill: "#10b981" },
      { name: "Reviews",   value: selectedStats.review_count,    pct: +((selectedStats.review_count / views) * 100).toFixed(1),    fill: "#8b5cf6" },
    ];
  }, [selectedStats]);

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

  const runExport = () => {
    if (!selectedBusiness) return;
    const slug = selectedBusiness.name.replace(/\W+/g, "-");
    const allRows: Record<string, string | number | null | undefined>[] = [];

    if (exportSections.has("info")) {
      allRows.push(
        { section: "Business Info", field: "name",     value: selectedBusiness.name },
        { section: "Business Info", field: "category", value: selectedBusiness.category },
        { section: "Business Info", field: "status",   value: selectedBusiness.status },
        { section: "Business Info", field: "address",  value: selectedBusiness.address ?? "" },
        { section: "Business Info", field: "phone",    value: selectedBusiness.phone ?? "" },
        { section: "Business Info", field: "website",  value: selectedBusiness.website ?? "" },
      );
    }

    if (selectedStats && exportStatMetrics.size > 0) {
      const statValueMap: Record<string, string | number | null | undefined> = {
        total_views:     selectedStats.total_views,
        views_30d:       selectedStats.views_30d,
        unique_viewers:  selectedStats.unique_viewers,
        total_check_ins: selectedStats.total_check_ins,
        check_ins_30d:   selectedStats.check_ins_30d,
        total_bookmarks: selectedStats.total_bookmarks,
        review_count:    selectedStats.review_count,
        avg_rating:      selectedStats.avg_rating != null ? Number(selectedStats.avg_rating).toFixed(2) : "—",
      };
      STAT_METRICS.forEach((m) => {
        if (exportStatMetrics.has(m.id)) {
          allRows.push({ section: "Stats", field: m.field, value: statValueMap[m.field] });
        }
      });
    }

    if (exportSections.has("reviews") && selectedReviews.length) {
      selectedReviews.forEach((r, i) => {
        allRows.push({
          section: "Review",
          field: `review_${i + 1}`,
          value: `${r.rating ?? "—"} stars — ${r.comment ?? "(no comment)"} (${new Date(r.created_at).toLocaleDateString()})`,
          verified: r.verified ? "yes" : "no",
        });
      });
    }

    if (exportSections.has("views") && viewsByDay.length) {
      viewsByDay.forEach(({ day, views: count }) => {
        allRows.push({ section: "Views", field: day, value: count });
      });
    }

    if (exportSections.has("summary") && summary) {
      allRows.push({ section: "AI Summary", field: "summary", value: summary });
    }

    if (!allRows.length) {
      toast({ title: "Nothing to export", description: "Select at least one section.", variant: "destructive" });
      return;
    }

    downloadCsv(`huddle-insights-${slug}.csv`, allRows);
    setExportOpen(false);
    toast({ title: "Report downloaded", description: `huddle-insights-${slug}.csv` });
  };

  const runHtmlExport = () => {
    if (!selectedBusiness || !selectedStats) return;
    const slug = selectedBusiness.name.replace(/\W+/g, "-");
    const html = buildHtmlReport({
      business: selectedBusiness,
      stats: selectedStats,
      reviews: selectedReviews,
      viewsByDay,
      health,
      summary,
    });
    downloadHtml(`huddle-report-${slug}.html`, html);
    setExportOpen(false);
    toast({ title: "Report downloaded", description: `huddle-report-${slug}.html` });
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
                  <Button onClick={() => setExportOpen(true)} variant="outline" className="rounded-full gap-2">
                    <Download className="h-4 w-4" strokeWidth={1.5} /> Export
                  </Button>
                </div>

                {/* Export dialog */}
                <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                  <DialogContent className="rounded-2xl sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-primary" strokeWidth={1.5} />
                        Customize your report
                      </DialogTitle>
                      <DialogDescription>
                        Choose what to include in the exported CSV file.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                      {/* Performance stats — expanded per-metric */}
                      <div className="rounded-xl border border-border/50 overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-3.5 py-3 bg-muted/30 border-b border-border/50">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">Performance stats</p>
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                              {exportStatMetrics.size}/{STAT_METRICS.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setExportStatMetrics(new Set(STAT_METRICS.map((m) => m.id)))}
                              className="text-[11px] text-primary hover:underline font-medium"
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => setExportStatMetrics(new Set())}
                              className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                            >
                              None
                            </button>
                          </div>
                        </div>
                        <div className="divide-y divide-border/40">
                          {STAT_METRICS.map((m) => {
                            const disabled = !selectedStats;
                            const checked = exportStatMetrics.has(m.id);
                            return (
                              <label
                                key={m.id}
                                className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                                  checked && !disabled ? "bg-primary/5" : "hover:bg-muted/30"
                                } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                              >
                                <Checkbox
                                  checked={checked}
                                  disabled={disabled}
                                  onCheckedChange={(v) =>
                                    setExportStatMetrics((prev) => {
                                      const next = new Set(prev);
                                      if (v) next.add(m.id); else next.delete(m.id);
                                      return next;
                                    })
                                  }
                                  className="shrink-0"
                                />
                                <span className="text-sm">{m.label}</span>
                                {selectedStats && (
                                  <span className="ml-auto text-xs font-mono text-muted-foreground tabular-nums">
                                    {m.id === "avg_rating"
                                      ? selectedStats.avg_rating != null ? Number(selectedStats.avg_rating).toFixed(2) : "—"
                                      : ((selectedStats as Record<string, unknown>)[m.field] ?? 0).toLocaleString()}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Other sections */}
                      {EXPORT_SECTIONS.map((s) => {
                        const disabled =
                          (s.id === "summary" && !summary) ||
                          (s.id === "reviews" && !selectedReviews.length);
                        const note =
                          s.id === "summary" && !summary
                            ? "Generate the AI summary first to include it"
                            : s.id === "reviews" && !selectedReviews.length
                            ? "No reviews yet for this business"
                            : s.desc;
                        return (
                          <label
                            key={s.id}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                              exportSections.has(s.id) && !disabled
                                ? "border-primary/30 bg-primary/5"
                                : "border-border/50 bg-muted/20 hover:bg-muted/40"
                            } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                          >
                            <Checkbox
                              checked={exportSections.has(s.id)}
                              disabled={disabled}
                              onCheckedChange={(v) =>
                                setExportSections((prev) => {
                                  const next = new Set(prev);
                                  if (v) next.add(s.id); else next.delete(s.id);
                                  return next;
                                })
                              }
                              className="mt-0.5 shrink-0"
                            />
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium leading-none">{s.label}</p>
                              <p className="text-xs text-muted-foreground">{note}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
                      <Button variant="outline" onClick={() => setExportOpen(false)} className="rounded-full">Cancel</Button>
                      <Button
                        onClick={runHtmlExport}
                        variant="outline"
                        className="rounded-full gap-2"
                      >
                        <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Visual Report (HTML)
                      </Button>
                      <Button
                        onClick={runExport}
                        disabled={exportSections.size === 0 && exportStatMetrics.size === 0}
                        className="rounded-full gap-2"
                      >
                        <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Download CSV
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

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
                    <div className="px-6 pt-6 pb-5 border-b border-border/60 flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      <p className="font-semibold tracking-tight">Views — last 14 days</p>
                    </div>
                    <div className="p-6">
                      <ChartContainer config={{ views: { label: "Views", color: "hsl(var(--primary))" } }} className="h-56 w-full">
                        <ResponsiveContainer>
                          <AreaChart data={viewsByDay}>
                            <defs>
                              <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#viewsGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </div>
                </div>

                {/* Rating distribution + Engagement breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Rating distribution */}
                  <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
                    <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <div className="px-6 pt-6 pb-5 border-b border-border/60 flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                        <p className="font-semibold tracking-tight">Rating distribution</p>
                      </div>
                      <div className="p-6">
                        {selectedReviews.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4">No reviews yet.</p>
                        ) : (
                          <ChartContainer
                            config={{
                              count: { label: "Reviews", color: "hsl(var(--primary))" },
                            }}
                            className="h-44 w-full"
                          >
                            <ResponsiveContainer>
                              <BarChart data={ratingDistribution} layout="vertical" barCategoryGap="20%">
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis dataKey="rating" type="category" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={28} />
                                <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                                <Bar dataKey="count" radius={[0, 5, 5, 0]}>
                                  {ratingDistribution.map((_entry, idx) => {
                                    const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981"];
                                    return <Cell key={idx} fill={colors[idx]} opacity={0.82} />;
                                  })}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Engagement breakdown */}
                  <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
                    <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <div className="px-6 pt-6 pb-5 border-b border-border/60 flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                        <p className="font-semibold tracking-tight">Engagement breakdown</p>
                      </div>
                      <div className="px-6 py-6 space-y-4">
                        {engagementMetrics.map((m) => (
                          <div key={m.name}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-muted-foreground">{m.name}</span>
                              <span className="text-xs font-semibold tabular-nums text-foreground">{m.value.toLocaleString()} <span className="font-normal text-muted-foreground">({m.pct}%)</span></span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(m.pct * 10, 100)}%`, background: m.fill }}
                              />
                            </div>
                          </div>
                        ))}
                        <p className="text-[10px] text-muted-foreground pt-1">As a % of total views ({selectedStats?.total_views.toLocaleString()})</p>
                      </div>
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
