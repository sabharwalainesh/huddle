import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Plus, Eye, MapPin, Star, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

interface InsightRow {
  business_id: string;
  avg_rating: number | null;
  review_count: number | null;
  total_views: number | null;
  total_check_ins: number | null;
  status: string;
}

const statusStyle: Record<string, string> = {
  approved:    "bg-success/20 text-success border-success/30",
  pending:     "bg-warning/20 text-warning border-warning/30",
  under_review:"bg-warning/20 text-warning border-warning/30",
  draft:       "bg-muted text-muted-foreground border-border",
  rejected:    "bg-destructive/20 text-destructive border-destructive/30",
};

const GRAD = [
  "from-orange-500 to-rose-500",
  "from-violet-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-sky-500 to-blue-500",
  "from-amber-500 to-orange-500",
];

const BusinessDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      const ids = (biz ?? []).map((b) => b.id);
      const statsRes = ids.length
        ? await supabase.from("business_insights_summary").select("*").in("business_id", ids)
        : { data: [] };
      setBusinesses((biz ?? []) as Business[]);
      setStats((statsRes.data ?? []) as InsightRow[]);
      setLoading(false);
    })();
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      <main id="main" className="container max-w-5xl py-10 flex-1">

        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-8">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">Owner portal</p>
            <h1 className="text-3xl font-bold tracking-tight">My Businesses</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : `${businesses.length} listing${businesses.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button asChild className="rounded-full pl-5 pr-2 gap-3 group transition-all duration-300 active:scale-[0.98]">
            <Link to="/business/onboarding">
              Add business
              <span className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-40 text-muted-foreground gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading your listings…</span>
          </div>
        ) : businesses.length === 0 ? (
          /* Empty state */
          <div className="p-[5px] rounded-[2.5rem] bg-foreground/[0.03] border border-border/50">
            <div className="rounded-[calc(2.5rem-5px)] bg-background px-10 py-24 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] flex flex-col items-center gap-6 text-center">
              <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">No listings yet</h2>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Add your first business to start tracking views, check-ins, and community reviews.
                </p>
              </div>
              <Button asChild className="rounded-full pl-6 pr-2 gap-3 group">
                <Link to="/business/onboarding">
                  List your business
                  <span className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((b, i) => {
              const s = stats.find((st) => st.business_id === b.id);
              const grad = GRAD[i % GRAD.length];
              return (
                <Link
                  key={b.id}
                  to={`/business-dashboard/${b.id}`}
                  className="group p-[5px] rounded-[1.75rem] bg-foreground/[0.03] border border-border/50 hover:border-primary/30 hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] transition-all duration-300"
                >
                  <div className="rounded-[calc(1.75rem-5px)] overflow-hidden bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">

                    {/* Image / gradient hero */}
                    <div className="relative h-40 overflow-hidden">
                      {b.image_url ? (
                        <img
                          src={b.image_url}
                          alt={b.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
                          <span className="text-5xl font-bold text-white/30 select-none">
                            {b.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {/* Status pill */}
                      <span className={`absolute top-3 right-3 text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize backdrop-blur-sm ${statusStyle[b.status] ?? statusStyle.draft}`}>
                        {b.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="px-5 pt-4 pb-5 space-y-3">
                      <div>
                        <h3 className="font-semibold text-base leading-tight truncate group-hover:text-primary transition-colors duration-200">
                          {b.name}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{b.category}</p>
                      </div>

                      {/* Mini stats */}
                      <div className="flex items-center gap-4 pt-1 border-t border-border/40">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                          <span className="tabular-nums font-medium text-foreground">{(s?.total_views ?? 0).toLocaleString()}</span>
                          <span>views</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                          <span className="tabular-nums font-medium text-foreground">{(s?.total_check_ins ?? 0).toLocaleString()}</span>
                          <span>check-ins</span>
                        </div>
                        {(s?.avg_rating ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                            <Star className="h-3 w-3 text-warning fill-warning" strokeWidth={1} />
                            <span className="font-semibold text-foreground tabular-nums">
                              {Number(s!.avg_rating).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Manage CTA */}
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[11px] text-muted-foreground/60">Tap to manage</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Add another card */}
            <Link
              to="/business/onboarding"
              className="group p-[5px] rounded-[1.75rem] bg-foreground/[0.02] border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-300"
            >
              <div className="rounded-[calc(1.75rem-5px)] h-full min-h-[220px] flex flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Add a business</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">List another listing</p>
                </div>
              </div>
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BusinessDashboard;
