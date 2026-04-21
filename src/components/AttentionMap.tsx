import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2, MapPin, LocateFixed, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT, useA11y } from "@/contexts/A11yContext";
import { StarRating } from "@/components/StarRating";
import { toast } from "@/hooks/use-toast";

type BizPoint = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  avg_rating: number;
  review_count: number;
  lat: number;
  lng: number;
  pulse_score: number; // 0..1 normalized
  total_score: number; // 0..1 normalized
};

type Mode = "trending" | "popular";

export const AttentionMap = () => {
  const t = useT();
  const { darkMode } = useA11y();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [points, setPoints] = useState<BizPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("trending");
  const [locInput, setLocInput] = useState("");
  const [locating, setLocating] = useState(false);

  // Fetch token + data
  useEffect(() => {
    let cancel = false;
    (async () => {
      const [tokRes, bizRes, pulseRes] = await Promise.all([
        supabase.functions.invoke("mapbox-token", { method: "GET" }),
        supabase
          .from("businesses")
          .select("id,name,category,image_url,avg_rating,review_count,lat,lng")
          .eq("status", "approved")
          .not("lat", "is", null)
          .not("lng", "is", null)
          .limit(1000),
        supabase.from("trending_pulse").select("business_id,pulse_score"),
      ]);
      if (cancel) return;

      if (tokRes.error || !tokRes.data?.token) {
        setTokenError(tokRes.error?.message ?? "No Mapbox token configured.");
        setLoading(false);
        return;
      }
      setToken(tokRes.data.token);

      const pulseMap = new Map<string, number>();
      (pulseRes.data ?? []).forEach((p: any) => {
        if (p.business_id != null && p.pulse_score != null) pulseMap.set(p.business_id, Number(p.pulse_score));
      });

      const raw = (bizRes.data ?? []).filter(
        (b) => typeof b.lat === "number" && typeof b.lng === "number",
      );
      const maxPulse = Math.max(1, ...Array.from(pulseMap.values()));
      const maxTotal = Math.max(1, ...raw.map((b) => (b.review_count ?? 0) * (b.avg_rating ?? 0)));

      setPoints(
        raw.map((b) => {
          const pulse = pulseMap.get(b.id) ?? 0;
          const total = (b.review_count ?? 0) * (b.avg_rating ?? 0);
          return {
            id: b.id,
            name: b.name,
            category: b.category,
            image_url: b.image_url,
            avg_rating: Number(b.avg_rating ?? 0),
            review_count: b.review_count ?? 0,
            lat: b.lat as number,
            lng: b.lng as number,
            pulse_score: pulse / maxPulse,
            total_score: total / maxTotal,
          };
        }),
      );
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Init map once we have token
  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: darkMode ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
      center: [-97.7431, 30.2672], // Austin (where demo data lives)
      zoom: 11,
      attributionControl: true,
      antialias: true,
      pitch: 0,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    map.scrollZoom.setWheelZoomRate(1 / 200);
    map.dragPan.enable();
    mapRef.current = map;

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  // React to dark mode
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(darkMode ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11");
    // re-add layers after style swap
    mapRef.current.once("style.load", () => renderLayers());
  }, [darkMode]);

  const featureCollection = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: points.map((p) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          name: p.name,
          category: p.category,
          image_url: p.image_url ?? "",
          avg_rating: p.avg_rating,
          review_count: p.review_count,
          weight: mode === "trending" ? p.pulse_score : p.total_score,
        },
      })),
    };
  }, [points, mode]);

  const renderLayers = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const SRC = "biz-src";
    const HEAT = "biz-heat";
    const PT = "biz-points";

    if (map.getLayer(PT)) map.removeLayer(PT);
    if (map.getLayer(HEAT)) map.removeLayer(HEAT);
    if (map.getSource(SRC)) map.removeSource(SRC);

    map.addSource(SRC, { type: "geojson", data: featureCollection as any });

    map.addLayer({
      id: HEAT,
      type: "heatmap",
      source: SRC,
      maxzoom: 17,
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0.2, 1, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 17, 4],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.15, "rgba(56,189,248,0.55)",
          0.4, "rgba(99,102,241,0.65)",
          0.6, "rgba(217,70,239,0.75)",
          0.8, "rgba(244,63,94,0.85)",
          1, "rgba(250,204,21,0.95)",
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 20, 9, 40, 14, 70, 17, 90],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.85, 14, 0.7, 17, 0.4],
      },
    });

    map.addLayer({
      id: PT,
      type: "circle",
      source: SRC,
      paint: {
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          0, 3,
          7, ["+", 4, ["*", 4, ["get", "weight"]]],
          16, ["+", 8, ["*", 12, ["get", "weight"]]],
        ],
        "circle-color": [
          "interpolate", ["linear"], ["get", "weight"],
          0, "hsl(199, 89%, 60%)",
          0.5, "hsl(280, 80%, 60%)",
          1, "hsl(48, 96%, 55%)",
        ],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "rgba(255,255,255,0.9)",
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.85, 7, 0.9, 11, 1],
      },
    });

    // Hover popup
    map.on("mousemove", PT, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const props = f.properties as any;
      const coords = (f.geometry as any).coordinates.slice() as [number, number];
      const html = `
        <div style="min-width:200px;font-family:inherit">
          ${props.image_url ? `<img src="${props.image_url}" alt="" style="width:100%;height:84px;object-fit:cover;border-radius:6px;margin-bottom:6px" />` : ""}
          <div style="font-weight:600;font-size:14px;line-height:1.2;margin-bottom:2px">${escapeHtml(props.name)}</div>
          <div style="font-size:11px;text-transform:capitalize;color:#888;margin-bottom:4px">${escapeHtml(props.category)}</div>
          <div style="font-size:12px">★ ${Number(props.avg_rating).toFixed(1)} · ${props.review_count} reviews</div>
        </div>`;
      if (!popupRef.current) {
        popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: "attention-popup" });
      }
      popupRef.current.setLngLat(coords).setHTML(html).addTo(map);
    });

    map.on("mouseleave", PT, () => {
      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
    });

    map.on("click", PT, (e) => {
      const f = e.features?.[0];
      if (!f) return;
      window.location.href = `/business/${(f.properties as any).id}`;
    });
  };

  // Render layers when data or style changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) renderLayers();
    else map.once("style.load", renderLayers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureCollection]);

  const flyToCoords = (lng: number, lat: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 13, speed: 1.4, curve: 1.6, essential: true });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyToCoords(pos.coords.longitude, pos.coords.latitude);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast({ title: "Couldn't get location", description: err.message, variant: "destructive" });
      },
    );
  };

  const searchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locInput.trim() || !token) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locInput)}.json?limit=1&access_token=${token}`,
      );
      const json = await res.json();
      const f = json.features?.[0];
      if (!f) {
        toast({ title: "Not found", description: "Try a city, ZIP, or address." });
        return;
      }
      const [lng, lat] = f.center as [number, number];
      flyToCoords(lng, lat);
    } catch (err) {
      toast({ title: "Search failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const hasNoData = !loading && !tokenError && points.length === 0;

  return (
    <section className="container py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">{t("map.title")}</h2>
          <p className="text-sm text-muted-foreground max-w-xl">{t("map.subtitle")}</p>
        </div>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v as Mode)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="trending">{t("map.trending")}</ToggleGroupItem>
          <ToggleGroupItem value="popular">{t("map.popular")}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card className="overflow-hidden shadow-card">
        <div className="border-b p-3 flex flex-col sm:flex-row gap-2 sm:items-end bg-muted/30">
          <form onSubmit={searchLocation} className="flex-1 flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="loc" className="text-xs">{t("map.locationLabel")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="loc"
                  className="pl-9"
                  placeholder={t("map.locationPlaceholder")}
                  value={locInput}
                  onChange={(e) => setLocInput(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" variant="secondary" size="default">{t("map.go")}</Button>
          </form>
          <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating} className="sm:self-end">
            {locating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LocateFixed className="h-4 w-4 mr-2" />}
            {t("map.useMyLocation")}
          </Button>
        </div>

        <div className="relative">
          <div ref={containerRef} className="w-full h-[500px]" aria-label="Attention heat map" />
          {(loading || (!token && !tokenError)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {tokenError && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-background/80">
              <div>
                <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium">{t("map.tokenMissing")}</p>
                <p className="text-xs text-muted-foreground mt-1">{tokenError}</p>
              </div>
            </div>
          )}
          {hasNoData && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-md bg-background/90 border text-xs text-muted-foreground shadow-card">
              {t("map.noPinned")}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
};

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

// suppress unused import warning
void Link;
void StarRating;
