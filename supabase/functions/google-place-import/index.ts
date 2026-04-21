const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const BodySchema = z.object({
  place_id: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(300).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  websiteUri: z.string().max(500).optional().nullable(),
  primaryType: z.string().max(100).optional().nullable(),
  photoUrl: z.string().max(1000).optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(),
  userRatingCount: z.number().int().min(0).optional().nullable(),
});

// Map Google primary types to our category enum strings
const mapCategory = (t: string | null | undefined): string => {
  if (!t) return "other";
  const s = t.toLowerCase();
  if (/(restaurant|cafe|bar|bakery|food|meal)/.test(s)) return "food";
  if (/(store|shop|retail|market|clothing)/.test(s)) return "retail";
  if (/(doctor|hospital|clinic|pharmacy|dental|health|gym|spa)/.test(s)) return "health";
  if (/(movie|theater|park|museum|night_club|amusement|entertainment)/.test(s)) return "entertainment";
  if (/(salon|laundry|repair|service|plumber|electrician|lawyer|bank)/.test(s)) return "services";
  return "other";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const p = parsed.data;
    const admin = createClient(supabaseUrl, service);

    // De-dup: check google_place_cache for existing business_id mapping
    const { data: existingCache } = await admin
      .from("google_place_cache")
      .select("business_id")
      .eq("place_id", p.place_id)
      .maybeSingle();

    if (existingCache?.business_id) {
      const { data: existingBiz } = await admin
        .from("businesses")
        .select("id")
        .eq("id", existingCache.business_id)
        .maybeSingle();
      if (existingBiz?.id) {
        return new Response(JSON.stringify({ id: existingBiz.id, existed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const category = mapCategory(p.primaryType);

    const { data: inserted, error: insErr } = await admin
      .from("businesses")
      .insert({
        owner_id: userId,
        name: p.name,
        category,
        description: `Imported from Google. ${p.address ?? ""}`.trim(),
        address: p.address ?? null,
        phone: p.phone ?? null,
        website: p.websiteUri ?? null,
        image_url: p.photoUrl ?? null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        avg_rating: p.rating ?? 0,
        review_count: p.userRatingCount ?? 0,
        status: "pending",
        ai_review_status: "not_run",
        submitted_at: new Date().toISOString(),
        tags: ["google-imported"],
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return new Response(JSON.stringify({ error: insErr?.message ?? "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link in cache for de-dup
    await admin.from("google_place_cache").upsert({
      business_id: inserted.id,
      place_id: p.place_id,
      payload: { imported: true, source: "google-place-import" },
      fetched_at: new Date().toISOString(),
    }, { onConflict: "business_id" });

    return new Response(JSON.stringify({ id: inserted.id, existed: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
