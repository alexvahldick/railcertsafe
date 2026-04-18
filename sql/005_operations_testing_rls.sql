create or replace function public.is_client_member(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_client_roles role
    where role.user_id = auth.uid()
      and role.client_id = target_client_id
  );
$$;

revoke all on function public.is_client_member(uuid) from public;
grant execute on function public.is_client_member(uuid) to authenticated;

drop policy if exists clients_select_member on public.clients;
create policy clients_select_member
  on public.clients
  for select
  to authenticated
  using (public.is_client_member(id));

drop policy if exists user_client_roles_select_own on public.user_client_roles;
create policy user_client_roles_select_own
  on public.user_client_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists client_settings_select_member on public.client_settings;
create policy client_settings_select_member
  on public.client_settings
  for select
  to authenticated
  using (public.is_client_member(client_id));

drop policy if exists employees_select_member on public.employees;
create policy employees_select_member
  on public.employees
  for select
  to authenticated
  using (public.is_client_member(client_id));

drop policy if exists employee_certifications_select_member on public.employee_certification_classes;
create policy employee_certifications_select_member
  on public.employee_certification_classes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.employees employee
      where employee.id = employee_certification_classes.employee_id
        and public.is_client_member(employee.client_id)
    )
  );

drop policy if exists client_locations_select_member on public.client_locations;
create policy client_locations_select_member
  on public.client_locations
  for select
  to authenticated
  using (public.is_client_member(client_id));

drop policy if exists client_test_managers_select_member on public.client_test_managers;
create policy client_test_managers_select_member
  on public.client_test_managers
  for select
  to authenticated
  using (public.is_client_member(client_id));

drop policy if exists client_lookup_values_select_member on public.client_lookup_values;
create policy client_lookup_values_select_member
  on public.client_lookup_values
  for select
  to authenticated
  using (public.is_client_member(client_id));

drop policy if exists master_test_catalog_select_authenticated on public.master_test_catalog;
create policy master_test_catalog_select_authenticated
  on public.master_test_catalog
  for select
  to authenticated
  using (true);

drop policy if exists client_enabled_tests_select_member on public.client_enabled_tests;
create policy client_enabled_tests_select_member
  on public.client_enabled_tests
  for select
  to authenticated
  using (public.is_client_member(client_id));

drop policy if exists testing_events_select_member on public.testing_events;
create policy testing_events_select_member
  on public.testing_events
  for select
  to authenticated
  using (public.is_client_member(client_id));

drop policy if exists testing_event_rows_select_member on public.testing_event_test_rows;
create policy testing_event_rows_select_member
  on public.testing_event_test_rows
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.testing_events event
      where event.id = testing_event_test_rows.event_id
        and public.is_client_member(event.client_id)
    )
  );

drop policy if exists event_corrections_select_member on public.event_corrections;
create policy event_corrections_select_member
  on public.event_corrections
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.testing_events event
      where event.id = event_corrections.event_id
        and public.is_client_member(event.client_id)
    )
  );

drop policy if exists event_dispositions_select_member on public.event_dispositions;
create policy event_dispositions_select_member
  on public.event_dispositions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.testing_events event
      where event.id = event_dispositions.event_id
        and public.is_client_member(event.client_id)
    )
  );

drop policy if exists event_amendments_select_member on public.event_amendments;
create policy event_amendments_select_member
  on public.event_amendments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.testing_events event
      where event.id = event_amendments.event_id
        and public.is_client_member(event.client_id)
    )
  );

alter table public.clients force row level security;
alter table public.user_client_roles force row level security;
alter table public.client_settings force row level security;
alter table public.employees force row level security;
alter table public.employee_certification_classes force row level security;
alter table public.client_locations force row level security;
alter table public.client_test_managers force row level security;
alter table public.client_lookup_values force row level security;
alter table public.master_test_catalog force row level security;
alter table public.client_enabled_tests force row level security;
alter table public.testing_events force row level security;
alter table public.testing_event_test_rows force row level security;
alter table public.event_corrections force row level security;
alter table public.event_dispositions force row level security;
alter table public.event_amendments force row level security;
