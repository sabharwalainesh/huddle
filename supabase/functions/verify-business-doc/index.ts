// Edge function: AI sanity-check on uploaded business proof documents.
// Lenient: flag obvious junk (selfies, blank pages, memes). Anything plausibly
// official is "passed" -> sent to admin queue for human approval.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  business_id: string;
  storage_path: string; // e.g. "<user_id>/<business_id>/<filename>"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return json({ error: "AI gateway not configured" }, 500);
    }

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

    // Fetch the business with service role to verify ownership
    const bizResp = await fetch(
      `${SUPABASE_URL}/rest/v1/businesses?select=id,owner_id,name,address&id=eq.${body.business_id}`,
      { headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE } },
    );
    const bizRows = await bizResp.json();
    const biz = bizRows?.[0];
    if (!biz || biz.owner_id !== userId) {
      return json({ error: "Not your business" }, 403);
    }

    // Sign the file so we can fetch its bytes
    const signResp = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/business-proofs/${body.storage_path}`,
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
      const txt = await signResp.text();
      console.error("sign error", txt);
      return json({ error: "Could not access uploaded file" }, 500);
    }
    const { signedURL } = await signResp.json();
    const fileResp = await fetch(`${SUPABASE_URL}/storage/v1${signedURL}`);
    if (!fileResp.ok) return json({ error: "Could not download file" }, 500);
    const arrayBuf = await fileResp.arrayBuffer();
    const contentType = fileResp.headers.get("content-type") ?? "application/octet-stream";

    // Encode as base64 for Gemini vision
    const base64 = base64Encode(new Uint8Array(arrayBuf));
    const dataUrl = `data:${contentType};base64,${base64}`;

    // Lenient AI check via Lovable AI Gateway, structured output via tool calling
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a lenient document classifier for a small-business directory. Decide whether the uploaded image plausibly looks like an OFFICIAL DOCUMENT a business owner might submit as proof (utility bill, business license, tax registration, lease, bank letter). Be generous: blurry, low-res, foreign-language, or partially cropped is fine if it still looks like a printed document. ONLY flag it as junk when it is OBVIOUSLY not a document — e.g., a selfie, a meme, a screenshot of social media, a photo of a person/pet/landscape, a blank page, or random clip-art. When in doubt, pass it.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Business name: ${biz.name}\nBusiness address: ${biz.address ?? "(not given)"}` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_verdict",
              description: "Return the verdict and a short user-facing reason.",
              parameters: {
                type: "object",
                properties: {
                  verdict: {
                    type: "string",
                    enum: ["passed", "flagged"],
                    description:
                      "passed = looks plausibly official, send to admin. flagged = obviously not a real doc.",
                  },
                  reason: {
                    type: "string",
                    description:
                      "One short sentence explaining the verdict in plain language for the business owner.",
                  },
                },
                required: ["verdict", "reason"],
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
    let verdict: "passed" | "flagged" = "flagged";
    let reason = "Could not analyze the document.";
    try {
      const args = JSON.parse(call?.function?.arguments ?? "{}");
      if (args.verdict === "passed" || args.verdict === "flagged") verdict = args.verdict;
      if (typeof args.reason === "string") reason = args.reason;
    } catch (e) {
      console.error("parse verdict error", e);
    }

    // If passed -> mark business as under_review (admin queue). If flagged -> stay pending so the user can re-upload.
    const newStatus = verdict === "passed" ? "under_review" : "pending";
    const aiStatus = verdict === "passed" ? "passed" : "flagged";

    const patchResp = await fetch(
      `${SUPABASE_URL}/rest/v1/businesses?id=eq.${body.business_id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          apikey: SERVICE_ROLE,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          proof_document_url: body.storage_path,
          status: newStatus,
          ai_review_status: aiStatus,
          ai_review_notes: reason,
          submitted_at: new Date().toISOString(),
        }),
      },
    );
    if (!patchResp.ok) {
      console.error("patch error", await patchResp.text());
      return json({ error: "Could not update business" }, 500);
    }

    return json({ verdict, reason, status: newStatus });
  } catch (e) {
    console.error("verify-business-doc error", e);
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
