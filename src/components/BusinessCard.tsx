import { Link } from "react-router-dom";
import { MapPin, Navigation, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { formatMiles } from "@/lib/geo";
import type { Business } from "@/lib/sorting";

interface BusinessCardProps {
  b: Business;
  distanceMi?: number | null;
  reason?: string | null;
}

export const BusinessCard = ({ b, distanceMi, reason }: BusinessCardProps) => (
  <Link to={`/business/${b.id}`} className="block group">
    {/* Outer shell */}
    <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] hover:-translate-y-0.5">
      {/* Inner core */}
      <div className="rounded-[calc(1.5rem-5px)] bg-background overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        {/* Image */}
        <div className="relative aspect-[16/10] bg-muted overflow-hidden">
          {b.image_url ? (
            <img
              src={b.image_url}
              alt={`${b.name} storefront`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-primary/40" strokeWidth={1.5} />
            </div>
          )}
          {/* Editorial badge — top-left overlay */}
          {b.editorial_tags && b.editorial_tags.length > 0 && (
            <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
              <Sparkles className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
              {b.editorial_tags[0]}
            </div>
          )}
          {distanceMi != null && (
            <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-sm border border-border/40 px-2.5 py-1 text-[11px] font-medium shadow-sm">
              <Navigation className="h-3 w-3 text-primary" strokeWidth={1.5} />
              {formatMiles(distanceMi)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold tracking-tight leading-tight">{b.name}</h3>
            <Badge
              variant="secondary"
              className="capitalize shrink-0 rounded-full text-[10px] px-2.5 py-0.5 font-medium"
            >
              {b.category}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <StarRating value={Number(b.avg_rating)} size={13} />
            <span className="text-muted-foreground text-xs tabular-nums">
              {Number(b.avg_rating).toFixed(1)} · {b.review_count} review{b.review_count === 1 ? "" : "s"}
            </span>
          </div>
          {b.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 line-clamp-1">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              {b.address}
            </p>
          )}
          {reason && (
            <p className="text-[11px] text-primary/90 flex items-start gap-1.5 leading-snug pt-1 border-t border-border/40 mt-1">
              <Sparkles className="h-3 w-3 shrink-0 mt-0.5" strokeWidth={1.5} />
              <span className="line-clamp-2">{reason}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  </Link>
);

