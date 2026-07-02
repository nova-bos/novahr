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

4. **Postgres row-level security** (`prisma/migrations/*enable_rls*`). Every tenant-scoped
   table has a FORCE RLS policy keyed on the `app.tenant_id` session variable, set per
   transaction by `runAsTenant()` (`src/lib/db-context.ts`). Even a bug in an action cannot
   read another tenant's rows once the transaction is scoped. The Supabase REST API is
   blocked for the anon/authenticated roles.

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

- **Leave document storage**: uploads go to the public `leave-documents` bucket and the
  stored URL is a public URL. Medical certificates are sensitive; move to a private bucket
  with signed URLs and a Supabase Storage RLS policy keyed on tenant. Until then, the
  object path contains an unguessable UUID, which mitigates but does not eliminate exposure.
- **Netcash service key** is stored in plaintext in `PayrollSettings`. Consider encrypting
  at rest with a server-side key.
- **Rate limiting** on login/signup/invite endpoints relies on Supabase and Vercel defaults;
  consider Vercel WAF rules before large-scale marketing.
- **Audit logging** exists as `ActivityItem` for HR events but does not yet cover settings
  changes or auth events.
