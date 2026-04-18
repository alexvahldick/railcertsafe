create table if not exists public.event_amendments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.testing_events(id) on delete cascade,
  correction_id uuid null references public.event_corrections(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  reason text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists event_amendments_event_idx on public.event_amendments (event_id, created_at desc);

alter table public.event_amendments enable row level security;
