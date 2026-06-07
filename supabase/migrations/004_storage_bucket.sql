-- Migration 004 — Supabase Storage bucket for asset documents
-- Paste into Supabase SQL Editor → Run

-- Create the bucket (public read, anyone can upload)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'asset-documents',
  'asset-documents',
  true,
  10485760,  -- 10MB per file
  array['application/pdf','image/jpeg','image/png','image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

-- Allow anon/authenticated users to upload
create policy "anon_upload_asset_docs"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'asset-documents');

-- Allow public read
create policy "public_read_asset_docs"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'asset-documents');

-- Verify
select id, name, public from storage.buckets where id = 'asset-documents';
