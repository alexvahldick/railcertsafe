# RailCertSafe

RailCertSafe is being rebuilt as a stable Next.js + Supabase application for railroad compliance, certification, and operational testing workflows.

The current active slice is `Operations Testing` for Part 217.9, built around:

- public landing page
- signup and login
- protected dashboard
- first-run master-admin bootstrap flow
- employee and certification-class maintenance
- paper-mirroring operational testing entry
- draft/save/submit workflow
- immutable certified event records
- correction-request and review queue foundations
- printable full-form event detail view

## Current routes

- `/`
- `/login`
- `/signup`
- `/dashboard`
- `/employees`
- `/testing/new`
- `/testing/[id]`
- `/admin/intake`

## Required environment variables

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAILS=admin@example.com,ops@example.com
```

Notes:

- `ADMIN_EMAILS` is required for server-only admin gating.

## Local development

```bash
npm install
npm run verify
npm run dev
```

Open `http://localhost:3000`.

`npm run verify` checks required env vars, verifies the configured Supabase project state, builds the app, and runs TypeScript validation.

## Supabase setup

Run the SQL files in order:

1. `legacy/prototype-2026-04-16/sql/001_documents.sql` if the project is brand new and has no document table yet.
2. `sql/002_vertical_slice_restart.sql` to normalize the schema for the rebuilt app.
3. `sql/003_operations_testing_phase1.sql` to add the operations testing foundation.
4. `sql/004_operations_testing_amendments.sql` to enable admin-applied amendments on certified testing records.
5. `sql/005_operations_testing_rls.sql` to add read-scoped RLS policies for the operations-testing tables.

The current operations testing slice expects:

- the existing `documents` bucket/table from the earlier slice to remain available
- the operations testing tables from `sql/003_operations_testing_phase1.sql`
- the amendment table from `sql/004_operations_testing_amendments.sql` if you want correction requests to be converted into approved effective-record amendments in the UI
- the read-scoped RLS policies from `sql/005_operations_testing_rls.sql` for database-enforced member visibility on operations data
- a master administrator email present in `ADMIN_EMAILS` for first-run bootstrap

After the SQL is applied:

1. sign in as the master administrator
2. open `/dashboard`
3. initialize the first client workspace
4. maintain employees/certification classes under `/employees`
5. enter testing events under `/testing/new`

After the SQL is applied, verify the remote project with:

```bash
npm run check:supabase
```

If you later configure Supabase CLI auth on this machine, you can also automate remote migrations through the CLI. Until then, `npm run check:supabase` gives a direct pass/fail check against the configured project using the service-role key in `.env.local`.

## Legacy reference

The previous implementation is preserved at:

- `legacy/prototype-2026-04-16/src`
- `legacy/prototype-2026-04-16/sql`

That snapshot is reference material only. The active app now lives under `src`.
