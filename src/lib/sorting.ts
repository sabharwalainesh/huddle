// Sample code from sorting.ts
// Modular sorting logic for the Business Directory Engine.
import type { Tables } from "@/integrations/supabase/types";

export type Business = Tables<"businesses">;
export type SortKey = "rating" | "reviews" | "name" | "newest";

export const sortBusinesses = (list: Business[], key: SortKey): Business[] => {
  const arr = [...list];
  switch (key) {
    case "rating":
      return arr.sort((a, b) => Number(b.avg_rating) - Number(a.avg_rating));
    case "reviews":
      return arr.sort((a, b) => b.review_count - a.review_count);
    case "name":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
      return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
};

export interface SmartFilters {
  query: string;
  category: string; // "all" or a category
  minRating: number; // 0..5
  openNow: boolean;
}

const isOpenNow = (hours: unknown): boolean => {
  if (!hours || typeof hours !== "object") return false;
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const now = new Date();
  const today = days[now.getDay()];
  const entry = (hours as Record<string, { open?: string; close?: string }>)[today];
  if (!entry?.open || !entry?.close) return false;
  const [oh, om] = entry.open.split(":").map(Number);
  const [ch, cm] = entry.close.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= oh * 60 + om && cur <= ch * 60 + cm;
};

export const filterBusinesses = (list: Business[], f: SmartFilters): Business[] => {
  const q = f.query.trim().toLowerCase();
  return list.filter((b) => {
    if (f.category !== "all" && b.category !== f.category) return false;
    if (Number(b.avg_rating) < f.minRating) return false;
    if (f.openNow && !isOpenNow(b.hours)) return false;
    if (q) {
      const hay = `${b.name} ${b.description} ${b.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
};
