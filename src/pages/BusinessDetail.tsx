import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Bookmark, BookmarkCheck, Globe, MapPin, Phone, Tag, ArrowLeft, MapPinned, ShieldCheck, Star, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/StarRating";
import { ReceiptVerifier } from "@/components/ReceiptVerifier";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;
type Review = Tables<"reviews"> & { profiles?: { display_name: string } | null };
type Coupon = Tables<"coupons">;

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10, "Please write at least 10 characters").max(1000),
});

const BusinessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [visitVerified, setVisitVerified] = useState(false);
  const [posting, setPosting] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

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
  const [googleData, setGoogleData] = useState<GoogleData | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const fetchGoogleReviews = async () => {
    if (!business) return;
    setLoadingGoogle(true);
    const { data, error } = await supabase.functions.invoke("google-place-reviews", {
      body: { business_id: business.id, name: business.name, address: business.address },
    });
    setLoadingGoogle(false);
    if (error) {
      return toast({ title: "Couldn't load Google reviews", description: error.message, variant: "destructive" });
    }
    if (data?.error) {
      return toast({ title: "Couldn't load Google reviews", description: String(data.error), variant: "destructive" });
    }
    setGoogleData(data as GoogleData);
    if (!data?.found) {
      toast({ title: "No Google match found for this business" });
    }
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
    setBusiness(bRes.data);
    const reviewRows = (rRes.data ?? []) as Review[];
    // Hydrate display names
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
    } else {
      setBookmarked(false);
    }
    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => { load(); }, [load]);

  // Log a page view exactly once per business per page load (sessionStorage dedupe)
  useEffect(() => {
    if (!id) return;
    const key = `huddle:view:${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase
      .from("business_views")
      .insert({ business_id: id, viewer_id: user?.id ?? null })
      .then(() => { /* fire-and-forget */ });
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
        <main id="main" className="container py-8"><p className="text-muted-foreground">Loading...</p></main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main" className="container py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Back</Button>

        <Card className="overflow-hidden">
          {business.image_url && (
            <div className="aspect-[21/9] bg-muted">
              <img src={business.image_url} alt={`${business.name} cover`} className="w-full h-full object-cover" />
            </div>
          )}
          <CardContent className="p-6 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="capitalize">{business.category}</Badge>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">{business.name}</h1>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <StarRating value={Number(business.avg_rating)} size={16} />
                  <span className="text-muted-foreground">
                    {Number(business.avg_rating).toFixed(1)} · {business.review_count} review{business.review_count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <Button onClick={toggleBookmark} variant={bookmarked ? "default" : "outline"}>
                {bookmarked ? <><BookmarkCheck className="h-4 w-4" /> Saved</> : <><Bookmark className="h-4 w-4" /> Save</>}
              </Button>
            </div>
            {business.description && <p className="text-sm text-muted-foreground">{business.description}</p>}
            <div className="grid sm:grid-cols-2 gap-2 text-sm pt-2">
              {business.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {business.address}</p>}
              {business.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {business.phone}</p>}
              {business.website && (
                <a href={business.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={checkIn} disabled={checkingIn}>
                <MapPinned className="h-4 w-4" /> {checkingIn ? "Checking in..." : "I'm here — check in"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {coupons.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /> Active deals</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {coupons.map((c) => (
                <div key={c.id} className="rounded-lg border p-3 bg-gradient-to-r from-primary/5 to-accent/5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                    </div>
                    {c.discount && <Badge className="shrink-0">{c.discount}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {c.code && <>Code: <span className="font-mono font-semibold">{c.code}</span> · </>}
                    Expires {new Date(c.expires_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">Reviews</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {user ? (
              <form onSubmit={submitReview} className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <div className="space-y-1.5">
                  <Label>Your rating</Label>
                  <StarRating value={rating} onChange={setRating} size={26} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comment">Your review</Label>
                  <Textarea
                    id="comment"
                    rows={3}
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience (10–1000 characters)"
                  />
                  <p className="text-xs text-muted-foreground text-right">{comment.length}/1000</p>
                </div>
                {business && <ReceiptVerifier businessId={business.id} onVerifiedChange={setVisitVerified} />}
                <Button type="submit" disabled={posting || !rating}>
                  {posting ? "Posting..." : visitVerified ? "Post verified review" : "Post review"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to write a review.
              </p>
            )}

            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
            ) : (
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm">{r.profiles?.display_name ?? "Member"}</span>
                      <StarRating value={r.rating} size={12} />
                      {(r as { verified?: boolean }).verified && (
                        <Badge variant="secondary" className="gap-1 text-[10px] py-0 h-5 bg-success/15 text-success border-success/30">
                          <ShieldCheck className="h-3 w-3" /> Verified Visit
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">· {new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm">{r.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" /> Google reviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!googleData ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  See what people are saying about this business on Google.
                </p>
                <Button onClick={fetchGoogleReviews} disabled={loadingGoogle} variant="outline">
                  {loadingGoogle ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</> : "Show Google reviews"}
                </Button>
              </div>
            ) : !googleData.found ? (
              <p className="text-sm text-muted-foreground">No matching Google listing was found.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <StarRating value={googleData.rating ?? 0} size={16} />
                    <span className="text-muted-foreground">
                      {googleData.rating?.toFixed(1) ?? "—"} · {googleData.userRatingCount} Google review{googleData.userRatingCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  {googleData.googleMapsUri && (
                    <a
                      href={googleData.googleMapsUri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View on Google Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {googleData.reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reviews returned by Google.</p>
                ) : (
                  <ul className="space-y-4">
                    {googleData.reviews.map((r, i) => (
                      <li key={i} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {r.authorPhoto && (
                            <img src={r.authorPhoto} alt={`${r.author} avatar`} className="h-5 w-5 rounded-full" loading="lazy" />
                          )}
                          {r.authorUri ? (
                            <a href={r.authorUri} target="_blank" rel="noreferrer" className="font-medium text-sm hover:underline">
                              {r.author}
                            </a>
                          ) : (
                            <span className="font-medium text-sm">{r.author}</span>
                          )}
                          <StarRating value={r.rating} size={12} />
                          <span className="text-xs text-muted-foreground">· {r.relativeTime}</span>
                        </div>
                        <p className="text-sm whitespace-pre-line">{r.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground pt-2 border-t">Powered by Google</p>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default BusinessDetail;
