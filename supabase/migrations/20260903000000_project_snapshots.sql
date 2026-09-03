-- LCA·AI — облачные проекты: полные снимки баз с историей версий
-- Идемпотентно: только ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS

-- История снимков проекта (каждое сохранение = новая версия)
create table if not exists public.project_snapshots (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.user_projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  version    int  not null,
  entities   jsonb not null default '{}'::jsonb,
  stats      jsonb,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists project_snapshots_project_idx
  on public.project_snapshots (project_id, version desc);
create index if not exists user_snapshots_user_idx
  on public.project_snapshots (user_id, created_at desc);

alter table public.project_snapshots enable row level security;

drop policy if exists "own snapshots" on public.project_snapshots;
create policy "own snapshots" on public.project_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Связь опубликованных отчётов с проектом
alter table public.user_history
  add column if not exists project_id uuid references public.user_projects(id) on delete set null;

create index if not exists user_history_project_idx
  on public.user_history (project_id);

-- Имя исходной локальной базы проекта
alter table public.user_projects
  add column if not exists db_name text;
