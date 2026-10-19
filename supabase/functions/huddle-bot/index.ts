import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { AI_GATEWAY_URL, AI_GATEWAY_API_KEY } from "../_shared/ai-gateway.ts";

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
    if (!AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY is not configured");

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

    const systemPrompt = `You are Huddle Bot, a friendly local-business concierge for the Huddle app.
You help users find businesses and navigate the site.
Rules:
- Use ONLY the businesses in the provided JSON. Do not invent businesses.
- If nothing matches, say so honestly and suggest the closest related options.
- Keep replies short, warm, and scannable. Use markdown bullet lists.
- When recommending a business, always wrap its name as a markdown link: [Name](/business/{id}) using the id from the directory.
- Mention rating and category briefly when relevant.
- When a user asks where to find a page or feature, respond with a markdown link to the correct page.

Site pages (use these paths as markdown links when relevant):
- Home / main page → [Home](/)
- Discover businesses → [Discover](/discover)
- My saved businesses (bookmarks) → [My Huddle](/my-huddle)
- My account / profile settings → [Account](/account)
- Manage my businesses / business dashboard → [My Businesses](/business-dashboard)
- Business insights & analytics → [My Insights](/insights)
- List / register a new business → [List a Business](/business/onboarding)
- Sign in or sign up → [Sign In](/auth)
- About Huddle → [About](/about)`;

    const userPrompt = `User question: ${question.trim()}

Local business directory (JSON):
${JSON.stringify(directory)}`;

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
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
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to the AI gateway account." }), {
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
