// Edge function: AI sanity-check on uploaded receipt photos for "Verify Visit".
// Confirms: (1) it looks like a real receipt, (2) business name matches, (3) date is recent (<= 90 days).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  business_id: string;
  storage_path: string; // "<user_id>/<business_id>/<filename>" inside the `receipts` bucket
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");

    if (!AI_GATEWAY_API_KEY) return json({ error: "AI gateway not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    // Validate caller
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: ANON },
    });
    if (!userResp.ok) return json({ error: "Unauthorized" }, 401);
    const userData = await userResp.json();
    const userId: string = userData.id;

    const body: RequestBody = await req.json();
    if (!body.business_id || !body.storage_path) {
      return json({ error: "business_id and storage_path required" }, 400);
    }
    // Caller can only verify their own uploaded receipts
    if (!body.storage_path.startsWith(`${userId}/`)) {
      return json({ error: "You can only verify your own uploads" }, 403);
    }

    // Look up the business name (public-readable for approved; service role bypasses anyway)
    const bizResp = await fetch(
      `${SUPABASE_URL}/rest/v1/businesses?select=id,name,address&id=eq.${body.business_id}`,
      { headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE } },
    );
    const bizRows = await bizResp.json();
    const biz = bizRows?.[0];
    if (!biz) return json({ error: "Business not found" }, 404);

    // Sign the receipt URL
    const signResp = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/receipts/${body.storage_path}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          apikey: SERVICE_ROLE,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 60 }),
      },
    );
    if (!signResp.ok) {
      console.error("sign error", await signResp.text());
      return json({ error: "Could not access uploaded file" }, 500);
    }
    const { signedURL } = await signResp.json();
    const fileResp = await fetch(`${SUPABASE_URL}/storage/v1${signedURL}`);
    if (!fileResp.ok) return json({ error: "Could not download file" }, 500);
    const arrayBuf = await fileResp.arrayBuffer();
    const contentType = fileResp.headers.get("content-type") ?? "application/octet-stream";
    const dataUrl = `data:${contentType};base64,${base64Encode(new Uint8Array(arrayBuf))}`;

    const today = new Date().toISOString().slice(0, 10);

    // AI verification via AI Gateway with structured tool calling
    const aiResp = await fetch("https://ai.gateway.example.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You verify customer receipts for a local business directory. Look at the image and decide three things: (1) does it LOOK like a real point-of-sale receipt or invoice (printed thermal paper, line items, totals, store header) — not a screenshot, selfie, meme, blank page, or random photo; (2) does the business name on the receipt plausibly match the expected business — be lenient with abbreviations, franchises, parent companies, partial matches, OCR errors, and foreign-language names; (3) is the receipt date within the last 90 days from today's date. Today's date is provided. If you cannot read a date, treat it as recent and pass it. Be reasonably lenient on (2) and (3) but strict on (1) — obvious non-receipts must fail.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Today: ${today}\nExpected business name: ${biz.name}\nExpected address (for context, may not appear on receipt): ${biz.address ?? "(unknown)"}`,
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_verdict",
              description: "Report the verification verdict.",
              parameters: {
                type: "object",
                properties: {
                  is_receipt: { type: "boolean", description: "True if the image plausibly looks like a real receipt or invoice." },
                  business_match: { type: "boolean", description: "True if the business name on the receipt plausibly matches the expected business." },
                  date_recent: { type: "boolean", description: "True if the receipt date is within the last 90 days, OR if the date is unreadable." },
                  reason: { type: "string", description: "One short sentence in plain language explaining the verdict to the customer." },
                },
                required: ["is_receipt", "business_match", "date_recent", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_verdict" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Rate limit exceeded, try again shortly." }, 429);
    if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!aiResp.ok) {
      console.error("AI error", await aiResp.text());
      return json({ error: "AI verification failed" }, 500);
    }

    const aiJson = await aiResp.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let is_receipt = false, business_match = false, date_recent = false;
    let reason = "Could not analyze the receipt.";
    try {
      const args = JSON.parse(call?.function?.arguments ?? "{}");
      is_receipt = !!args.is_receipt;
      business_match = !!args.business_match;
      date_recent = !!args.date_recent;
      if (typeof args.reason === "string") reason = args.reason;
    } catch (e) {
      console.error("parse verdict error", e);
    }

    const verified = is_receipt && business_match && date_recent;
    return json({ verified, is_receipt, business_match, date_recent, reason });
  } catch (e) {
    console.error("verify-receipt error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
