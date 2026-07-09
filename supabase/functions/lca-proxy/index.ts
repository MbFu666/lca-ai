// Supabase Edge Function — DeepSeek API Proxy

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const ALLOWED_MODELS = ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"];

Deno.serve(async (req: Request) => {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
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
    max_tokens: Math.min(parseInt(body.max_tokens) || 5000, 16000),
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
