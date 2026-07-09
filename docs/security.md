# Security model

How NovaHR authenticates users and authorizes every read and write. Updated for the
July 2026 production-hardening pass.

## Layers

Defense in depth, four layers:

1. **Middleware route protection** (`src/middleware.ts`). Every request to an app route
   (`/dashboard`, `/employees`, `/payroll`, `/leave`, `/reports`, `/compliance`,
   `/deductions`, `/settings`, `/tenants`, `/billing`) is checked server-side against the
   Supabase session cookie. No session means a redirect to `/login` before any page code
   runs. Signed-in users hitting `/login` or `/signup` are redirected to `/dashboard`.
   The client-side `AuthGuard` remains as a complement for in-app session expiry.

2. **Server action authorization** (`src/lib/auth/require.ts`). Every server action that
   touches tenant data resolves the caller's session and profile first:

   - `requireUser()`: any signed-in user with a profile row; returns their tenantId and role.
   - `requireRole(...roles)`: asserts the user holds one of the given roles.
   - `requireTenant(tenantId, ...roles)`: for actions whose public signature still accepts a
     tenantId, verifies it matches the session user's tenant.
   - `requireEmployeeScope(employeeId)`: HR/exco always pass; managers pass for themselves
     and direct reports; employees only for themselves.

   The client-supplied tenantId is never trusted. Core actions (workspace, employees, leave,
   payroll, notifications, tenant, departments, invites) derive the tenant from the session;
   the payroll-compliance actions validate the passed tenantId against the session.

3. **Role-scoped data loading** (`src/lib/workspace/actions.ts`). The workspace payload sent
   to the browser is filtered by role before it leaves the server:

   - `hr` / `exco`: full workspace.
   - `manager`: full records for themselves and direct reports; everyone else is sanitized
     (no salary, banking, tax/ID numbers, address, emergency contacts, leave balances).
     Only their own and their reports' leave requests; only their own payslips; payroll run
     totals zeroed.
   - `employee`: own record full; colleagues sanitized; only own payslips and leave requests.

4. **Postgres row-level security** (`prisma/migrations/*baseline*`). Every tenant-scoped
   table has ENABLE + FORCE RLS with a `tenant_isolation` policy keyed on the
   `app.tenant_id` session variable, set per transaction by `runAsTenant()`
   (`src/lib/db-context.ts`).

   Honest scoping of what this layer does: the application connects as the Supabase
   `postgres` role, which has BYPASSRLS, so RLS does NOT constrain application queries.
   Tenant isolation for the app itself is enforced at the application layer: the
   `require*` guards plus the `tenantId` predicate on every tenant-scoped query, backed
   by the per-module isolation test suites (`src/lib/**/*.isolation.test.ts`). What RLS
   does enforce is denial of the Supabase REST/GraphQL surface: the `anon` and
   `authenticated` roles have table grants but no matching policy, so PostgREST access
   with the public anon key is fully blocked. Every new tenant-scoped table MUST get the
   same ENABLE + FORCE + `tenant_isolation` policy in its migration, or it is reachable
   through the REST API (this happened with EmployeeDeduction, EmployeeDocument and
   EtiClaim; the gap was found and closed on 2026-07-09).

## Role matrix

| Action | employee | manager | hr | exco |
| --- | --- | --- | --- | --- |
| View own profile/payslips/leave | yes | yes | yes | yes |
| View all employees (full) | no | reports only | yes | yes |
| Request leave | self | self + reports | anyone | no |
| Approve/reject leave | no | reports (not own) | yes (any) | no |
| Create/edit employees | no | no | yes | no |
| Run payroll, bank exports | no | no | yes | no |
| Compliance records | no | no | yes | read-only |
| Settings, departments, users, invites | no | no | yes | no |
| Billing | no | no | yes | no |

## Invitations

Invites (`src/lib/invites/actions.ts`) use a 256-bit random token sent only in the email
link; the database stores its SHA-256 hash (`Invite.tokenHash`). Tokens expire after 7 days
and are single-use; re-inviting an address revokes prior pending invites. Acceptance creates
a confirmed Supabase Auth user server-side via the service role key, so no email round trip
is needed, then creates the tenant `User` row in the invited role.

## Sessions and secrets

- Sessions are Supabase Auth cookies, refreshed by the middleware on every request.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only: used by the seed script and invite acceptance.
  It must never be exposed with a `NEXT_PUBLIC_` prefix.
- `.env` is gitignored; `.env.example` documents every variable.
- Security headers (CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
  are set in `next.config.ts`.
- User-provided strings are HTML-escaped before interpolation into email templates
  (`esc()` in `src/lib/email/index.ts`).

## Known gaps and future work

- **Leave document storage** (resolved): the `leave-documents` and `employee-documents`
  buckets are PRIVATE (verified against `storage.buckets` on 2026-07-09). Uploads store
  only the object path in `LeaveRequest.documentUrl`; reads go through
  `getLeaveDocumentUrl` (`src/lib/leave/documents.ts`), which authorizes the caller with
  `requireEmployeeScope` and returns a 60-second signed URL. Both buckets enforce
  `allowed_mime_types` and `file_size_limit` server-side (10 MB images/PDF for leave
  documents, 15 MB images/PDF/Office for the vault), and `uploadEmployeeDocument`
  validates the mime type before upload. Remaining hardening: a Supabase Storage RLS
  policy keyed on tenant as defense in depth.
- **Netcash service keys** (resolved): `netcashSalaryKey` and `netcashAccountServicesKey`
  are encrypted at rest with AES-256-GCM (`src/lib/crypto/service-keys.ts`) using the
  server-only `NETCASH_ENCRYPTION_KEY` (64-char hex, documented in `.env.example`).
  Keys are decrypted only inside the submission and settings contexts; reads back to the
  browser expose only a masked suffix. There is no key-rotation procedure yet: rotating
  `NETCASH_ENCRYPTION_KEY` currently means tenants re-enter their Netcash keys.
- **Rate limiting**: login (`throttleLogin`, 10/min) and signup (5/hour) now go through the
  in-memory `checkRateLimit` limiter, matching invite and contact actions. The limiter is
  per warm instance, not global; consider Vercel WAF rules or a shared store before
  large-scale marketing.
- **Audit logging** exists as `ActivityItem` for HR events but does not yet cover settings
  changes or auth events.
