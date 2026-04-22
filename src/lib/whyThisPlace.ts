// Generate a one-line explanation for why a business matches the user's preferences.
// Lightweight client-side template — instant and free.

import type { UserPreferences } from "./preferences";
import type { Business } from "./sorting";

interface Context {
  prefs: UserPreferences;
  trendingIds?: Set<string>;
  distanceMi?: number | null;
}

export function whyThisPlace(b: Business, ctx: Context): string | null {
  const reasons: string[] = [];

  // Matched vibes
  if (ctx.prefs.vibes.length > 0 && b.tags?.length) {
    const lowerTags = b.tags.map((t) => t.toLowerCase());
    const matched = ctx.prefs.vibes.filter((v) => lowerTags.includes(v.toLowerCase()));
    if (matched.length === 1) reasons.push(`matches your '${matched[0]}' vibe`);
    else if (matched.length === 2) reasons.push(`matches your '${matched[0]}' & '${matched[1]}' vibes`);
    else if (matched.length >= 3) reasons.push(`matches ${matched.length} of your vibes`);
  }

  // Matched category
  if (ctx.prefs.categories.includes(b.category) && reasons.length === 0) {
    reasons.push(`fits your ${b.category} preference`);
  }

  // Highly rated
  const rating = Number(b.avg_rating);
  if (rating >= 4.5 && b.review_count >= 5) {
    reasons.push(`${rating.toFixed(1)}★ from ${b.review_count} reviews`);
  } else if (rating >= 4.0 && b.review_count >= 10) {
    reasons.push(`well-loved — ${rating.toFixed(1)}★ avg`);
  }

  // Trending
  if (ctx.trendingIds?.has(b.id)) {
    reasons.push("trending this week");
  }

  // Nearby
  if (ctx.distanceMi != null && ctx.distanceMi <= 1) {
    reasons.push(`less than a mile away`);
  } else if (ctx.distanceMi != null && ctx.distanceMi <= 2) {
    reasons.push(`only ${ctx.distanceMi.toFixed(1)} mi away`);
  }

  // Newly added to the platform
  if (b.submitted_at) {
    const daysSince = (Date.now() - new Date(b.submitted_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 45 && reasons.length === 0) {
      reasons.push("newly added to Huddle");
    }
  }

  if (reasons.length === 0) return null;
  const sentence = reasons.slice(0, 2).join(", and ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}
