import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, ExternalLink, Loader2, Plus, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type GooglePlace = {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  userRatingCount: number;
  primaryType: string | null;
  googleMapsUri: string | null;
  websiteUri: string | null;
  phone: string | null;
  photoUrl: string | null;
  description?: string | null;
};

type GoogleReview = {
  author: string;
  authorUri: string | null;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
};

export const GooglePlaceCard = ({ p }: { p: GooglePlace }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviews, setReviews] = useState<GoogleReview[] | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const handleImport = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Sign in to add this business to Huddle." });
      navigate("/auth");
      return;
    }
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-place-import", {
        body: {
          place_id: p.place_id,
          name: p.name,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          phone: p.phone,
          websiteUri: p.websiteUri,
          primaryType: p.primaryType,
          photoUrl: p.photoUrl,
          rating: p.rating,
          userRatingCount: p.userRatingCount,
        },
      });
      if (error) throw error;
      const id = (data as { id?: string })?.id;
      if (!id) throw new Error("No id returned");
      toast({
        title: (data as { existed?: boolean })?.existed ? "Already on Huddle" : "Added to Huddle",
        description: p.name,
      });
      navigate(`/business/${id}`);
    } catch (e) {
      toast({
        title: "Couldn't add business",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const toggleReviews = async () => {
    const next = !reviewsOpen;
    setReviewsOpen(next);
    if (next && reviews === null) {
      setReviewsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("google-place-reviews", {
          body: { place_id: p.place_id },
        });
        if (error) throw error;
        setReviews(((data as { reviews?: GoogleReview[] })?.reviews ?? []));
      } catch (e) {
        toast({
          title: "Couldn't load reviews",
          description: (e as Error).message,
          variant: "destructive",
        });
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    }
  };

  const detailHref = `/google/${encodeURIComponent(p.place_id)}`;

  return (
    <Card className="overflow-hidden shadow-card flex flex-col group transition-all duration-300 hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5">
      <Link to={detailHref} className="block" aria-label={`View details for ${p.name}`}>
        <div className="aspect-[16/10] bg-muted overflow-hidden">
          {p.photoUrl ? (
            <img
              src={p.photoUrl}
              alt={`${p.name} on Google`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary opacity-60" />
          )}
        </div>
      </Link>
      <CardContent className="p-4 space-y-2 flex-1 flex flex-col">
        <Link to={detailHref} className="space-y-2 block hover:text-foreground">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">{p.name}</h3>
            <Badge variant="outline" className="shrink-0 text-[10px]">Google</Badge>
          </div>
          {p.rating != null && (
            <div className="flex items-center gap-2 text-sm">
              <StarRating value={Number(p.rating)} size={14} />
              <span className="text-muted-foreground">
                {Number(p.rating).toFixed(1)} · {p.userRatingCount} on Google
              </span>
            </div>
          )}
          {p.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-2">
              <MapPin className="h-3 w-3 shrink-0" /> {p.address}
            </p>
          )}
        </Link>
        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" onClick={handleImport} disabled={importing} className="flex-1">
            {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Add to Huddle
          </Button>
          {p.googleMapsUri && (
            <Button size="sm" variant="outline" asChild>
              <a href={p.googleMapsUri} target="_blank" rel="noopener noreferrer" aria-label="Open on Google Maps">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={toggleReviews}
          className="justify-between mt-1"
          aria-expanded={reviewsOpen}
        >
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" />
            {reviewsOpen ? "Hide Google reviews" : "Read Google reviews"}
          </span>
          {reviewsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>

        {reviewsOpen && (
          <div className="mt-2 space-y-3 border-t pt-3">
            {reviewsLoading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : reviews && reviews.length > 0 ? (
              <>
                {reviews.map((r, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      {r.authorPhoto ? (
                        <img src={r.authorPhoto} alt="" className="h-6 w-6 rounded-full" loading="lazy" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{r.author}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <StarRating value={Number(r.rating)} size={10} />
                          <span>{r.relativeTime}</span>
                        </div>
                      </div>
                    </div>
                    {r.text && <p className="text-xs text-foreground/80 whitespace-pre-line">{r.text}</p>}
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground pt-1">Reviews powered by Google</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No Google reviews available.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
