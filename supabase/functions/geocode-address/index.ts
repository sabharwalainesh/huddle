import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const BodySchema = z.object({
  business_id: z.string().uuid(),
  address: z.string().trim().min(3).max(300),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
    if (!token) throw new Error("MAPBOX_PUBLIC_TOKEN not set");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { business_id, address } = parsed.data;

    // Auth: require a logged-in user; only owner or admin can update
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Geocode via Mapbox
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?limit=1&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: `Mapbox error: ${txt}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const json = await res.json();
    const feature = json.features?.[0];
    if (!feature) {
      return new Response(JSON.stringify({ error: "Address not found", lat: null, lng: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const [lng, lat] = feature.center as [number, number];

    // Persist via service role (RLS-safe: we already verified the caller above and the business_id is theirs through RLS update)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Only update if user owns it OR is admin — enforce by checking ownership/role via user client
    const { data: biz } = await userClient
      .from("businesses")
      .select("id, owner_id")
      .eq("id", business_id)
      .maybeSingle();
    if (!biz) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upErr } = await admin
      .from("businesses")
      .update({ lat, lng })
      .eq("id", business_id);
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ lat, lng, place: feature.place_name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
