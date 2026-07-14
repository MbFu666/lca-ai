// supabase/functions/send-share-email/index.ts
//
// Реально отправляет письмо со ссылкой на расшаренный проект/расчёт.
// До этого клиент просто писал строку в project_shares и показывал
// «Приглашение отправлено» — письмо не уходило никогда.
//
// Требует секрет RESEND_API_KEY:
//   supabase secrets set RESEND_API_KEY=re_xxx
// Домен-отправитель должен быть верифицирован в Resend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://lca-ai.ru",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM = "LCA·AI <noreply@lca-ai.ru>";
const SITE = "https://lca-ai.ru";

function esc(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
  ));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...cors, "Content-Type": "application/json" },
    });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ error: "email_not_configured" }, 501);

  // ── Кто отправляет: только авторизованный пользователь ──
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!auth) return json({ error: "unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user }, error: uErr } = await admin.auth.getUser(auth);
  if (uErr || !user) return json({ error: "unauthorized" }, 401);

  let body: { kind?: string; target_id?: string; email?: string; expires_days?: number; role?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const { kind, target_id, email } = body;
  if (!kind || !target_id || !email) return json({ error: "missing_fields" }, 400);
  if (!["project", "history"].includes(kind)) return json({ error: "bad_kind" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "bad_email" }, 400);

  // ── Владение: нельзя расшарить чужое ──
  const table = kind === "project" ? "user_projects" : "user_history";
  const { data: owned } = await admin
    .from(table).select("id, user_id").eq("id", target_id).maybeSingle();
  if (!owned || owned.user_id !== user.id) return json({ error: "forbidden" }, 403);

  const title = kind === "project"
    ? (await admin.from("user_projects").select("name").eq("id", target_id).maybeSingle()).data?.name
    : (await admin.from("user_history").select("product_title").eq("id", target_id).maybeSingle()).data?.product_title;

  // ── Токен ──
  const token = crypto.randomUUID();
  const days = Math.min(Math.max(Number(body.expires_days) || 30, 1), 365);
  const expires = new Date(Date.now() + days * 864e5).toISOString();

  /* Право записи выдаётся только явно и только для отдельных расчётов.
     Проекты — всегда read-only: совместная правка проекта требует другой
     модели разрешения конфликтов, и обещать её, не реализовав, нельзя. */
  const role = (body.role === "edit" && kind === "history") ? "edit" : "view";

  const { error: insErr } = await admin.from("share_links").insert({
    token, kind, target_id, owner_id: user.id,
    shared_email: email, expires_at: expires, role,
  });
  if (insErr) return json({ error: insErr.message }, 500);

  const link = `${SITE}/share.html?token=${token}`;
  const sender = user.user_metadata?.full_name || user.email;

  // ── Письмо ──
  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1C1B19">
      <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9B978F;padding-bottom:16px;border-bottom:1px solid #D6D2CB">
        LCA&middot;AI &mdash; оценка жизненного цикла
      </div>
      <p style="font-size:16px;line-height:1.6;margin:24px 0 8px">
        ${esc(sender)} делится с вами ${kind === "project" ? "проектом" : "расчётом"} углеродного следа:
      </p>
      <p style="font-size:20px;font-weight:bold;margin:0 0 24px">${esc(title || "—")}</p>
      <a href="${link}" style="display:inline-block;background:#1C1B19;color:#F2F0EC;padding:13px 28px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:1px;text-transform:uppercase">
        Открыть отчёт
      </a>
      <p style="font-size:12px;color:#6B6862;margin-top:28px;line-height:1.6">
        ${role === "edit"
          ? "Ссылка даёт право редактировать расчёт — потребуется вход в аккаунт."
          : "Ссылка доступна только для чтения."}
        Она перестанет работать через ${days} дн.
        Если вы не ожидали это письмо — просто проигнорируйте его.
      </p>
    </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject: `${sender} делится расчётом углеродного следа`,
      html,
    }),
  });

  if (!r.ok) {
    const detail = await r.text();
    // ссылка уже создана — отдаём её, чтобы отправитель мог передать вручную
    return json({ error: "send_failed", detail, link }, 502);
  }

  return json({ ok: true, link, expires_at: expires });
});
