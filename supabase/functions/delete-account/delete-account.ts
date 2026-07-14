// supabase/functions/delete-account/index.ts
//
// Реально удаляет auth-пользователя. Из браузера это невозможно —
// нужен service_role. Без этой функции кнопка «Удалить аккаунт» чистила
// только таблицы, а сам аккаунт оставался жить: тот же email потом
// не мог зарегистрироваться заново, хотя интерфейс обещал
// «удалить все данные безвозвратно».

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
      status, headers: { ...cors, "Content-Type": "application/json" },
    });

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY")!,
  );

  // Пользователь удаляет ТОЛЬКО сам себя — id берём из его же JWT,
  // а не из тела запроса.
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return json({ error: "unauthorized" }, 401);

  // Данные (на случай, если клиент не успел / упал на полпути)
  await admin.from("share_links").delete().eq("owner_id", user.id);
  await admin.from("project_calculations").delete().eq("user_id", user.id);
  await admin.from("user_projects").delete().eq("user_id", user.id);
  await admin.from("user_history").delete().eq("user_id", user.id);

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return json({ error: delErr.message }, 500);

  return json({ ok: true });
});
