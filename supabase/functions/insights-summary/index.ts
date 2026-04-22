import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsightInput {
  business: {
    name: string;
    category: string;
    avg_rating: number;
    review_count: number;
    total_views: number;
    unique_viewers: number;
    views_30d: number;
    total_bookmarks: number;
    total_check_ins: number;
    check_ins_30d: number;
  };
  recent_reviews?: { rating: number; comment: string }[];
  mode?: "summary" | "health";
}

// Heuristic 0-100 health score combining engagement, conversion, and reputation.
function computeHealthScore(b: InsightInput["business"]): number {
  const reputation = Math.min(1, Number(b.avg_rating) / 5) * (b.review_count >= 5 ? 1 : b.review_count / 5);
  const engagement = Math.min(1, Math.log10(1 + b.views_30d) / 2.5); // ~300 views = full
  const conversion = b.total_views > 0 ? Math.min(1, (b.total_check_ins / b.total_views) / 0.15) : 0;
  const loyalty = Math.min(1, b.total_bookmarks / 25);
  const score = reputation * 35 + engagement * 30 + conversion * 20 + loyalty * 15;
  return Math.round(Math.max(0, Math.min(100, score)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { business, recent_reviews = [], mode = "summary" } = (await req.json()) as InsightInput;
    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY is not configured");
    if (!business?.name) {
      return new Response(JSON.stringify({ error: "business is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversionRate = business.total_views > 0
      ? ((business.total_check_ins / business.total_views) * 100).toFixed(1)
      : "0";

    const healthScore = computeHealthScore(business);

    const systemPrompt = mode === "health"
      ? `You are an analytics coach for small local businesses.
Write a concise one-paragraph narrative (3-5 sentences) explaining the business's health score (${healthScore}/100).
- Reference 1-2 specific numbers (use trends, % changes, or comparisons — not just raw counts).
- Call out one thing going well and one thing to improve.
- End with one concrete suggestion.
- Plain language, no jargon, no markdown headings.`
      : `You are an analytics coach for small local businesses.
Write a concise, friendly summary (3-5 short bullet points) of the business's recent performance.
- Highlight what's working and one specific thing they could improve.
- Reference the numbers naturally; don't just restate them.
- End with one short, concrete suggestion.
- Use plain language, no jargon. No markdown headings — just bullet points.`;

    const userPrompt = `Business: ${business.name} (${business.category})
Avg rating: ${business.avg_rating} from ${business.review_count} reviews
Total page views: ${business.total_views} (${business.views_30d} in last 30 days)
Unique viewers: ${business.unique_viewers}
Bookmarks: ${business.total_bookmarks}
Verified check-ins: ${business.total_check_ins} (${business.check_ins_30d} in last 30 days)
View → check-in conversion: ${conversionRate}%
Health score: ${healthScore}/100

${recent_reviews.length ? `Recent reviews:\n${recent_reviews.slice(0, 5).map((r) => `- ${r.rating}★ "${r.comment.slice(0, 200)}"`).join("\n")}` : "No recent reviews yet."}`;

    const response = await fetch("https://ai.gateway.example.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI gateway error: ${text}`);
    }

    const data = await response.json();
    const summary = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ summary, health_score: healthScore }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
