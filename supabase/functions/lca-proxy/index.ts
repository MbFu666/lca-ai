// Supabase Edge Function — DeepSeek API Proxy

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const ALLOWED_MODELS = ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"];

const rateLimitMap = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const window = 60_000; // 1 minute
  const maxRequests = 10;

  const timestamps = rateLimitMap.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < window);
  if (recent.length >= maxRequests) return true;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return false;
}

Deno.serve(async (req: Request) => {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "https://lca-ai.ru",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing authorization token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Rate limiting
  if (isRateLimited(user.id)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 10 requests per minute." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "DEEPSEEK_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const safe = {
    model: ALLOWED_MODELS.includes(body.model) ? body.model : "deepseek-v4-flash",
    messages: Array.isArray(body.messages) ? body.messages : [],
    max_tokens: Math.min(parseInt(body.max_tokens) || 5000, 4000),
    temperature: typeof body.temperature === "number" ? body.temperature : 0.2,
    stream: false,
  };
  if (body.response_format) {
    (safe as any).response_format = body.response_format;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  let upstream: Response;
  try {
    upstream = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(safe),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timeout);
    return new Response(JSON.stringify({ error: e.name === "AbortError" ? "Timeout" : e.message }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  clearTimeout(timeout);

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": upstream.headers.get("Content-Type") || "application/json" }
  });
});
