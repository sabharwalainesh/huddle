import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
      {/* Outer shell */}
      <div className="p-[6px] rounded-[2rem] bg-primary/6 border border-primary/15 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)]">
        {/* Inner core */}
        <div className="rounded-[calc(2rem-6px)] bg-background overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="grid md:grid-cols-[280px_1fr]">
            {/* Image */}
            <div
              className="relative h-52 md:h-full bg-muted bg-cover bg-center overflow-hidden"
              style={biz.image_url ? { backgroundImage: `url(${biz.image_url})` } : undefined}
              aria-hidden
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent" />
              {!biz.image_url && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
              )}
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                <Award className="h-3.5 w-3.5" strokeWidth={1.5} />
                Business of the Week
              </div>
            </div>

            {/* Content */}
            <div className="p-7 md:p-9 flex flex-col gap-4 justify-center">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight leading-tight">{biz.name}</h2>
                <Badge
                  variant="secondary"
                  className="capitalize rounded-full text-[11px] px-2.5 py-0.5 font-medium"
                >
                  {biz.category}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <StarRating value={Number(biz.avg_rating)} size={15} />
                <span className="text-sm text-muted-foreground tabular-nums">
                  {Number(biz.avg_rating).toFixed(1)} · {biz.review_count} reviews
                </span>
              </div>
              {biz.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{biz.address}</span>
                </p>
              )}
              <p className="text-sm text-foreground/75 leading-relaxed line-clamp-2">
                {note ?? biz.description ?? "A local favorite worth checking out this week."}
              </p>
              <div>
                <Button
                  asChild
                  size="sm"
                  className="rounded-full pl-5 pr-2 gap-2.5 group transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                >
                  <Link to={`/business/${biz.id}`}>
                    Visit page
                    <span className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                      <ArrowRight className="h-3 w-3" strokeWidth={2} />
                    </span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
