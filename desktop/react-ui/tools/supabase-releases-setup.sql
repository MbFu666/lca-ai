-- Supabase setup for the LCA AI Studio auto-update feed.
-- Run in Supabase SQL Editor (Dashboard -> SQL). Creates a PUBLIC bucket "releases"
-- and policies so the desktop publish script (anon key) can upload, and anyone can read.

-- 1) Bucket (public read)
insert into storage.buckets (id, name, public, file_size_limit)
values ('releases', 'releases', true, 524288000)   -- 500 MB per file (installer ~373 MB)
on conflict (id) do nothing;

-- 2) Public read (anyone, no auth) — required for electron-updater generic feed
create policy "releases public read"
  on storage.objects for select
  using (bucket_id = 'releases');

-- 3) Allow anon + authenticated upload into releases/win/ prefix (publish script)
create policy "releases upload anon"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'releases');

create policy "releases update anon"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'releases')
  with check (bucket_id = 'releases');

-- NOTE: If you prefer tighter security, replace policies 3 with service_role-only
-- and run tools/publish-release.ps1 with -Token <service_role key> instead of anon.
