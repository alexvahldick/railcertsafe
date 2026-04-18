# Sensitive Document Intake Security Notes

This project is expected to later handle documents such as:

- driver history / motor vehicle records
- hearing and vision exam forms
- Part 240 / 242 certification support documents
- employee training and evaluation records

These records should be treated as sensitive, even if the system is not formally positioned as a HIPAA workflow.

## Current posture

The current rebuild has these foundations:

- private Supabase storage bucket for documents
- signed URL access instead of public object URLs
- service-role key kept server-side only
- app-level client scoping on operations-testing mutations
- read-scoped RLS migration prepared for operations-testing tables
- no-store headers on sensitive auth/admin responses
- same-origin checks on mutation routes

## Required next-step design before broad sensitive uploads

### 1. Separate document metadata from user-owned uploads

The current `documents` table is still a simpler legacy intake model keyed primarily to `uploaded_by`.

Before onboarding sensitive client records at scale, introduce a richer model:

- `document_records`
- `document_versions`
- `document_access_logs`
- `document_retention_rules`
- `document_assignments`

Each document should be tied to:

- client
- employee
- document classification
- sensitivity level
- uploader
- current processing state

### 2. Store client and employee linkage directly on document metadata

Do not rely only on `uploaded_by`.

Sensitive documents should be queryable and enforceable by:

- client
- employee
- document class
- status
- retention rule

### 3. Access logging should be mandatory

For sensitive documents, log:

- who requested access
- when
- which document/version
- whether access was preview/download/sign-url generation
- originating IP and user agent if available

### 4. Signed URLs should stay short-lived

Guidance:

- admin preview URLs: 1 to 5 minutes
- no long-lived links
- no reusable public links

### 5. Private buckets only

Sensitive document buckets should never be public.

Recommended eventual storage split:

- `documents-intake`
- `documents-sensitive`
- `documents-derived`

This allows stricter policies by category.

### 6. Content-type and size restrictions

Recommended production restrictions:

- allowlist file types only
- max size tuned by document class
- malware scanning hook before final acceptance if feasible

### 7. Retention and purge policy

Before storing sensitive records, define:

- minimum retention period
- purge trigger
- legal hold override
- client termination behavior

Purge operations should be audit logged.

### 8. Avoid browser-direct broad listing

Do not expose broad document listing from browser clients for sensitive datasets.

Preferred pattern:

- browser requests filtered server route
- server applies role/client/employee scoping
- server returns minimal metadata

### 9. Principle of least privilege

Recommended eventual permission split:

- employee: own assigned forms only
- manager: only records needed for direct supervisory/testing duties
- client admin: client-level operations records
- master admin: consulting/audit access

### 10. Encryption and secrets handling

Current baseline:

- HTTPS in transit
- Render env vars for secrets
- service role key not shipped to client

Recommended later:

- documented key rotation procedure
- separate staging/prod Supabase projects
- secrets inventory and rotation calendar

## Recommended implementation order

1. Add database-backed document access logs
2. Add client/employee-scoped document metadata model
3. Add document classifications and sensitivity flags
4. Add stricter RLS for document metadata
5. Add signed-url audit logging
6. Add retention model
7. Add malware/virus scanning strategy

## Immediate operational rule

Until the richer sensitive-document model is implemented, avoid collecting the highest-sensitivity employee records in production beyond controlled prototype use.
