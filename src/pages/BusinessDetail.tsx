import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import {
  Bookmark, BookmarkCheck, Globe, MapPin, Phone, Tag, ArrowLeft,
  MapPinned, ShieldCheck, Star, ExternalLink, Loader2, Eye, Users,
  BarChart3, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/StarRating";
import { ReceiptVerifier } from "@/components/ReceiptVerifier";
import { ReviewThemes } from "@/components/ReviewThemes";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;
type Review = Tables<"reviews"> & { profiles?: { display_name: string } | null };
type Coupon = Tables<"coupons">;

interface InsightRow {
  business_id: string;
  total_views: number;
  unique_viewers: number;
  views_30d: number;
  total_bookmarks: number;
  total_check_ins: number;
  check_ins_30d: number;
  avg_rating: number;
  review_count: number;
}

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10, "Please write at least 10 characters").max(1000),
});

type GoogleReview = {
  author: string;
  authorUri: string | null;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
};
type GoogleData = {
  found: boolean;
  rating: number | null;
  userRatingCount: number;
  googleMapsUri: string | null;
  reviews: GoogleReview[];
};

const StatPill = ({
  icon: Icon, label, value, sub,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
}) => (
  <div className="flex flex-col gap-0.5 px-4 first:pl-0 last:pr-0">
    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      <Icon className="h-3 w-3" strokeWidth={1.5} />
      {label}
    </div>
    <p className="text-xl font-bold tabular-nums">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground tabular-nums">{sub}</p>}
  </div>
);

const BusinessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ownerStats, setOwnerStats] = useState<InsightRow | null>(null);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [visitVerified, setVisitVerified] = useState(false);
  const [posting, setPosting] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const [googleData, setGoogleData] = useState<GoogleData | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const fetchGoogleReviews = async () => {
    if (!business) return;
    setLoadingGoogle(true);
    const { data, error } = await supabase.functions.invoke("google-place-reviews", {
      body: { business_id: business.id, name: business.name, address: business.address },
    });
    setLoadingGoogle(false);
    if (error) return toast({ title: "Couldn't load Google reviews", description: error.message, variant: "destructive" });
    if (data?.error) return toast({ title: "Couldn't load Google reviews", description: String(data.error), variant: "destructive" });
    setGoogleData(data as GoogleData);
    if (!data?.found) toast({ title: "No Google match found for this business" });
  };

  const checkIn = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!business) return;
    setCheckingIn(true);
    const { error } = await supabase.from("check_ins").insert({ business_id: business.id, user_id: user.id });
    setCheckingIn(false);
    if (error) return toast({ title: "Couldn't check in", description: error.message, variant: "destructive" });
    toast({ title: "Checked in!", description: "Thanks for supporting local 💛" });
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [bRes, rRes, cRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
      supabase.from("reviews").select("*").eq("business_id", id).order("created_at", { ascending: false }),
      supabase.from("active_coupons").select("*").eq("business_id", id),
    ]);
    if (bRes.error || !bRes.data) {
      toast({ title: "Business not found", variant: "destructive" });
      navigate("/");
      return;
    }
    const biz = bRes.data as Business;
    setBusiness(biz);

    const reviewRows = (rRes.data ?? []) as Review[];
    const userIds = Array.from(new Set(reviewRows.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const map = new Map((profs ?? []).map((p) => [p.user_id, p.display_name]));
      reviewRows.forEach((r) => { r.profiles = { display_name: map.get(r.user_id) ?? "Member" }; });
    }
    setReviews(reviewRows);
    setCoupons((cRes.data ?? []) as Coupon[]);

    if (user) {
      const { data: bm } = await supabase.from("bookmarks").select("id").eq("user_id", user.id).eq("business_id", id).maybeSingle();
      setBookmarked(!!bm);

      if (user.id === biz.owner_id) {
        const { data: statsData } = await supabase
          .from("business_insights_summary")
          .select("*")
          .eq("business_id", id)
          .maybeSingle();
        setOwnerStats((statsData ?? null) as InsightRow | null);
      }
    } else {
      setBookmarked(false);
    }
    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id) return;
    const key = `huddle:view:${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase.from("business_views").insert({ business_id: id, viewer_id: user?.id ?? null }).then(() => {});
  }, [id, user?.id]);

  const toggleBookmark = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!business) return;
    if (bookmarked) {
      const { error } = await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("business_id", business.id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
      setBookmarked(false);
    } else {
      const { error } = await supabase.from("bookmarks").insert({ user_id: user.id, business_id: business.id });
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
      setBookmarked(true);
      toast({ title: "Bookmarked" });
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    if (!business) return;
    const parsed = reviewSchema.safeParse({ rating, comment });
    if (!parsed.success) return toast({ title: "Invalid review", description: parsed.error.issues[0].message, variant: "destructive" });
    setPosting(true);
    const { error } = await supabase.from("reviews").insert({
      business_id: business.id,
      user_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      verified: visitVerified,
    });
    setPosting(false);
    if (error) return toast({ title: "Couldn't post review", description: error.message, variant: "destructive" });
    toast({ title: visitVerified ? "Verified review posted!" : "Review posted!" });
    setRating(0); setComment(""); setVisitVerified(false);
    load();
  };

  if (loading || !business) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main id="main" className="container py-8 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </main>
      </div>
    );
  }

  const isOwner = user?.id === business.owner_id;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main id="main" className="container max-w-4xl py-8 flex-1 space-y-5">

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
          Back
        </button>

        {/* Hero card */}
        <div className="p-[5px] rounded-[2rem] bg-foreground/[0.03] border border-border/50 overflow-hidden">
          <div className="rounded-[calc(2rem-5px)] overflow-hidden bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="relative h-52 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 overflow-hidden">
              {business.image_url && (
                <img src={business.image_url} alt={business.name} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6">
                <Badge variant="secondary" className="capitalize mb-2 bg-white/10 text-white border-white/20 backdrop-blur-sm">
                  {business.category}
                </Badge>
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{business.name}</h1>
                {business.avg_rating != null && Number(business.avg_rating) > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < Math.round(Number(business.avg_rating)) ? "text-amber-400 fill-amber-400" : "text-white/30"}`}
                          strokeWidth={1}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-white/80 tabular-nums">
                      {Number(business.avg_rating).toFixed(1)} · {business.review_count} review{business.review_count === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action bar */}
            <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/50">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={checkIn} disabled={checkingIn} className="rounded-full gap-2">
                  <MapPinned className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {checkingIn ? "Checking in…" : "Check in"}
                </Button>
                {business.website && (
                  <Button asChild variant="outline" size="sm" className="rounded-full gap-2">
                    <a href={business.website} target="_blank" rel="noreferrer">
                      <Globe className="h-3.5 w-3.5" strokeWidth={1.5} /> Website
                    </a>
                  </Button>
                )}
              </div>
              <Button
                onClick={toggleBookmark}
                variant={bookmarked ? "default" : "outline"}
                size="sm"
                className="rounded-full gap-2"
              >
                {bookmarked
                  ? <><BookmarkCheck className="h-3.5 w-3.5" strokeWidth={1.5} /> Saved</>
                  : <><Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} /> Save</>}
              </Button>
            </div>

            {/* Info */}
            <div className="px-6 py-5 space-y-3">
              {business.description && (
                <p className="text-sm text-foreground/80 leading-relaxed">{business.description}</p>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {business.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    {business.address}
                  </span>
                )}
                {business.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                    {business.phone}
                  </span>
                )}
              </div>
              {business.tags && business.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  {business.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="rounded-full text-[11px] px-2.5">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Owner insights panel */}
        {isOwner && (
          <div className="p-[5px] rounded-[2rem] bg-gradient-to-br from-primary/10 to-accent/8 border border-primary/20">
            <div className="rounded-[calc(2rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="px-7 pt-6 pb-5 border-b border-border/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-semibold tracking-tight">Your performance</p>
                    <p className="text-xs text-muted-foreground mt-0.5">How this listing is doing</p>
                  </div>
                </div>
                <Button asChild size="sm" className="rounded-full px-4 gap-2 shrink-0">
                  <Link to="/insights">
                    Full insights
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Link>
                </Button>
              </div>

              {ownerStats ? (
                <>
                  <div className="px-7 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 border-b border-border/50">
                    <StatPill icon={Eye} label="Total views" value={(ownerStats.total_views ?? 0).toLocaleString()} sub={`${ownerStats.views_30d ?? 0} this month`} />
                    <StatPill icon={Users} label="Unique viewers" value={(ownerStats.unique_viewers ?? 0).toLocaleString()} />
                    <StatPill icon={MapPin} label="Check-ins" value={(ownerStats.total_check_ins ?? 0).toLocaleString()} sub={`${ownerStats.check_ins_30d ?? 0} this month`} />
                    <StatPill icon={Bookmark} label="Saves" value={(ownerStats.total_bookmarks ?? 0).toLocaleString()} />
                  </div>
                  <div className="px-7 py-4 grid grid-cols-3 divide-x divide-border/40">
                    {[
                      {
                        label: "View → check-in",
                        value: ownerStats.total_views > 0
                          ? `${((ownerStats.total_check_ins / ownerStats.total_views) * 100).toFixed(1)}%`
                          : "—",
                      },
                      {
                        label: "View → review",
                        value: ownerStats.total_views > 0
                          ? `${((ownerStats.review_count / ownerStats.total_views) * 100).toFixed(1)}%`
                          : "—",
                      },
                      {
                        label: "Avg rating",
                        value: ownerStats.avg_rating ? Number(ownerStats.avg_rating).toFixed(2) : "—",
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-0.5 text-center px-4 first:pl-0 last:pr-0">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
                        <span className="text-xl font-bold tabular-nums">{value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="px-7 py-8 text-sm text-muted-foreground">
                  No stats available yet — check back once your listing has some visitors.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coupons */}
        {coupons.length > 0 && (
          <div className="p-[5px] rounded-[2rem] bg-foreground/[0.03] border border-border/50">
            <div className="rounded-[calc(2rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="px-7 pt-6 pb-5 border-b border-border/60 flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold tracking-tight">Active deals</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{coupons.length} deal{coupons.length !== 1 ? "s" : ""} available</p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {coupons.map((c) => (
                  <div key={c.id} className="px-5 py-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-sm">{c.title}</p>
                      {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {c.code && <><span className="font-mono font-semibold text-foreground">{c.code}</span> · </>}
                        Expires {new Date(c.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    {c.discount && <Badge className="shrink-0 rounded-full">{c.discount}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="p-[5px] rounded-[2rem] bg-foreground/[0.03] border border-border/50">
          <div className="rounded-[calc(2rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="px-7 pt-6 pb-5 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold tracking-tight">Community reviews</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {Number(business.avg_rating) > 0 && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < Math.round(Number(business.avg_rating)) ? "text-amber-400 fill-amber-400" : "text-border"}`}
                      strokeWidth={1}
                    />
                  ))}
                  <span className="text-sm font-semibold ml-1.5 tabular-nums">{Number(business.avg_rating).toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="px-7 py-6 space-y-5">
              {/* Write review */}
              {user ? (
                <form onSubmit={submitReview} className="space-y-4 p-5 rounded-2xl border border-border/50 bg-muted/20">
                  <p className="text-sm font-semibold">Leave a review</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Your rating</Label>
                    <StarRating value={rating} onChange={setRating} size={26} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comment" className="text-xs text-muted-foreground uppercase tracking-wide">Your experience</Label>
                    <Textarea
                      id="comment"
                      rows={3}
                      maxLength={1000}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your experience (10–1000 characters)"
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground text-right">{comment.length}/1000</p>
                  </div>
                  {business && <ReceiptVerifier businessId={business.id} onVerifiedChange={setVisitVerified} />}
                  <Button type="submit" disabled={posting || !rating} className="rounded-full gap-2">
                    {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {posting ? "Posting…" : visitVerified ? "Post verified review" : "Post review"}
                  </Button>
                </form>
              ) : (
                <div className="p-5 rounded-2xl border border-border/50 bg-muted/20 text-sm text-muted-foreground">
                  <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link> to write a review.
                </div>
              )}

              {/* Review list */}
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No reviews yet — be the first!</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="px-5 py-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{r.profiles?.display_name ?? "Member"}</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-border"}`}
                                strokeWidth={1}
                              />
                            ))}
                          </div>
                          {(r as { verified?: boolean }).verified && (
                            <Badge variant="secondary" className="gap-1 text-[10px] py-0 h-5 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 rounded-full">
                              <ShieldCheck className="h-3 w-3" /> Verified
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Review themes */}
        <ReviewThemes
          businessId={business.id}
          businessName={business.name}
          reviews={reviews.map((r) => ({ rating: r.rating, comment: r.comment }))}
        />

        {/* Google reviews */}
        <div className="p-[5px] rounded-[2rem] bg-foreground/[0.03] border border-border/50">
          <div className="rounded-[calc(2rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="px-7 pt-6 pb-5 border-b border-border/60 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-blue-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold tracking-tight">Google reviews</p>
                <p className="text-xs text-muted-foreground mt-0.5">What people say on Google</p>
              </div>
            </div>

            <div className="px-7 py-6">
              {!googleData ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">See what people are saying about this business on Google.</p>
                  <Button onClick={fetchGoogleReviews} disabled={loadingGoogle} variant="outline" className="rounded-full gap-2">
                    {loadingGoogle ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</> : "Show Google reviews"}
                  </Button>
                </div>
              ) : !googleData.found ? (
                <p className="text-sm text-muted-foreground">No matching Google listing was found.</p>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < Math.round(googleData.rating ?? 0) ? "text-amber-400 fill-amber-400" : "text-border"}`}
                            strokeWidth={1}
                          />
                        ))}
                      </div>
                      <span className="font-semibold tabular-nums">{googleData.rating?.toFixed(1) ?? "—"}</span>
                      <span className="text-muted-foreground">· {googleData.userRatingCount} Google review{googleData.userRatingCount === 1 ? "" : "s"}</span>
                    </div>
                    {googleData.googleMapsUri && (
                      <a
                        href={googleData.googleMapsUri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View on Maps <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {googleData.reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No reviews returned by Google.</p>
                  ) : (
                    <div className="space-y-3">
                      {googleData.reviews.map((r, i) => (
                        <div key={i} className="px-5 py-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              {r.authorPhoto && (
                                <img src={r.authorPhoto} alt={`${r.author} avatar`} className="h-5 w-5 rounded-full" loading="lazy" />
                              )}
                              {r.authorUri ? (
                                <a href={r.authorUri} target="_blank" rel="noreferrer" className="font-medium text-sm hover:underline">{r.author}</a>
                              ) : (
                                <span className="font-medium text-sm">{r.author}</span>
                              )}
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, j) => (
                                  <Star
                                    key={j}
                                    className={`h-3 w-3 ${j < r.rating ? "text-amber-400 fill-amber-400" : "text-border"}`}
                                    strokeWidth={1}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{r.relativeTime}</span>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{r.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">Powered by Google</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default BusinessDetail;
