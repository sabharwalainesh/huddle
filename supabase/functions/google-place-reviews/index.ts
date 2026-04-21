const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const BodySchema = z.union([
  z.object({
    business_id: z.string().uuid(),
    name: z.string().trim().min(1).max(200),
    address: z.string().trim().min(1).max(300).optional().nullable(),
  }),
  z.object({
    place_id: z.string().min(1).max(200),
  }),
]);

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
    const input = parsed.data as
      | { business_id: string; name: string; address?: string | null }
      | { place_id: string };
    const byPlaceId = "place_id" in input;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let resolvedPlaceId: string | null = null;

    if (byPlaceId) {
      resolvedPlaceId = input.place_id;
    } else {
      const { data: cached } = await admin
        .from("google_place_cache")
        .select("*")
        .eq("business_id", input.business_id)
        .maybeSingle();

      if (cached && cached.payload && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
        return new Response(JSON.stringify({ cached: true, ...cached.payload }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const query = input.address ? `${input.name} ${input.address}` : input.name;
      const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
      });

      if (!searchRes.ok) {
        const txt = await searchRes.text();
        return new Response(JSON.stringify({ error: `Google search failed: ${txt}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const searchJson = await searchRes.json();
      resolvedPlaceId = searchJson.places?.[0]?.id ?? null;

      if (!resolvedPlaceId) {
        const payload = { found: false, reviews: [], rating: null, userRatingCount: 0 };
        await admin.from("google_place_cache").upsert({
          business_id: input.business_id,
          place_id: null,
          payload,
          fetched_at: new Date().toISOString(),
        }, { onConflict: "business_id" });
        return new Response(JSON.stringify({ cached: false, ...payload }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const place = { id: resolvedPlaceId! };

    // 3. Place Details for reviews
    const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${place.id}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,reviews,googleMapsUri",
      },
    });

    if (!detailsRes.ok) {
      const txt = await detailsRes.text();
      return new Response(JSON.stringify({ error: `Google details failed: ${txt}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const details = await detailsRes.json();
    const payload = {
      found: true,
      place_id: place.id,
      name: details.displayName?.text ?? null,
      formatted_address: details.formattedAddress ?? null,
      rating: details.rating ?? null,
      userRatingCount: details.userRatingCount ?? 0,
      googleMapsUri: details.googleMapsUri ?? null,
      reviews: (details.reviews ?? []).map((r: Record<string, unknown>) => ({
        author: (r.authorAttribution as { displayName?: string })?.displayName ?? "Google user",
        authorUri: (r.authorAttribution as { uri?: string })?.uri ?? null,
        authorPhoto: (r.authorAttribution as { photoUri?: string })?.photoUri ?? null,
        rating: r.rating,
        text: (r.text as { text?: string })?.text ?? (r.originalText as { text?: string })?.text ?? "",
        relativeTime: r.relativePublishTimeDescription,
        publishTime: r.publishTime,
      })),
    };

    if (!byPlaceId) {
      await admin.from("google_place_cache").upsert({
        business_id: (input as { business_id: string }).business_id,
        place_id: place.id,
        payload,
        fetched_at: new Date().toISOString(),
      }, { onConflict: "business_id" });
    }

    return new Response(JSON.stringify({ cached: false, ...payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
