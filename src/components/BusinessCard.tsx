import { Link } from "react-router-dom";
import { MapPin, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { formatMiles } from "@/lib/geo";
import type { Business } from "@/lib/sorting";

interface BusinessCardProps {
  b: Business;
  /** Optional distance from the user in miles. Shown as a subtle badge on the image. */
  distanceMi?: number | null;
}

export const BusinessCard = ({ b, distanceMi }: BusinessCardProps) => (
  <Link to={`/business/${b.id}`} className="block group">
    <Card className="overflow-hidden transition-all hover:shadow-elegant hover:-translate-y-0.5 shadow-card">
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {b.image_url ? (
          <img
            src={b.image_url}
            alt={`${b.name} storefront`}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary opacity-80" />
        )}
        {distanceMi != null && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 gap-1 bg-background/90 backdrop-blur-sm shadow-sm text-[11px] py-0.5"
          >
            <Navigation className="h-3 w-3" />
            {formatMiles(distanceMi)}
          </Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{b.name}</h3>
          <Badge variant="secondary" className="capitalize shrink-0">{b.category}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <StarRating value={Number(b.avg_rating)} size={14} />
          <span className="text-muted-foreground">
            {Number(b.avg_rating).toFixed(1)} · {b.review_count} review{b.review_count === 1 ? "" : "s"}
          </span>
        </div>
        {b.address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1">
            <MapPin className="h-3 w-3" /> {b.address}
          </p>
        )}
      </CardContent>
    </Card>
  </Link>
);
