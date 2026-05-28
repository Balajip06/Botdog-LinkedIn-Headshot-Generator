-- Migration 0007 — storage buckets + policies
-- Per amended plan §"Architecture" — uploads (user inputs) + outputs (generated).
-- Idempotent: re-running `supabase db reset` won't error.

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('outputs', 'outputs', true)
on conflict (id) do nothing;

-- uploads: each user writes/reads only their own folder uploads/{user_id}/...
create policy "uploads_self_insert" on storage.objects
  for insert with check (
    bucket_id = 'uploads'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "uploads_self_read" on storage.objects
  for select using (
    bucket_id = 'uploads'
    and (
      auth.role() = 'service_role'
      or (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

create policy "uploads_self_delete" on storage.objects
  for delete using (
    bucket_id = 'uploads'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- outputs: public read for share links + OG previews; only service_role writes
create policy "outputs_public_read" on storage.objects
  for select using (bucket_id = 'outputs');

create policy "outputs_service_write" on storage.objects
  for insert with check (
    bucket_id = 'outputs'
    and auth.role() = 'service_role'
  );

create policy "outputs_service_delete" on storage.objects
  for delete using (
    bucket_id = 'outputs'
    and auth.role() = 'service_role'
  );
