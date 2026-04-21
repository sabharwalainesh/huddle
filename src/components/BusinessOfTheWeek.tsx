import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, MapPin, Star, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

interface FeatureRow {
  business_id: string;
  ends_at: string;
  note: string | null;
}

export const BusinessOfTheWeek = () => {
  const [biz, setBiz] = useState<Business | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const nowIso = new Date().toISOString();

      // 1. Try active admin pick
      const { data: featured } = await supabase
        .from("featured_businesses")
        .select("business_id, ends_at, note")
        .lte("starts_at", nowIso)
        .gt("ends_at", nowIso)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let chosenId: string | null = null;
      let chosenNote: string | null = null;

      if (featured) {
        chosenId = (featured as FeatureRow).business_id;
        chosenNote = (featured as FeatureRow).note;
      } else {
        // 2. Fallback: top trending pulse this week
        const { data: trending } = await supabase
          .from("trending_pulse")
          .select("business_id")
          .order("pulse_score", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (trending?.business_id) chosenId = trending.business_id;
      }

      if (!chosenId) {
        setBiz(null);
        setLoading(false);
        return;
      }

      const { data: b } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", chosenId)
        .eq("status", "approved")
        .maybeSingle();

      setBiz(b as Business | null);
      setNote(chosenNote);
      setLoading(false);
    })();
  }, []);

  if (loading || !biz) return null;

  return (
    <section aria-label="Local business of the week" className="container py-6">
      <Card className="overflow-hidden border-primary/40 shadow-card">
        <div className="grid md:grid-cols-[260px_1fr]">
          <div
            className="relative h-48 md:h-full bg-muted bg-cover bg-center"
            style={biz.image_url ? { backgroundImage: `url(${biz.image_url})` } : undefined}
            aria-hidden
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-transparent" />
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground gap-1 shadow-md">
              <Award className="h-3.5 w-3.5" /> Local Business of the Week
            </Badge>
          </div>
          <CardContent className="p-5 flex flex-col gap-3 justify-center">
            <div>
              <h2 className="text-2xl font-bold leading-tight">{biz.name}</h2>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{biz.category}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <StarRating value={Number(biz.avg_rating)} size={16} />
              <span className="text-muted-foreground">
                {Number(biz.avg_rating).toFixed(1)} · {biz.review_count} reviews
              </span>
            </div>
            {biz.address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{biz.address}</span>
              </p>
            )}
            <p className="text-sm line-clamp-2 text-foreground/80">
              {note ?? biz.description ?? "A local favorite worth checking out this week."}
            </p>
            <div>
              <Button asChild size="sm">
                <Link to={`/business/${biz.id}`}>Visit page <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </section>
  );
};
