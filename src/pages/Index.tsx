import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { BusinessCard } from "@/components/BusinessCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { type Business, type SortKey, filterBusinesses, sortBusinesses } from "@/lib/sorting";

const CATEGORIES = ["all", "food", "retail", "services", "health", "entertainment", "other"];

const Index = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [openNow, setOpenNow] = useState(false);
  const [sort, setSort] = useState<SortKey>("rating");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("businesses").select("*").limit(500);
      if (error) {
        toast({ title: "Couldn't load businesses", description: error.message, variant: "destructive" });
      } else {
        setBusinesses(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const visible = useMemo(
    () => sortBusinesses(filterBusinesses(businesses, { query, category, minRating, openNow }), sort),
    [businesses, query, category, minRating, openNow, sort],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container py-12 md:py-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-3">Discover your local huddle.</h1>
          <p className="text-base md:text-lg opacity-90 max-w-xl mx-auto">
            Find trusted spots, real reviews, and community deals in your neighborhood.
          </p>
        </div>
      </section>

      <main className="container py-8 space-y-6">
        <Card className="p-4 shadow-card">
          <div className="grid gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-5 space-y-1.5">
              <Label htmlFor="search" className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  className="pl-9"
                  placeholder="Coffee, plumber, bookstore..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs">Min rating</Label>
              <Select value={String(minRating)} onValueChange={(v) => setMinRating(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 3, 3.5, 4, 4.5].map((r) => (
                    <SelectItem key={r} value={String(r)}>{r === 0 ? "Any" : `${r}+`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><SlidersHorizontal className="h-3 w-3" />Sort by</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest rated</SelectItem>
                  <SelectItem value="reviews">Most reviewed</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex items-center gap-2 md:justify-end pb-1">
              <Switch id="open" checked={openNow} onCheckedChange={setOpenNow} />
              <Label htmlFor="open" className="text-xs cursor-pointer">Open now</Label>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${visible.length} business${visible.length === 1 ? "" : "es"}`}
          </p>
          {(query || category !== "all" || minRating > 0 || openNow) && (
            <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setCategory("all"); setMinRating(0); setOpenNow(false); }}>
              Clear filters
            </Button>
          )}
        </div>

        {!loading && visible.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <p className="font-medium mb-1">No businesses match your filters.</p>
            <p className="text-sm">Try clearing filters or add the first one to your community.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((b) => <BusinessCard key={b.id} b={b} />)}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
