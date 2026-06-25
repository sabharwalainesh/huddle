import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Globe, ExternalLink, Loader2, Plus, Clock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { toast } from "@/hooks/use-toast";

interface GoogleReview {
  author: string;
  authorUri: string | null;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
}

interface GooglePlaceDetails {
  found: boolean;
  place_id: string;
  name: string | null;
  formatted_address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  userRatingCount: number;
  googleMapsUri: string | null;
  websiteUri: string | null;
  phone: string | null;
  primaryType: string | null;
  types: string[];
  photos: string[];
  description: string | null;
  opening_hours: string[] | null;
  price_level: string | null;
  reviews: GoogleReview[];
}

const GooglePlaceDetail = () => {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [details, setDetails] = useState<GooglePlaceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!placeId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("google-place-reviews", {
          body: { place_id: placeId },
        });
        if (fnError) throw fnError;
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
        if (!cancelled) setDetails(data as GooglePlaceDetails);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [placeId]);

  const handleImport = async () => {
    if (!details) return;
    if (!user) {
      toast({ title: "Sign in required", description: "Sign in to add this business to Huddle." });
      navigate("/auth");
      return;
    }
    setImporting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("google-place-import", {
        body: {
          place_id: details.place_id,
          name: details.name,
          address: details.formatted_address,
          lat: details.lat,
          lng: details.lng,
          phone: details.phone,
          websiteUri: details.websiteUri,
          primaryType: details.primaryType,
          photoUrl: details.photos[0] ?? null,
          rating: details.rating,
          userRatingCount: details.userRatingCount,
        },
      });
      if (fnError) throw fnError;
      const id = (data as { id?: string })?.id;
      if (!id) throw new Error("No id returned");
      toast({
        title: (data as { existed?: boolean })?.existed ? "Already on Huddle" : "Added to Huddle",
        description: details.name ?? "",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">

        <main id="main" className="container py-10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading place details…
          </div>
        </main>
      </div>
    );
  }

  if (error || !details || !details.found) {
    return (
      <div className="min-h-screen bg-background">

        <main id="main" className="container py-10 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Card className="p-8 text-center text-muted-foreground">
            <p className="font-medium mb-1">Place not found</p>
            <p className="text-sm">{error ?? "We couldn't load this Google listing."}</p>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const heroPhoto = details.photos[activePhoto] ?? details.photos[0] ?? null;

  return (
    <div className="min-h-screen bg-background">

      <main id="main" className="container py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <Card className="overflow-hidden">
          {heroPhoto ? (
            <div className="aspect-[21/9] bg-muted">
              <img
                src={heroPhoto}
                alt={`${details.name ?? "Place"} on Google`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[21/9] bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
          {details.photos.length > 1 && (
            <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
              {details.photos.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActivePhoto(i)}
                  className={`shrink-0 h-14 w-20 rounded-md overflow-hidden border-2 transition-all ${
                    i === activePhoto ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`Show photo ${i + 1}`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <CardContent className="p-6 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">Google</Badge>
                  {details.primaryType && (
                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {details.primaryType.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {details.price_level && (
                    <Badge variant="secondary" className="text-[10px]">
                      {details.price_level.replace("PRICE_LEVEL_", "").toLowerCase()}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">{details.name}</h1>
                {details.rating != null && (
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    <StarRating value={Number(details.rating)} size={16} />
                    <span className="text-muted-foreground">
                      {Number(details.rating).toFixed(1)} · {details.userRatingCount} on Google
                    </span>
                  </div>
                )}
              </div>
              <Button onClick={handleImport} disabled={importing} className="gap-1">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add to Huddle
              </Button>
            </div>
            {details.description && (
              <p className="text-sm text-muted-foreground">{details.description}</p>
            )}
            <div className="grid sm:grid-cols-2 gap-2 text-sm pt-2">
              {details.formatted_address && (
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {details.formatted_address}</p>
              )}
              {details.phone && (
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {details.phone}</p>
              )}
              {details.websiteUri && (
                <a href={details.websiteUri} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
              {details.googleMapsUri && (
                <a href={details.googleMapsUri} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" /> View on Google Maps
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {details.opening_hours && details.opening_hours.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                {details.opening_hours.map((line, i) => (
                  <li key={i} className="text-foreground/80">{line}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" /> Google reviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {details.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews returned by Google.</p>
            ) : (
              <ul className="space-y-4">
                {details.reviews.map((r, i) => (
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
                    {r.text && <p className="text-sm whitespace-pre-line">{r.text}</p>}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Want to leave a Huddle review?{" "}
              <button onClick={handleImport} className="text-primary hover:underline">
                Add this business to Huddle
              </button>{" "}
              first.
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          This page shows public data from Google Places.{" "}
          <Link to="/discover" className="text-primary hover:underline">Back to discover</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default GooglePlaceDetail;
