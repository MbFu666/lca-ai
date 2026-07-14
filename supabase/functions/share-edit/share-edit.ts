// supabase/functions/share-edit/index.ts
//
// Запись в расчёт, открытый по ссылке с ролью 'edit'.
//
// Почему через Edge Function, а не через RLS-политику:
// напрашивается политика вида «разрешить UPDATE, если существует share_link
// с role=edit на эту строку». Но такая политика открыла бы запись ЛЮБОМУ,
// у кого есть anon-ключ и id строки — а id лежит прямо в ссылке. То есть
// достаточно один раз увидеть ссылку, чтобы потом писать в чужую запись
// напрямую в REST API, минуя всякий токен.
//
// Поэтому RLS остаётся жёстким (владелец и только владелец), а запись идёт
// сюда: функция под service_role сама проверяет токен, роль, срок, отзыв
// и личность редактора — и только потом пишет.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://lca-ai.ru",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const SB_URL = Deno.env.get("SUPABASE_URL");
    const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SB_URL || !SB_SERVICE) {
      return json({ error: "server_misconfigured" }, 500);
    }
    const admin = createClient(SB_URL, SB_SERVICE);

    // ── 1. Редактор обязан быть авторизован.
    //    Анонимная правка по ссылке недопустима: утечка ссылки означала бы
    //    порчу чужих данных без единого следа о том, кто это сделал.
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) return json({ error: "auth_required" }, 401);

    const { data: { user }, error: uErr } = await admin.auth.getUser(jwt);
    if (uErr || !user) return json({ error: "auth_required" }, 401);

    let body: { token?: string; report_data?: Record<string, unknown>; calc_id?: string };
    try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

    const { token, report_data, calc_id } = body;
    if (!token || !report_data) return json({ error: "missing_fields" }, 400);

    // ── 2. Ссылка: существует, не отозвана, не истекла, даёт право записи
    const { data: share } = await admin
      .from("share_links")
      .select("*")
      .eq("token", token)
      .is("revoked_at", null)
      .maybeSingle();

    if (!share) return json({ error: "not_found" }, 404);
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return json({ error: "expired" }, 410);
    }
    if (share.role !== "edit") return json({ error: "read_only" }, 403);

    // ── 3. Если ссылка выписана на конкретный email — только этот человек.
    //    Ссылка без адреса (созданная кнопкой «Создать ссылку») работает
    //    для любого авторизованного: так решил владелец, выдав роль edit.
    if (share.shared_email &&
        String(share.shared_email).toLowerCase() !== String(user.email).toLowerCase()) {
      return json({ error: "not_your_invite" }, 403);
    }

    // ── 4. Пересчитываем итог на сервере.
    //    Клиенту тут доверять нельзя: он мог прислать любое total_co2eq.
    //    Считаем сами из amount × factor — единственный источник правды.
    const stages = Array.isArray((report_data as any).stages) ? (report_data as any).stages : [];
    let total = 0;
    for (const st of stages) {
      let stageSum = 0;
      for (const sp of (st.sub_processes || [])) {
        const amount = Number(sp.amount) || 0;
        const factor = Number(sp.factor) || 0;
        sp.co2eq = amount * factor;
        stageSum += sp.co2eq;
      }
      st.co2eq = stageSum;
      total += stageSum;
    }
    for (const st of stages) {
      st.share_pct = total ? (st.co2eq / total) * 100 : 0;
    }
    (report_data as any).total_co2eq = total;

    // ── 5. Запись — в зависимости от того, что расшарено
    if (share.kind === "history") {
      const { error: wErr } = await admin
        .from("user_history")
        .update({
          report_data,
          total_co2eq: total,
          product_title: (report_data as any).product_title ?? undefined,
        })
        .eq("id", share.target_id);
      if (wErr) return json({ error: wErr.message }, 500);

    } else if (share.kind === "project") {
      // Правим КОНКРЕТНЫЙ расчёт внутри проекта, а не проект целиком.
      if (!calc_id) return json({ error: "calc_id_required" }, 400);

      /* Расчёт обязан принадлежать именно этому проекту. Без проверки
         владелец edit-ссылки на свой проект мог бы прислать чужой calc_id
         и переписать расчёт в чужом проекте. */
      const { data: calc } = await admin
        .from("project_calculations")
        .select("id, project_id")
        .eq("id", calc_id)
        .maybeSingle();

      if (!calc || String(calc.project_id) !== String(share.target_id)) {
        return json({ error: "calc_not_in_project" }, 403);
      }

      const { error: wErr } = await admin
        .from("project_calculations")
        .update({ report_data })
        .eq("id", calc_id);
      if (wErr) return json({ error: wErr.message }, 500);

    } else {
      return json({ error: "unsupported_kind" }, 400);
    }

    await admin.from("share_links")
      .update({ last_edited_by: user.id, last_edited_at: new Date().toISOString() })
      .eq("id", share.id);

    // ── 6. Журнал: правку по чужой ссылке должно быть видно владельцу
    await admin.from("audit_log").insert({
      user_id: share.owner_id,           // пишем в журнал ВЛАДЕЛЬЦА
      action: "share_edit",
      entity_type: share.kind,
      entity_id: String(calc_id || share.target_id),
      details: {
        editor_id: user.id,
        editor_email: user.email,
        new_total: total,
        project_id: share.kind === "project" ? share.target_id : undefined,
      },
    });

    return json({ ok: true, total_co2eq: total });
  } catch (e) {
    return json({ error: "internal", detail: String((e as Error)?.message || e) }, 500);
  }
});
