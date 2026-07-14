-- ══════════════════════════════════════════════════════════════
-- LCA·AI — миграция под новые функции кабинета
-- Выполнить в Supabase → SQL Editor
-- Безопасно: только ADD COLUMN IF NOT EXISTS, существующие данные не трогаются
-- ══════════════════════════════════════════════════════════════

-- ── Заметки, теги, мягкое удаление ────────────────────────────
alter table public.user_history
  add column if not exists notes       text,
  add column if not exists tags        text[] default '{}',
  add column if not exists archived_at timestamptz;

-- Частичный индекс: активные записи (архивные почти не запрашиваются)
create index if not exists user_history_active_idx
  on public.user_history (user_id, created_at desc)
  where archived_at is null;

-- Поиск по тегам
create index if not exists user_history_tags_idx
  on public.user_history using gin (tags);

-- ── Цель по снижению в проекте ────────────────────────────────
alter table public.user_projects
  add column if not exists target_pct  numeric,   -- напр. 20 = снизить след на 20%
  add column if not exists target_date date,      -- к какой дате
  add column if not exists baseline_co2 numeric;  -- база отсчёта (kgCO2e)

-- ══════════════════════════════════════════════════════════════
-- ПРОВЕРЬТЕ RLS! Без политик ниже anon-ключом читаются чужие данные.
-- Если политики уже настроены — этот блок можно пропустить.
-- ══════════════════════════════════════════════════════════════

alter table public.user_history        enable row level security;
alter table public.user_projects       enable row level security;
alter table public.project_calculations enable row level security;

drop policy if exists "own history" on public.user_history;
create policy "own history" on public.user_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own projects" on public.user_projects;
create policy "own projects" on public.user_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- project_calculations не имеет user_id — проверяем через владельца проекта
drop policy if exists "own project calcs" on public.project_calculations;
create policy "own project calcs" on public.project_calculations
  for all using (
    exists (
      select 1 from public.user_projects p
      where p.id = project_calculations.project_id
        and p.user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════
-- Публичные ссылки (страница share.html + отправка по email)
-- ══════════════════════════════════════════════════════════════

create table if not exists public.share_links (
  id             uuid primary key default gen_random_uuid(),
  token          uuid not null unique default gen_random_uuid(),
  kind           text not null check (kind in ('project','history')),
  target_id      uuid not null,
  owner_id       uuid not null references auth.users(id) on delete cascade,
  shared_email   text,
  expires_at     timestamptz,
  revoked_at     timestamptz,
  views          int  not null default 0,
  last_viewed_at timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists share_links_token_idx on public.share_links (token);
create index if not exists share_links_owner_idx on public.share_links (owner_id, created_at desc);

alter table public.share_links enable row level security;

-- Владелец управляет только своими ссылками.
-- Анонимный доступ к таблице НЕ открываем: страница share.html ходит
-- через Edge Function share-view, которая проверяет токен под service_role.
-- Так RLS остаётся жёстким, а наружу торчит только явно расшаренное.
drop policy if exists "own share links" on public.share_links;
create policy "own share links" on public.share_links
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
