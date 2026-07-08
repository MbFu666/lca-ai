/**
 * LCA·AI — Cloudflare Worker, который проксирует запросы от
 * сайта (lca-ai.html) к DeepSeek API и подставляет ваш ключ.
 *
 * ──── ШАГИ РАЗВЁРТЫВАНИЯ ──────────────────────────────────
 *
 * 1. На dash.cloudflare.com → Workers & Pages → Create →
 *    Hello World template → дайте имя, например "lca-ai-proxy".
 *
 * 2. В редакторе вставьте этот файл целиком и нажмите Deploy.
 *    Получите URL вида:
 *      https://lca-ai-proxy.<ваш-сабдомен>.workers.dev
 *
 * 3. Settings → Variables → Secrets → Add → имя
 *    DEEPSEEK_API_KEY, значение = ваш НОВЫЙ ключ DeepSeek
 *    (старый, который вы прислали в чате, считайте слитым
 *    и отзовите его на platform.deepseek.com сразу).
 *
 * 4. В lca-ai.html замените строку:
 *      const API_URL = "/api/lca";
 *    на:
 *      const API_URL = "https://lca-ai-proxy.<ваш-сабдомен>.workers.dev";
 *
 * 5. По желанию — в ALLOWED_ORIGINS ниже впишите домен, где
 *    будет жить сайт, чтобы ключ не использовали с чужих
 *    страниц.
 * ──────────────────────────────────────────────────────────
 */

// Разрешённые источники запросов. "*" — пускать всех (для тестов).
// На проде впишите ваш домен: ["https://lca.example.com"]
const ALLOWED_ORIGINS = ["*"];

// Куда проксируем
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

// Простой rate-limit per IP (опционально, требует Workers KV — закомментировано)
const MAX_REQUEST_BYTES = 5 * 1024 * 1024; // 5 MB — на случай больших картинок

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const corsOrigin =
      ALLOWED_ORIGINS.includes("*") ? "*" :
      ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    // Проверка ключа
    if (!env.DEEPSEEK_API_KEY) {
      return json({ error: "Server misconfigured: DEEPSEEK_API_KEY missing" }, 500, corsHeaders);
    }

    // Защита от слишком больших тел
    const cl = parseInt(request.headers.get("Content-Length") || "0", 10);
    if (cl > MAX_REQUEST_BYTES) {
      return json({ error: "Payload too large" }, 413, corsHeaders);
    }

    // Считываем и слегка валидируем тело
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, corsHeaders);
    }

    // Минимальная санитизация: разрешаем только осмысленные поля
    const safe = {
      model: typeof body.model === "string" ? body.model : "deepseek-v4-flash",
      messages: Array.isArray(body.messages) ? body.messages : [],
      max_tokens: Math.min(parseInt(body.max_tokens) || 5000, 16000),
      temperature: typeof body.temperature === "number" ? body.temperature : 0.2,
      stream: false,  // принудительно — стрим капризничал через CF Workers
    };
    // response_format только если передан (для JSON-запросов, не для чата)
    if (body.response_format) {
      safe.response_format = body.response_format;
    }

    // Белый список моделей
    const ALLOWED_MODELS = [
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "deepseek-chat",      // legacy alias
      "deepseek-reasoner",  // legacy alias
    ];
    if (!ALLOWED_MODELS.includes(safe.model)) {
      safe.model = "deepseek-v4-flash";
    }

    // Запрос к DeepSeek. 90с — щедрый таймаут на случай большого выхода.
    let upstream;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      upstream = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(safe),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === "AbortError") {
        return json({ error: "DeepSeek timed out after 90s. Попробуйте упростить описание." }, 504, corsHeaders);
      }
      return json({ error: "Upstream fetch failed: " + e.message }, 502, corsHeaders);
    }
    clearTimeout(timeout);

    // Если статус не 2xx — заворачиваем тело в наш JSON с пояснением.
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
  },
};

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(extraHeaders || {}),
    },
  });
}
