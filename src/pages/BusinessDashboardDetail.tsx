import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Eye, Bookmark, MapPin, Star, Sparkles, Loader2, TrendingUp,
  ArrowLeft, ExternalLink, Pencil, RefreshCw, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;
type Review = Tables<"reviews">;

interface InsightRow {
  business_id: string;
  avg_rating: number | null;
  review_count: number | null;
  total_views: number | null;
  unique_viewers: number | null;
  views_30d: number | null;
  total_bookmarks: number | null;
  total_check_ins: number | null;
  check_ins_30d: number | null;
}

const statusStyle: Record<string, string> = {
  approved:    "bg-success/15 text-success border-success/30",
  pending:     "bg-warning/15 text-warning border-warning/30",
  under_review:"bg-warning/15 text-warning border-warning/30",
  draft:       "bg-muted text-muted-foreground border-border",
  rejected:    "bg-destructive/15 text-destructive border-destructive/30",
};

const StatCard = ({
  icon: Icon, label, value, sub, color = "primary",
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  color?: "primary" | "accent" | "success" | "warning";
}) => {
  const map = {
    primary: "bg-primary/10 text-primary",
    accent:  "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
      <div className="rounded-[calc(1.5rem-5px)] bg-background px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] space-y-3">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${map[color]}`}>
          <Icon className="h-4.5 w-4.5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
          {sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
};

const BusinessDashboardDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<InsightRow | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const autoRan = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      setLoading(true);
      const [bizRes, statsRes, revRes] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle(),
        supabase.from("business_insights_summary").select("*").eq("business_id", id).maybeSingle(),
        supabase.from("reviews").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (!bizRes.data) { navigate("/business-dashboard"); return; }
      setBusiness(bizRes.data as Business);
      setStats((statsRes.data ?? null) as InsightRow | null);
      setReviews((revRes.data ?? []) as Review[]);
      setLoading(false);
    })();
  }, [user, id, navigate]);

  useEffect(() => {
    if (business && stats && !autoRan.current) {
      autoRan.current = true;
      generateSummary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, stats]);

  const generateSummary = async () => {
    if (!business || !stats) return;
    setSummaryLoading(true);
    setSummary("");
    try {
      const { data, error } = await supabase.functions.invoke("insights-summary", {
        body: {
          business: {
            name: business.name,
            category: business.category,
            avg_rating: Number(stats.avg_rating ?? 0),
            review_count: stats.review_count ?? 0,
            total_views: stats.total_views ?? 0,
            unique_viewers: stats.unique_viewers ?? 0,
            views_30d: stats.views_30d ?? 0,
            total_bookmarks: stats.total_bookmarks ?? 0,
            total_check_ins: stats.total_check_ins ?? 0,
            check_ins_30d: stats.check_ins_30d ?? 0,
          },
          recent_reviews: reviews.slice(0, 5).map((r) => ({ rating: r.rating, comment: r.comment })),
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main id="main" className="container max-w-4xl py-10 flex-1 space-y-5">

        {/* Back */}
        <Link
          to="/business-dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
          All businesses
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-40 text-muted-foreground gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : business ? (
          <>
            {/* Business hero */}
            <div className="p-[5px] rounded-[2rem] bg-foreground/[0.03] border border-border/50 overflow-hidden">
              <div className="rounded-[calc(2rem-5px)] overflow-hidden bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                {/* Cover image */}
                <div className="relative h-44 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 overflow-hidden">
                  {business.image_url && (
                    <img src={business.image_url} alt={business.name} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
                    <div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize backdrop-blur-sm ${statusStyle[business.status] ?? statusStyle.draft}`}>
                        {business.status.replace("_", " ")}
                      </span>
                      <h1 className="text-2xl font-bold text-white mt-2 leading-tight">{business.name}</h1>
                      <p className="text-sm text-white/70 capitalize mt-0.5">{business.category}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button asChild size="sm" variant="outline" className="rounded-full px-3 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                        <Link to={`/business/${business.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                          View
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="rounded-full px-3 gap-2">
                        <Link to={`/business/${business.id}?edit=true`}>
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Eye} label="Total views" value={(stats?.total_views ?? 0).toLocaleString()} sub={`${stats?.views_30d ?? 0} this month`} color="primary" />
              <StatCard icon={Bookmark} label="Saves" value={(stats?.total_bookmarks ?? 0).toLocaleString()} color="accent" />
              <StatCard icon={MapPin} label="Check-ins" value={(stats?.total_check_ins ?? 0).toLocaleString()} sub={`${stats?.check_ins_30d ?? 0} this month`} color="success" />
              <StatCard icon={Star} label="Avg rating" value={stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : "—"} sub={`${stats?.review_count ?? 0} review${(stats?.review_count ?? 0) !== 1 ? "s" : ""}`} color="warning" />
            </div>

            {/* AI summary */}
            <div className="p-[5px] rounded-[2rem] bg-gradient-to-br from-primary/8 via-background to-accent/5 border border-primary/15">
              <div className="rounded-[calc(2rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="px-7 pt-6 pb-5 border-b border-border/60 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold tracking-tight">AI community summary</p>
                      <p className="text-xs text-muted-foreground mt-0.5">What your neighbors are saying</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={generateSummary} disabled={summaryLoading} className="rounded-full px-4 gap-2 shrink-0">
                    {summaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />}
                    {summaryLoading ? "Generating…" : summary ? "Regenerate" : "Generate"}
                  </Button>
                </div>
                <div className="px-7 py-6 min-h-[96px] flex items-center">
                  {summaryLoading ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <span className="text-sm">Reading reviews and building a summary…</span>
                    </div>
                  ) : summary ? (
                    <p className="text-sm leading-relaxed text-foreground/80">{summary}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {reviews.length === 0
                        ? "No reviews yet — your AI summary will appear once customers start leaving feedback."
                        : "Click Generate to see an AI-powered summary of what your community is saying."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 30-day snapshot */}
            <div className="p-[5px] rounded-[2rem] bg-foreground/[0.03] border border-border/50">
              <div className="rounded-[calc(2rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="px-7 pt-6 pb-5 border-b border-border/60 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-semibold tracking-tight">30-day snapshot</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Recent engagement at a glance</p>
                  </div>
                </div>
                <div className="px-7 py-6 grid grid-cols-3 divide-x divide-border/40">
                  {[
                    { label: "Views", value: stats?.views_30d ?? 0, icon: Eye },
                    { label: "Check-ins", value: stats?.check_ins_30d ?? 0, icon: MapPin },
                    { label: "Unique visitors", value: stats?.unique_viewers ?? 0, icon: TrendingUp },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex flex-col items-center gap-1 text-center px-4 first:pl-0 last:pr-0">
                      <Icon className="h-4 w-4 text-muted-foreground mb-1" strokeWidth={1.5} />
                      <span className="text-2xl font-bold tabular-nums">{(value as number).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="p-[5px] rounded-[2rem] bg-foreground/[0.03] border border-border/50">
              <div className="rounded-[calc(2rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="px-7 pt-6 pb-5 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-warning/10 flex items-center justify-center">
                      <Star className="h-5 w-5 text-warning" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold tracking-tight">Recent reviews</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{reviews.length} total</p>
                    </div>
                  </div>
                  {(stats?.avg_rating ?? 0) > 0 && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(Number(stats!.avg_rating)) ? "text-warning fill-warning" : "text-border"}`} strokeWidth={1} />
                      ))}
                      <span className="text-sm font-semibold ml-1.5 tabular-nums">{Number(stats!.avg_rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  {reviews.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm text-muted-foreground">No reviews yet. Share your listing to get your first one!</p>
                    </div>
                  ) : reviews.slice(0, 5).map((r) => (
                    <div key={r.id} className="px-4 py-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < (r.rating ?? 0) ? "text-warning fill-warning" : "text-border"}`} strokeWidth={1} />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      {r.comment && <p className="text-sm text-foreground/80 leading-relaxed">{r.comment}</p>}
                    </div>
                  ))}
                </div>

                {/* Business details */}
                <div className="px-7 py-5 border-t border-border/60 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Listing details</p>
                  {[
                    { label: "Address", value: business.address },
                    { label: "Phone", value: business.phone },
                    { label: "Website", value: business.website },
                    { label: "Description", value: business.description },
                  ].filter(({ value }) => value).map(({ label, value }) => (
                    <div key={label} className="flex gap-4">
                      <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">{label}</span>
                      <span className="text-sm text-foreground/80 leading-relaxed">{value}</span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button asChild size="sm" variant="outline" className="rounded-full px-4 gap-2">
                      <Link to={`/business/${business.id}?edit=true`}>
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Edit listing
                        <ChevronRight className="h-3.5 w-3.5 ml-1" strokeWidth={1.5} />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
};

export default BusinessDashboardDetail;
