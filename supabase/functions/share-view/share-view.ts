// supabase/functions/share-view/index.ts
//
// Отдаёт проект или расчёт по публичному токену.
//
// Почему Edge Function, а не прямой запрос из браузера:
// чтобы отдать данные анониму, пришлось бы ослабить RLS на user_projects /
// project_calculations. Вместо этого функция сама проверяет токен и читает
// данные под service_role — RLS остаётся жёстким, наружу торчит только то,
// что явно расшарено, и только пока ссылка не отозвана.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://lca-ai.ru",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {

  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return new Response(JSON.stringify({ error: "token required" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  /* Клиент создаём ВНУТРИ обработчика, а не на верхнем уровне.
     Если создавать снаружи и переменная окружения не задана, функция падает
     при старте — а шлюз тогда отвечает БЕЗ CORS-заголовков, и в браузере
     это выглядит как «No Access-Control-Allow-Origin», хотя настоящая
     причина совсем другая. Внутри же мы можем вернуть внятную ошибку
     с правильными заголовками. */
  const SB_URL = Deno.env.get("SUPABASE_URL");
  const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SB_URL || !SB_SERVICE) {
    return new Response(
      JSON.stringify({ error: "server_misconfigured", detail: "SUPABASE_SERVICE_ROLE_KEY is not set" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(SB_URL, SB_SERVICE);

  // 1) Токен: существует, не отозван, не истёк
  const { data: share, error: sErr } = await admin
    .from("share_links")
    .select("*")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();

  if (sErr || !share) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: "expired" }), {
      status: 410, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // 2) Данные
  let payload: unknown = null;

  if (share.kind === "history") {
    const { data } = await admin
      .from("user_history")
      .select("id, product_title, functional_unit, total_co2eq, report_data, created_at")
      .eq("id", share.target_id)
      .maybeSingle();
    payload = { kind: "history", item: data, role: share.role || "view" };
  } else if (share.kind === "project") {
    const { data: project } = await admin
      .from("user_projects")
      .select("id, name, created_at, target_pct, target_date, baseline_co2")
      .eq("id", share.target_id)
      .maybeSingle();
    const { data: calcs } = await admin
      .from("project_calculations")
      .select("id, report_data, created_at")
      .eq("project_id", share.target_id)
      .order("created_at", { ascending: true });
    // Проекты редактировать по ссылке нельзя — только отдельные расчёты.
    // Совместная правка целого проекта требует другой модели конфликтов.
    payload = { kind: "project", project, calculations: calcs || [], role: "view" };
  }

  if (!payload) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // 3) Счётчик просмотров (не блокируем ответ, если не записалось)
  admin.from("share_links")
    .update({ views: (share.views || 0) + 1, last_viewed_at: new Date().toISOString() })
    .eq("id", share.id)
    .then(() => {});

  return new Response(JSON.stringify(payload), {
    headers: { ...cors, "Content-Type": "application/json" },
  });

  } catch (e) {
    /* Любая неожиданная ошибка тоже должна вернуться с CORS-заголовками.
       Иначе браузер покажет «No Access-Control-Allow-Origin» и настоящая
       причина останется невидимой — ровно та ловушка, на которой мы застряли. */
    return new Response(
      JSON.stringify({ error: "internal", detail: String((e as Error)?.message || e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
