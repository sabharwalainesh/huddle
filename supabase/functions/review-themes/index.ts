import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  business_name: string;
  reviews: { rating: number; comment: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { business_name, reviews } = (await req.json()) as Body;
    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY is not configured");

    if (!Array.isArray(reviews) || reviews.length === 0) {
      return new Response(JSON.stringify({ themes: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reviewsText = reviews
      .slice(0, 50)
      .map((r, i) => `${i + 1}. [${r.rating}★] ${String(r.comment).slice(0, 400)}`)
      .join("\n");

    const systemPrompt = `You analyze customer reviews and extract recurring themes.
For each theme, return: a short label (2-4 words, lowercase, e.g. "great service", "parking issues", "late-night hours"), how many reviews mention it (count), and sentiment ("positive", "negative", or "neutral").
Return only the most frequent and distinctive themes (typically 4-8). Skip generic ones like "good" or "bad".`;

    const userPrompt = `Business: ${business_name}
Reviews (${reviews.length}):
${reviewsText}`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "report_themes",
              description: "Report recurring themes from the reviews.",
              parameters: {
                type: "object",
                properties: {
                  themes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        count: { type: "integer", minimum: 1 },
                        sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
                      },
                      required: ["label", "count", "sentiment"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["themes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_themes" } },
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
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let themes: { label: string; count: number; sentiment: string }[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        themes = Array.isArray(parsed.themes) ? parsed.themes : [];
      } catch {
        themes = [];
      }
    }

    return new Response(JSON.stringify({ themes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
