import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const token = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "MAPBOX_PUBLIC_TOKEN not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ token }), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });
});
