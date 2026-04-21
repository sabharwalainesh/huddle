import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
};

export const GooglePlaceCard = ({ p }: { p: GooglePlace }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);

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

  return (
    <Card className="overflow-hidden shadow-card flex flex-col">
      <div className="aspect-[16/10] bg-muted overflow-hidden">
        {p.photoUrl ? (
          <img src={p.photoUrl} alt={`${p.name} on Google`} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-primary opacity-60" />
        )}
      </div>
      <CardContent className="p-4 space-y-2 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{p.name}</h3>
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
        <div className="flex items-center gap-2 pt-2 mt-auto">
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
      </CardContent>
    </Card>
  );
};
