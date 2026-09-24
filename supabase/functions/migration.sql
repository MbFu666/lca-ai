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

-- ══════════════════════════════════════════════════════════════
-- ИСПРАВЛЕНИЯ (найдено аудитом кабинета)
-- ══════════════════════════════════════════════════════════════

-- БАГ: кабинет пишет в user_projects.archived (кнопка 📦 архивации проекта),
-- фильтрует список по p.archived — но такой колонки не существует.
-- Архивация проектов не работала вообще: запись падала, p.archived всегда undefined.
alter table public.user_projects
  add column if not exists archived boolean not null default false;

create index if not exists user_projects_active_idx
  on public.user_projects (user_id, created_at desc)
  where archived = false;

-- БАГ: logAudit() пишет в audit_log, но таблицы нет.
-- Ошибка глотается в catch — журнал молча не ведётся с самого начала.
create table if not exists public.audit_log (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null,
  entity_type text,
  entity_id   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_user_idx
  on public.audit_log (user_id, created_at desc);

alter table public.audit_log enable row level security;

-- Журнал: пользователь может только дописывать и читать свои записи.
-- UPDATE/DELETE не даём никому — иначе журнал теряет смысл.
drop policy if exists "own audit insert" on public.audit_log;
create policy "own audit insert" on public.audit_log
  for insert with check (auth.uid() = user_id);

drop policy if exists "own audit read" on public.audit_log;
create policy "own audit read" on public.audit_log
  for select using (auth.uid() = user_id);

-- ── Версии расчётов: связь «вариант → родитель» ───────────────
-- Кнопка «Создать вариант» копирует описание, но связи между
-- вариантами не сохранялось — сравнить V3 и V4 было нельзя.
alter table public.user_history
  add column if not exists parent_id uuid references public.user_history(id) on delete set null;

create index if not exists user_history_parent_idx
  on public.user_history (parent_id);

-- ══════════════════════════════════════════════════════════════
-- СОВМЕСТНЫЙ ДОСТУП: роль ссылки (чтение / редактирование)
-- ══════════════════════════════════════════════════════════════

alter table public.share_links
  -- 'view' по умолчанию: право на запись выдаётся только явно
  add column if not exists role text not null default 'view'
    check (role in ('view', 'edit')),
  -- кто в последний раз правил по этой ссылке (для журнала и для UI)
  add column if not exists last_edited_by uuid references auth.users(id) on delete set null,
  add column if not exists last_edited_at timestamptz;

-- ВАЖНО: RLS на user_history НЕ ослабляем.
-- Запись по ссылке идёт через Edge Function share-edit под service_role,
-- которая сама проверяет токен, роль, срок и авторизацию редактора.
-- Если бы мы вместо этого написали RLS-политику «можно писать, если есть
-- share_link с role=edit», то любой владелец anon-ключа мог бы писать
-- в чужие строки, зная лишь id — а id утекает в самой ссылке.

-- Atomic share-view counter (fixes lost-update race, review #19).
create or replace function increment_share_views(link_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update share_links
     set views = coalesce(views,0) + 1,
         last_viewed_at = now()
   where id = link_id;
$$;
