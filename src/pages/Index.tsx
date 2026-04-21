import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { BusinessCard } from "@/components/BusinessCard";
import { PulseWidget } from "@/components/PulseWidget";
import { AttentionMap } from "@/components/AttentionMap";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useT } from "@/contexts/A11yContext";
import { type Business, type SortKey, filterBusinesses, sortBusinesses } from "@/lib/sorting";
import type { TranslationKey } from "@/lib/i18n";

const CATEGORIES = ["all", "food", "retail", "services", "health", "entertainment", "other"] as const;

const Index = () => {
  const t = useT();
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
        toast({ title: t("home.couldntLoad"), description: error.message, variant: "destructive" });
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
          <h1 className="text-3xl md:text-5xl font-bold mb-3">{t("home.heroTitle")}</h1>
          <p className="text-base md:text-lg opacity-90 max-w-xl mx-auto">
            {t("home.heroSubtitle")}
          </p>
        </div>
      </section>

      <main id="main">
        <AttentionMap />

        <div className="container py-8 space-y-6">
        <Card className="p-4 shadow-card">
          <div className="grid gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-5 space-y-1.5">
              <Label htmlFor="search" className="text-xs">{t("home.search")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  className="pl-9"
                  placeholder={t("home.searchPlaceholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs">{t("home.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{t(`cat.${c}` as TranslationKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs">{t("home.minRating")}</Label>
              <Select value={String(minRating)} onValueChange={(v) => setMinRating(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 3, 3.5, 4, 4.5].map((r) => (
                    <SelectItem key={r} value={String(r)}>{r === 0 ? t("home.any") : `${r}+`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><SlidersHorizontal className="h-3 w-3" />{t("home.sortBy")}</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">{t("home.highestRated")}</SelectItem>
                  <SelectItem value="reviews">{t("home.mostReviewed")}</SelectItem>
                  <SelectItem value="newest">{t("home.newest")}</SelectItem>
                  <SelectItem value="name">{t("home.nameAZ")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex items-center gap-2 md:justify-end pb-1">
              <Switch id="open" checked={openNow} onCheckedChange={setOpenNow} />
              <Label htmlFor="open" className="text-xs cursor-pointer">{t("home.openNow")}</Label>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? t("home.loading") : `${visible.length} ${visible.length === 1 ? t("home.businessCount") : t("home.businessCountPlural")}`}
          </p>
          {(query || category !== "all" || minRating > 0 || openNow) && (
            <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setCategory("all"); setMinRating(0); setOpenNow(false); }}>
              {t("home.clearFilters")}
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="space-y-5">
            {!loading && visible.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <p className="font-medium mb-1">{t("home.noResults")}</p>
                <p className="text-sm">{t("home.noResultsHint")}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {visible.map((b) => <BusinessCard key={b.id} b={b} />)}
              </div>
            )}
          </div>
          <aside className="lg:sticky lg:top-20">
            <PulseWidget />
          </aside>
        </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
