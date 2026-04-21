const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const BodySchema = z.object({
  query: z.string().trim().max(200).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  radiusMeters: z.number().min(100).max(50000).optional().default(5000),
  maxResults: z.number().min(1).max(20).optional().default(20),
});

// Allowed primary types — local consumer-facing small businesses only.
// Excludes schools, government, hospitals, transit, large chains' parent categories, etc.
const ALLOWED_TYPES = new Set<string>([
  // Food & drink
  "restaurant", "cafe", "bakery", "bar", "meal_takeaway", "meal_delivery",
  "coffee_shop", "ice_cream_shop", "sandwich_shop", "pizza_restaurant",
  "breakfast_restaurant", "brunch_restaurant", "fast_food_restaurant",
  "fine_dining_restaurant", "vegan_restaurant", "vegetarian_restaurant",
  "juice_shop", "tea_house", "donut_shop", "bagel_shop", "dessert_shop",
  "wine_bar", "pub", "brewery", "winery",
  // Retail / shops
  "store", "clothing_store", "shoe_store", "jewelry_store", "book_store",
  "gift_shop", "florist", "furniture_store", "home_goods_store",
  "hardware_store", "bicycle_store", "pet_store", "sporting_goods_store",
  "toy_store", "convenience_store", "grocery_store", "supermarket",
  "liquor_store", "thrift_store", "boutique",
  // Personal services / wellness
  "hair_salon", "barber_shop", "beauty_salon", "nail_salon", "spa",
  "tattoo_parlor", "massage", "gym", "yoga_studio", "fitness_center",
  // Professional / local services
  "laundry", "dry_cleaner", "tailor", "shoe_repair", "key_locksmith",
  "auto_repair", "car_wash", "pet_grooming", "veterinary_care",
  // Entertainment small biz
  "art_gallery", "art_studio", "music_venue", "bowling_alley",
]);

function isLocalBusiness(primaryType: string | null | undefined, types?: string[]): boolean {
  if (primaryType && ALLOWED_TYPES.has(primaryType)) return true;
  if (types && types.some((t) => ALLOWED_TYPES.has(t))) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY not set");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { query, lat, lng, radiusMeters, maxResults } = parsed.data;

    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.location",
      "places.rating",
      "places.userRatingCount",
      "places.primaryType",
      "places.types",
      "places.googleMapsUri",
      "places.websiteUri",
      "places.nationalPhoneNumber",
      "places.photos",
    ].join(",");

    const fetchCount = 20;
    const MAX_REVIEWS = 200;

    const fieldHeaders = {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    };

    // Helper: run one Places API request and return raw places array
    const runRequest = async (url: string, body: Record<string, unknown>) => {
      const r = await fetch(url, { method: "POST", headers: fieldHeaders, body: JSON.stringify(body) });
      if (!r.ok) return [];
      const j = await r.json();
      return (j.places ?? []) as Array<Record<string, unknown>>;
    };

    let rawPlaces: Array<Record<string, unknown>> = [];

    if (query && query.length > 0) {
      const body: Record<string, unknown> = { textQuery: query, maxResultCount: fetchCount };
      if (lat != null && lng != null) {
        body.locationBias = {
          circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
        };
      }
      rawPlaces = await runRequest("https://places.googleapis.com/v1/places:searchText", body);
    } else if (lat != null && lng != null) {
      // No query → fan out across small-business buckets via text search.
      // This consistently surfaces independent local shops, even in areas
      // where plain Nearby Search is dominated by big chains.
      const buckets = ["coffee shops", "restaurants", "bakeries", "boutiques", "salons"];
      const results = await Promise.all(
        buckets.map((q) =>
          runRequest("https://places.googleapis.com/v1/places:searchText", {
            textQuery: q,
            maxResultCount: 10,
            locationBias: {
              circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
            },
          }),
        ),
      );
      // Dedupe by place id
      const seen = new Set<string>();
      for (const arr of results) {
        for (const p of arr) {
          const id = p.id as string | undefined;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          rawPlaces.push(p);
        }
      }
    } else {
      return new Response(JSON.stringify({ places: [], reason: "no_query_or_location" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filtered = rawPlaces.filter((p) => {
      const count = (p.userRatingCount as number | undefined) ?? 0;
      // Drop big chains AND empty ghost listings
      if (count > MAX_REVIEWS) return false;
      if (count < 1) return false;
      return isLocalBusiness(p.primaryType as string | null, p.types as string[] | undefined);
    });
    const places = filtered.slice(0, maxResults).map((p) => {
      const photo = (p.photos as Array<{ name?: string }> | undefined)?.[0]?.name;
      const photoUrl = photo
        ? `https://places.googleapis.com/v1/${photo}/media?maxWidthPx=600&key=${apiKey}`
        : null;
      return {
        place_id: p.id,
        name: (p.displayName as { text?: string })?.text ?? "",
        address: p.formattedAddress ?? null,
        lat: (p.location as { latitude?: number })?.latitude ?? null,
        lng: (p.location as { longitude?: number })?.longitude ?? null,
        rating: p.rating ?? null,
        userRatingCount: p.userRatingCount ?? 0,
        primaryType: p.primaryType ?? null,
        googleMapsUri: p.googleMapsUri ?? null,
        websiteUri: p.websiteUri ?? null,
        phone: p.nationalPhoneNumber ?? null,
        photoUrl,
      };
    });

    return new Response(JSON.stringify({ places }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
