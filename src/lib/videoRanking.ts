import { distanceToBusinessMi } from "@/lib/geo";

export interface FeedVideo {
  id: string;
  user_id: string;
  business_id: string | null;
  video_url: string;
  thumbnail_url: string | null;
  caption: string;
  category: string | null;
  lat: number | null;
  lng: number | null;
  like_count: number;
  view_count: number;
  created_at: string;
  business?: { id: string; name: string; category: string | null } | null;
  author?: { display_name: string } | null;
}

interface RankInput {
  prefs: { categories: string[]; vibes: string[] };
  coords: { lat: number; lng: number } | null;
}

/**
 * Score videos for the For-You feed.
 * Higher = better. Combines:
 *  - category match against user prefs
 *  - geo proximity (closer = higher)
 *  - light recency boost (decays over ~14 days)
 *  - light popularity floor
 */
export function rankForYou(videos: FeedVideo[], { prefs, coords }: RankInput): FeedVideo[] {
  const prefSet = new Set(prefs.categories.map((c) => c.toLowerCase()));
  const now = Date.now();

  const scored = videos.map((v) => {
    let score = 0;

    if (v.category && prefSet.has(v.category.toLowerCase())) score += 5;
    if (v.business?.category && prefSet.has(v.business.category.toLowerCase())) score += 3;

    const dist = distanceToBusinessMi(coords, { lat: v.lat, lng: v.lng });
    if (dist != null) {
      if (dist < 1) score += 4;
      else if (dist < 5) score += 3;
      else if (dist < 15) score += 2;
      else if (dist < 50) score += 1;
    }

    const ageDays = (now - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 3 - ageDays / 5);

    score += Math.log10(1 + v.like_count) * 1.5;
    score += Math.log10(1 + v.view_count) * 0.5;

    return { v, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.v);
}
