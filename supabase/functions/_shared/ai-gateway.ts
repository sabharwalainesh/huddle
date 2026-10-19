// Shared config for the OpenAI-compatible AI gateway that fronts Google Gemini.
// Both values are overridable via Edge Function secrets so the endpoint or key
// can be swapped (or pointed at a different provider) without a code change.

/** Chat-completions endpoint. Override with the AI_GATEWAY_URL secret. */
export const AI_GATEWAY_URL =
  Deno.env.get("AI_GATEWAY_URL") ?? "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Bearer token for the gateway. Falls back to the legacy secret name. */
export const AI_GATEWAY_API_KEY =
  Deno.env.get("AI_GATEWAY_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY");
