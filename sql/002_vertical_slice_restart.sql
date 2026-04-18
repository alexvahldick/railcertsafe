create extension if not exists "pgcrypto";

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  doc_type text not null default 'unknown',
  storage_path text not null,
  original_filename text not null,
  status text not null default 'received',
  notes text null
);

alter table public.documents
  add column if not exists updated_at timestamptz null;

do $$
declare
  current_constraint text;
begin
  select conname
  into current_constraint
  from pg_constraint
  where conrelid = 'public.documents'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';

  if current_constraint is not null then
    execute format('alter table public.documents drop constraint %I', current_constraint);
  end if;
end $$;

update public.documents
set status = case lower(status)
  when 'received' then 'received'
  when 'extracting' then 'pending'
  when 'pending' then 'pending'
  when 'needs_review' then 'needs_review'
  when 'processed' then 'validated'
  when 'validated' then 'validated'
  when 'rejected' then 'failed'
  when 'failed' then 'failed'
  else 'received'
end
where status is not null;

alter table public.documents
  alter column status set default 'received';

alter table public.documents
  add constraint documents_status_check
  check (status in ('received', 'pending', 'needs_review', 'validated', 'failed'));

create index if not exists documents_uploaded_by_idx on public.documents (uploaded_by);
create index if not exists documents_status_idx on public.documents (status);
create index if not exists documents_created_at_idx on public.documents (created_at desc);

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
