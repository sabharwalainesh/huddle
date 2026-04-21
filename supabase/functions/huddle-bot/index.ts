import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  avg_rating: number;
  address: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, businesses } = await req.json() as { question: string; businesses: Business[] };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return new Response(JSON.stringify({ error: "A question is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compact directory representation for the model
    const directory = (businesses ?? []).slice(0, 200).map((b) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      rating: Number(b.avg_rating),
      tags: b.tags ?? [],
      desc: (b.description ?? "").slice(0, 280),
    }));

    const systemPrompt = `You are Huddle Bot, a friendly local-business concierge.
You help users find the right business from the provided directory ONLY.
Rules:
- Use ONLY the businesses in the provided JSON. Do not invent businesses.
- If nothing matches, say so honestly and suggest the closest related options.
- Keep replies short, warm, and scannable. Use markdown bullet lists.
- When recommending a business, always wrap its name as a markdown link: [Name](/business/{id}) using the id from the directory.
- Mention rating and category briefly when relevant.`;

    const userPrompt = `User question: ${question.trim()}

Local business directory (JSON):
${JSON.stringify(directory)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in your Lovable workspace." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content ?? "I'm not sure how to answer that yet.";

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("huddle-bot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
