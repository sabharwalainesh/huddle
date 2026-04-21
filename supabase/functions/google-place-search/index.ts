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
  maxResults: z.number().min(1).max(10).optional().default(6),
});

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
      "places.googleMapsUri",
      "places.websiteUri",
      "places.nationalPhoneNumber",
      "places.photos",
    ].join(",");

    let url: string;
    let body: Record<string, unknown>;

    if (query && query.length > 0) {
      url = "https://places.googleapis.com/v1/places:searchText";
      body = { textQuery: query, maxResultCount: maxResults };
      if (lat != null && lng != null) {
        body.locationBias = {
          circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
        };
      }
    } else if (lat != null && lng != null) {
      url = "https://places.googleapis.com/v1/places:searchNearby";
      body = {
        maxResultCount: maxResults,
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
        },
      };
    } else {
      return new Response(JSON.stringify({ places: [], reason: "no_query_or_location" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: `Google search failed: ${txt}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    const places = (json.places ?? []).map((p: Record<string, unknown>) => {
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
