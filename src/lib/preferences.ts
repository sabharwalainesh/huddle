// Shared options + helpers for user preferences.
// Categories must match values used on businesses.category.
// Vibes are free-form tags compared against businesses.tags (case-insensitive).

import type { Tables } from "@/integrations/supabase/types";

export type Business = Tables<"businesses">;

export const PREF_CATEGORIES = [
  { value: "food", label: "Food & drink", emoji: "🍽️" },
  { value: "retail", label: "Shops & retail", emoji: "🛍️" },
  { value: "services", label: "Local services", emoji: "🔧" },
  { value: "health", label: "Health & wellness", emoji: "💪" },
  { value: "entertainment", label: "Entertainment", emoji: "🎭" },
  { value: "other", label: "Everything else", emoji: "✨" },
] as const;

export const PREF_VIBES = [
  "cozy",
  "family-friendly",
  "late-night",
  "vegan",
  "vegetarian",
  "outdoor seating",
  "live music",
  "pet-friendly",
  "quiet",
  "trendy",
  "budget",
  "upscale",
  "quick bite",
  "date night",
  "kid-friendly",
  "study spot",
] as const;

export type UserPreferences = {
  categories: string[];
  vibes: string[];
};

export const EMPTY_PREFS: UserPreferences = { categories: [], vibes: [] };

export const hasAnyPrefs = (p: UserPreferences | null | undefined) =>
  !!p && (p.categories.length > 0 || p.vibes.length > 0);

// Score a business against a user's preferences.
// Higher score = better match. 0 = no match at all.
export function scoreBusiness(b: Pick<Business, "category" | "tags">, prefs: UserPreferences): number {
  let score = 0;
  if (prefs.categories.includes(b.category)) score += 3;
  if (prefs.vibes.length > 0 && b.tags?.length) {
    const lowerTags = b.tags.map((t) => t.toLowerCase());
    for (const v of prefs.vibes) {
      if (lowerTags.includes(v.toLowerCase())) score += 1;
    }
  }
  return score;
}

// "Filter then fill": split into matches (sorted by score desc) and rest.
export function partitionByPrefs<T extends Pick<Business, "category" | "tags">>(
  items: T[],
  prefs: UserPreferences,
): { matches: T[]; rest: T[] } {
  if (!hasAnyPrefs(prefs)) return { matches: [], rest: items };
  const scored = items.map((it) => ({ it, score: scoreBusiness(it, prefs) }));
  const matches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.it);
  const matchSet = new Set(matches);
  const rest = items.filter((i) => !matchSet.has(i));
  return { matches, rest };
}

// For Google places we don't have tags, only a primaryType. Map it to our category.
export function mapGoogleTypeToCategory(primaryType?: string | null): string {
  if (!primaryType) return "other";
  const t = primaryType.toLowerCase();
  if (/(restaurant|cafe|bakery|bar|coffee|food|pizza|brunch|breakfast|dessert|ice_cream|sandwich|pub|brewery|winery|tea|juice|donut|bagel)/.test(t)) return "food";
  if (/(store|shop|boutique|grocery|supermarket|florist|jewelry|book|gift|clothing|furniture|hardware|pet|toy|liquor|thrift)/.test(t)) return "retail";
  if (/(salon|barber|beauty|nail|spa|massage|tailor|laundry|dry_cleaner|repair|locksmith|car_wash|grooming|veterinary)/.test(t)) return "services";
  if (/(gym|yoga|fitness)/.test(t)) return "health";
  if (/(gallery|studio|venue|bowling)/.test(t)) return "entertainment";
  return "other";
}

export function partitionGoogleByPrefs<T extends { primaryType?: string | null }>(
  places: T[],
  prefs: UserPreferences,
): { matches: T[]; rest: T[] } {
  if (!hasAnyPrefs(prefs) || prefs.categories.length === 0) {
    return { matches: [], rest: places };
  }
  const matches: T[] = [];
  const rest: T[] = [];
  for (const p of places) {
    const cat = mapGoogleTypeToCategory(p.primaryType);
    if (prefs.categories.includes(cat)) matches.push(p);
    else rest.push(p);
  }
  return { matches, rest };
}
