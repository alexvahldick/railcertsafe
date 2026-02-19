create extension if not exists "pgcrypto";

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  doc_type text not null default 'unknown',
  storage_path text not null,
  original_filename text not null,
  status text not null default 'received' check (status in ('received', 'needs_review', 'processed', 'rejected')),
  notes text null
);

create index if not exists documents_uploaded_by_idx on public.documents (uploaded_by);
create index if not exists documents_status_idx on public.documents (status);
create index if not exists documents_created_at_idx on public.documents (created_at);

alter table public.documents enable row level security;

drop policy if exists documents_select_own on public.documents;
create policy documents_select_own
  on public.documents
  for select
  to authenticated
  using (auth.uid() = uploaded_by);

drop policy if exists documents_insert_own on public.documents;
create policy documents_insert_own
  on public.documents
  for insert
  to authenticated
  with check (auth.uid() = uploaded_by);

-- Storage policies for private bucket access (upload + list own files).
drop policy if exists documents_storage_insert_own on storage.objects;
create policy documents_storage_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'documents' and auth.uid() = owner);

drop policy if exists documents_storage_select_own on storage.objects;
create policy documents_storage_select_own
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'documents' and auth.uid() = owner);
