import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import type { Business } from "@/lib/sorting";

export const BusinessCard = ({ b }: { b: Business }) => (
  <Link to={`/business/${b.id}`} className="block group">
    <Card className="overflow-hidden transition-all hover:shadow-elegant hover:-translate-y-0.5 shadow-card">
      <div className="aspect-[16/10] bg-muted overflow-hidden">
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
