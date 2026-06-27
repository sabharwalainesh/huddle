import { useEffect, useMemo, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { Search, SlidersHorizontal, Loader2, MapPin, Sparkles, Navigation, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BusinessCard } from "@/components/BusinessCard";
import { GooglePlaceCard, type GooglePlace } from "@/components/GooglePlaceCard";
import { BusinessOfTheWeek } from "@/components/BusinessOfTheWeek";
import { Footer } from "@/components/Footer";
import { PreferencesBanner } from "@/components/PreferencesBanner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/hooks/use-toast";
import { useT } from "@/contexts/A11yContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { partitionByPrefs, partitionGoogleByPrefs, hasAnyPrefs } from "@/lib/preferences";
import { type Business, type SortKey, filterBusinesses, sortBusinesses } from "@/lib/sorting";
import { distanceToBusinessMi } from "@/lib/geo";
import { whyThisPlace } from "@/lib/whyThisPlace";
import type { TranslationKey } from "@/lib/i18n";

const CATEGORIES = ["all", "food", "retail", "services", "health", "entertainment", "other"] as const;
const GOOGLE_MAX_RESULTS = 20;
const HUDDLE_PAGE_SIZE = 10;

function HuddlePagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        disabled={page === 1}
        onClick={() => { onPage(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {getPageNumbers().map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-sm text-muted-foreground">…</span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            className="h-8 w-8 p-0 text-xs"
            onClick={() => { onPage(p as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        disabled={page === totalPages}
        onClick={() => { onPage(page + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

const Discover = () => {
  const t = useT();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [openNow, setOpenNow] = useState(false);
  const [sort, setSort] = useState<SortKey>("rating");
  const [source, setSource] = useState<"huddle" | "google">("huddle");

  // Google nearby/search state
  const [googlePlaces, setGooglePlaces] = useState<GooglePlace[]>([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);

  // Huddle "near me" filter
  const [nearMe, setNearMe] = useState(true);
  const [radiusMi, setRadiusMi] = useState(10);

  const [trendingIds, setTrendingIds] = useState<Set<string>>(new Set());
  const [huddlePage, setHuddlePage] = useState(1);

  useEffect(() => {
    (async () => {
      const [bRes, tRes] = await Promise.all([
        supabase.from("businesses").select("*").limit(500),
        supabase.from("trending_pulse").select("business_id").limit(20),
      ]);
      if (bRes.error) {
        toast({ title: t("home.couldntLoad"), description: bRes.error.message, variant: "destructive" });
      } else {
        setBusinesses(bRes.data ?? []);
      }
      if (tRes.data) {
        setTrendingIds(new Set(tRes.data.map((r) => r.business_id).filter((x): x is string => !!x)));
      }
      setLoading(false);
    })();
  }, []);

  // Request geolocation when needed: switching to Google source OR enabling "near me" on Huddle
  useEffect(() => {
    const needsLocation = source === "google" || (source === "huddle" && nearMe);
    if (!needsLocation || coords || geoDenied) return;
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoDenied(true),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }, [source, nearMe, coords, geoDenied]);

  // Fetch Google places when in google source: on query change (debounced) or coords arrival
  useEffect(() => {
    if (source !== "google") return;
    const trimmed = query.trim();
    if (!trimmed && !coords) return;

    const handle = setTimeout(async () => {
      setGoogleLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("google-place-search", {
          body: {
            query: trimmed || null,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            maxResults: GOOGLE_MAX_RESULTS,
          },
        });
        if (error) throw error;
        const all = (data as { places?: GooglePlace[] })?.places ?? [];
        setGooglePlaces(all);
      } catch (e) {
        toast({ title: "Google search failed", description: (e as Error).message, variant: "destructive" });
        setGooglePlaces([]);
      } finally {
        setGoogleLoading(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [source, query, coords]);

  // Reset to page 1 whenever filters, sort, source, or location radius changes
  useEffect(() => {
    setHuddlePage(1);
  }, [query, category, minRating, openNow, sort, source, nearMe, radiusMi, coords]);

  const { prefs } = useUserPreferences();
  const personalize = hasAnyPrefs(prefs);

  const visible = useMemo(
    () => sortBusinesses(filterBusinesses(businesses, { query, category, minRating, openNow }), sort),
    [businesses, query, category, minRating, openNow, sort],
  );

  // Distance-aware partitioning of Huddle results. When "near me" is on and we have
  // coords, split into in-range vs. out-of-range so the UI can offer a Google fallback.
  const huddleByRange = useMemo(() => {
    if (source !== "huddle" || !nearMe || !coords) {
      return { inRange: visible, outOfRange: [] as Business[], unknownLocation: [] as Business[] };
    }
    const inRange: Business[] = [];
    const outOfRange: Business[] = [];
    const unknownLocation: Business[] = [];
    for (const b of visible) {
      const d = distanceToBusinessMi(coords, b);
      if (d == null) unknownLocation.push(b);
      else if (d <= radiusMi) inRange.push(b);
      else outOfRange.push(b);
    }
    return { inRange, outOfRange, unknownLocation };
  }, [visible, source, nearMe, coords, radiusMi]);

  const huddleVisible = useMemo(
    () => (nearMe && coords ? huddleByRange.inRange : visible),
    [nearMe, coords, huddleByRange.inRange, visible],
  );

  // "Filter then fill": when a user has prefs and isn't actively filtering by category,
  // surface matches first then the remaining list below a divider.
  const huddleSplit = useMemo(() => {
    if (!personalize || category !== "all") return { matches: [] as Business[], rest: huddleVisible };
    return partitionByPrefs(huddleVisible, prefs);
  }, [huddleVisible, prefs, personalize, category]);

  const googleSplit = useMemo(() => {
    if (!personalize) return { matches: [] as GooglePlace[], rest: googlePlaces };
    return partitionGoogleByPrefs(googlePlaces, prefs);
  }, [googlePlaces, prefs, personalize]);

  // Pagination for Huddle source
  const huddleTotalPages = Math.max(1, Math.ceil(huddleVisible.length / HUDDLE_PAGE_SIZE));
  const pagedHuddleVisible = useMemo(() => {
    const start = (huddlePage - 1) * HUDDLE_PAGE_SIZE;
    return huddleVisible.slice(start, start + HUDDLE_PAGE_SIZE);
  }, [huddleVisible, huddlePage]);

  const pagedHuddleSplit = useMemo(() => {
    if (!personalize || category !== "all") return { matches: [] as Business[], rest: pagedHuddleVisible };
    return partitionByPrefs(pagedHuddleVisible, prefs);
  }, [pagedHuddleVisible, prefs, personalize, category]);

  // Distance lookup for badges (only meaningful when we have coords + Huddle source)
  const distanceFor = (b: Business): number | null =>
    source === "huddle" && coords ? distanceToBusinessMi(coords, b) : null;


  return (
    <div className="min-h-screen bg-background">

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/8" />
        <div className="container py-14 md:py-20">
          <Reveal>
            <div className="max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
                Explore your area
              </span>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-foreground">{t("home.heroTitle")}</h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
                {t("home.heroSubtitle")}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <main id="main">
        <div className="container py-8 space-y-6">
        <PreferencesBanner />
        <Card className="p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] rounded-2xl border-border/60">
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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t">
            <ToggleGroup
              type="single"
              value={source}
              onValueChange={(v) => v && setSource(v as "huddle" | "google")}
              className="bg-muted/60 rounded-full p-1 gap-0 border border-border/50"
            >
              <ToggleGroupItem
                value="huddle"
                size="sm"
                className="rounded-full px-4 text-xs font-medium transition-all data-[state=on]:bg-gradient-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-elegant data-[state=off]:text-muted-foreground data-[state=off]:hover:text-foreground"
              >
                On Huddle
              </ToggleGroupItem>
              <ToggleGroupItem
                value="google"
                size="sm"
                className="rounded-full px-4 text-xs font-medium transition-all data-[state=on]:bg-gradient-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-elegant data-[state=off]:text-muted-foreground data-[state=off]:hover:text-foreground"
              >
                Nearby on Google
              </ToggleGroupItem>
            </ToggleGroup>
            {source === "google" ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {coords ? "Using your location" : geoDenied ? "Location unavailable — type to search" : "Requesting location…"}
              </p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <Switch id="near-me" checked={nearMe} onCheckedChange={setNearMe} />
                <Label htmlFor="near-me" className="text-xs cursor-pointer flex items-center gap-1">
                  <Navigation className="h-3 w-3" /> Near me
                </Label>
                {nearMe && !coords && !geoDenied && (
                  <span className="text-[11px] text-muted-foreground">Requesting location…</span>
                )}
                {nearMe && geoDenied && (
                  <span className="text-[11px] text-destructive">Location unavailable</span>
                )}
              </div>
            )}
          </div>

          {source === "huddle" && nearMe && coords && (
            <div className="pt-4 mt-4 border-t space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs flex items-center gap-1">
                  <Navigation className="h-3 w-3" /> Within {radiusMi} {radiusMi === 1 ? "mile" : "miles"}
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {huddleByRange.inRange.length} in range · {huddleByRange.outOfRange.length} farther
                </span>
              </div>
              <Slider
                value={[radiusMi]}
                onValueChange={(v) => setRadiusMi(v[0])}
                min={1}
                max={50}
                step={1}
                aria-label="Distance in miles"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 mi</span>
                <span>50 mi</span>
              </div>
            </div>
          )}
        </Card>

        {/* Category quick-filter pills */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 capitalize ${
                category === c
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {t(`cat.${c}` as TranslationKey)}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {source === "huddle"
              ? loading ? t("home.loading") : `${huddleVisible.length} ${huddleVisible.length === 1 ? t("home.businessCount") : t("home.businessCountPlural")}${nearMe && coords ? ` within ${radiusMi} mi` : ""}${huddleTotalPages > 1 ? ` · page ${huddlePage} of ${huddleTotalPages}` : ""}`
              : googleLoading ? "Searching Google…" : `${googlePlaces.length} nearby on Google`}
          </p>
          {(query || category !== "all" || minRating > 0 || openNow) && (
            <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setCategory("all"); setMinRating(0); setOpenNow(false); }}>
              {t("home.clearFilters")}
            </Button>
          )}
        </div>

        {/* Navigation hint */}
        <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
            Tap any card to view details, save it, or check in
          </span>
          <span className="text-border/60 select-none">·</span>
          <span>Use filters above to narrow results</span>
        </div>

        <div className="space-y-8">
            {source === "huddle" ? (
              <section aria-labelledby="huddle-heading" className="space-y-3">
                <h2 id="huddle-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  On Huddle
                </h2>
                {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-[1.5rem] bg-muted/40 border border-border/40 aspect-[16/10] animate-pulse" />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                  <Card className="p-12 text-center text-muted-foreground">
                    <p className="font-medium mb-1">{t("home.noResults")}</p>
                    <p className="text-sm">{t("home.noResultsHint")}</p>
                  </Card>
                ) : nearMe && coords && huddleByRange.inRange.length === 0 ? (
                  <Card className="p-8 text-center space-y-4 border-dashed">
                    <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Navigation className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">No Huddle businesses within {radiusMi} mi</p>
                      <p className="text-sm text-muted-foreground">
                        {huddleByRange.outOfRange.length > 0
                          ? `${huddleByRange.outOfRange.length} are farther away. Try widening the radius or check Google for nearby places.`
                          : "Try widening the radius or check Google for nearby places."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={() => setRadiusMi(Math.min(50, radiusMi + 10))}>
                        Widen to {Math.min(50, radiusMi + 10)} mi
                      </Button>
                      <Button size="sm" onClick={() => setSource("google")} className="gap-1">
                        Search Nearby on Google <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ) : pagedHuddleSplit.matches.length > 0 ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Picked for you
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {pagedHuddleSplit.matches.map((b) => {
                          const dist = distanceFor(b);
                          return (
                            <BusinessCard
                              key={b.id}
                              b={b}
                              distanceMi={dist}
                              reason={whyThisPlace(b, { prefs, trendingIds, distanceMi: dist })}
                            />
                          );
                        })}
                      </div>
                    </div>
                    {pagedHuddleSplit.rest.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-wide">
                          <span className="h-px bg-border flex-1" />
                          More on Huddle
                          <span className="h-px bg-border flex-1" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          {pagedHuddleSplit.rest.map((b) => <BusinessCard key={b.id} b={b} distanceMi={distanceFor(b)} />)}
                        </div>
                      </div>
                    )}
                    <HuddlePagination page={huddlePage} totalPages={huddleTotalPages} onPage={setHuddlePage} />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {pagedHuddleVisible.map((b, i) => (
                        <div key={b.id} className="animate-slide-up" style={{ animationDelay: `${(i % 6) * 60}ms` }}>
                          <BusinessCard b={b} distanceMi={distanceFor(b)} />
                        </div>
                      ))}
                    </div>
                    {nearMe && coords && huddleByRange.outOfRange.length > 0 && (
                      <Card className="p-4 flex flex-wrap items-center justify-between gap-3 bg-muted/30 border-dashed">
                        <p className="text-sm text-muted-foreground">
                          {huddleByRange.outOfRange.length} more {huddleByRange.outOfRange.length === 1 ? "business is" : "businesses are"} farther than {radiusMi} mi.
                        </p>
                        <Button size="sm" variant="outline" onClick={() => setSource("google")} className="gap-1">
                          See Nearby on Google <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Card>
                    )}
                    <HuddlePagination page={huddlePage} totalPages={huddleTotalPages} onPage={setHuddlePage} />
                  </div>
                )}
              </section>
            ) : (
              <section aria-labelledby="google-heading" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 id="google-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Nearby on Google
                  </h2>
                  <span className="text-[10px] text-muted-foreground">Powered by Google</span>
                </div>
                {googleLoading ? (
                  <Card className="p-12 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Searching Google Places…</p>
                  </Card>
                ) : googlePlaces.length === 0 ? (
                  <Card className="p-12 text-center text-muted-foreground">
                    <p className="font-medium mb-1">No Google results yet</p>
                    <p className="text-sm">
                      {geoDenied && !query ? "Type a search to find places on Google." : "Try a different search."}
                    </p>
                  </Card>
                ) : googleSplit.matches.length > 0 ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Matches your vibe
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {googleSplit.matches.map((p) => <GooglePlaceCard key={p.place_id} p={p} />)}
                      </div>
                    </div>
                    {googleSplit.rest.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-wide">
                          <span className="h-px bg-border flex-1" />
                          More nearby
                          <span className="h-px bg-border flex-1" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          {googleSplit.rest.map((p) => <GooglePlaceCard key={p.place_id} p={p} />)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {googlePlaces.map((p) => <GooglePlaceCard key={p.place_id} p={p} />)}
                  </div>
                )}
              </section>
            )}
        </div>
        </div>
        <BusinessOfTheWeek />
      </main>
      <Footer />
    </div>
  );
};

export default Discover;
