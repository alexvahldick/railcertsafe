create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.user_client_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  role text not null check (role in ('manager', 'client_administrator')),
  created_at timestamptz not null default now(),
  unique (user_id, client_id, role)
);

create table if not exists public.client_settings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  allow_submit_before_notification boolean not null default true,
  require_notification_before_final_completion boolean not null default false,
  hold_inactive_employee_events boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  employee_number text not null,
  first_name text not null,
  last_name text not null,
  middle_initial text null,
  suffix text null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, employee_number)
);

create table if not exists public.employee_certification_classes (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  class_code text not null,
  class_name text not null,
  regulatory_part text null,
  status text not null default 'active' check (status in ('active', 'inactive', 'expired')),
  issue_date date null,
  expiration_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, class_code)
);

create table if not exists public.client_locations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (client_id, name)
);

create table if not exists public.client_test_managers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  employee_id uuid null references public.employees(id) on delete set null,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.client_lookup_values (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  lookup_type text not null,
  label text not null,
  value text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  is_program_controlled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.master_test_catalog (
  id uuid primary key default gen_random_uuid(),
  test_number integer not null unique,
  task_name text not null,
  applicability_label text not null,
  category_code text not null,
  qualifies_conductor_annual boolean not null default false,
  qualifies_engineer_annual boolean not null default false,
  qualifies_engineer_check_ride boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.client_enabled_tests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  master_test_id uuid not null references public.master_test_catalog(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (client_id, master_test_id)
);

create table if not exists public.testing_events (
  id uuid primary key default gen_random_uuid(),
  control_number text not null unique,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  last_saved_by uuid not null references auth.users(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  manager_1_id uuid null references public.client_test_managers(id) on delete restrict,
  manager_2_id uuid null references public.client_test_managers(id) on delete restrict,
  location_id uuid null references public.client_locations(id) on delete restrict,
  sub_location text null,
  engine_number text null,
  job_id text null,
  method_lookup_id uuid null references public.client_lookup_values(id) on delete restrict,
  observation_type_lookup_id uuid null references public.client_lookup_values(id) on delete restrict,
  duty_lookup_id uuid null references public.client_lookup_values(id) on delete restrict,
  event_date date not null,
  event_time text null,
  conditions text[] not null default '{}',
  general_comments text null,
  status text not null check (
    status in (
      'draft',
      'review_hold_employee_status',
      'submitted_notification_pending',
      'submitted_complete',
      'correction_requested',
      'amended_effective'
    )
  ),
  notification_status text not null default 'pending' check (notification_status in ('pending', 'completed')),
  notification_method_lookup_id uuid null references public.client_lookup_values(id) on delete restrict,
  certification_submitted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testing_event_test_rows (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.testing_events(id) on delete cascade,
  client_enabled_test_id uuid not null references public.client_enabled_tests(id) on delete restrict,
  result text null check (result in ('pass', 'fail')),
  action_lookup_id uuid null references public.client_lookup_values(id) on delete restrict,
  comments text null,
  row_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.event_corrections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.testing_events(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid null references auth.users(id) on delete restrict,
  reason text not null,
  admin_notes text null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_dispositions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.testing_events(id) on delete cascade,
  event_test_row_id uuid null references public.testing_event_test_rows(id) on delete cascade,
  disposition_type text not null check (disposition_type in ('notification', 'failure_follow_up')),
  created_by uuid not null references auth.users(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists employees_client_status_idx on public.employees (client_id, status, last_name, first_name);
create index if not exists employee_certifications_employee_idx on public.employee_certification_classes (employee_id, class_code);
create index if not exists client_locations_client_idx on public.client_locations (client_id, active);
create index if not exists client_lookup_values_client_type_idx on public.client_lookup_values (client_id, lookup_type, active, sort_order);
create index if not exists client_test_managers_client_idx on public.client_test_managers (client_id, active, display_name);
create index if not exists testing_events_client_status_idx on public.testing_events (client_id, status, event_date desc, created_at desc);
create index if not exists testing_events_employee_idx on public.testing_events (employee_id, event_date desc);
create index if not exists testing_event_rows_event_idx on public.testing_event_test_rows (event_id, row_order);
create index if not exists event_corrections_event_idx on public.event_corrections (event_id, status, created_at desc);
create index if not exists event_dispositions_event_idx on public.event_dispositions (event_id, created_at desc);

alter table public.clients enable row level security;
alter table public.user_client_roles enable row level security;
alter table public.client_settings enable row level security;
alter table public.employees enable row level security;
alter table public.employee_certification_classes enable row level security;
alter table public.client_locations enable row level security;
alter table public.client_test_managers enable row level security;
alter table public.client_lookup_values enable row level security;
alter table public.master_test_catalog enable row level security;
alter table public.client_enabled_tests enable row level security;
alter table public.testing_events enable row level security;
alter table public.testing_event_test_rows enable row level security;
alter table public.event_corrections enable row level security;
alter table public.event_dispositions enable row level security;
