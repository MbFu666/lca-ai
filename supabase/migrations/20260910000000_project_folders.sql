-- LCA·AI — папки для облачных проектов
-- Идемпотентно: CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

create table if not exists public.project_folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create index if not exists project_folders_user_idx
  on public.project_folders (user_id, created_at);

alter table public.project_folders enable row level security;

drop policy if exists "own folders" on public.project_folders;
create policy "own folders" on public.project_folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.user_projects
  add column if not exists folder_id uuid references public.project_folders(id) on delete set null;

create index if not exists user_projects_folder_idx
  on public.user_projects (folder_id);
