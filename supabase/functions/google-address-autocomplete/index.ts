const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const BodySchema = z.object({
  input: z.string().trim().min(1).max(200),
  sessionToken: z.string().min(1).max(100).optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  // If place_id is provided, we resolve it to a full formatted address.
  place_id: z.string().min(1).max(300).optional(),
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
    const { input, sessionToken, lat, lng, place_id } = parsed.data;

    // Resolve a selected suggestion → full formatted address
    if (place_id) {
      const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(place_id)}`, {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "formattedAddress,location",
        },
      });
      if (!r.ok) {
        return new Response(JSON.stringify({ error: "Place lookup failed" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const j = await r.json();
      return new Response(
        JSON.stringify({
          address: j.formattedAddress ?? null,
          lat: j.location?.latitude ?? null,
          lng: j.location?.longitude ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Otherwise, run autocomplete
    const body: Record<string, unknown> = {
      input,
      includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"],
    };
    if (sessionToken) body.sessionToken = sessionToken;
    if (lat != null && lng != null) {
      body.locationBias = {
        circle: { center: { latitude: lat, longitude: lng }, radius: 50000 },
      };
    }

    const r = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text();
      return new Response(JSON.stringify({ error: "Autocomplete failed", detail: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await r.json();
    type Suggestion = {
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    };
    const suggestions = ((j.suggestions ?? []) as Suggestion[])
      .map((s) => {
        const pp = s.placePrediction;
        if (!pp?.placeId) return null;
        return {
          place_id: pp.placeId,
          text: pp.text?.text ?? "",
          mainText: pp.structuredFormat?.mainText?.text ?? "",
          secondaryText: pp.structuredFormat?.secondaryText?.text ?? "",
        };
      })
      .filter(Boolean)
      .slice(0, 8);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
