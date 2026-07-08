// Supabase Edge Function — DeepSeek API Proxy
// Replaces Cloudflare Worker for LCA calculations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const ALLOWED_MODELS = [
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "deepseek-chat",
  "deepseek-reasoner",
];

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check API key
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: DEEPSEEK_API_KEY missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Parse and validate request body
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Sanitize request
  const safe = {
    model: typeof body.model === "string" ? body.model : "deepseek-v4-flash",
    messages: Array.isArray(body.messages) ? body.messages : [],
    max_tokens: Math.min(parseInt(body.max_tokens) || 5000, 16000),
    temperature: typeof body.temperature === "number" ? body.temperature : 0.2,
    stream: false,
  };

  // Only add response_format if provided
  if (body.response_format) {
    safe.response_format = body.response_format;
  }

  // Validate model
  if (!ALLOWED_MODELS.includes(safe.model)) {
    safe.model = "deepseek-v4-flash";
  }

  // Call DeepSeek API with timeout
  let upstream;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    upstream = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(safe),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      return new Response(
        JSON.stringify({ error: "DeepSeek timed out after 90s" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Upstream fetch failed: " + e.message }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  clearTimeout(timeout);

  // Return response
  const text = await upstream.text();
  if (!upstream.ok) {
    return new Response(
      JSON.stringify({
        error: `DeepSeek API ${upstream.status}`,
        upstream_status: upstream.status,
        upstream_body: text.slice(0, 1000),
      }),
      {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(text, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  });
});
