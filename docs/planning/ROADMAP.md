# NovaHR: Technical Roadmap

Living document. Update status as work completes.

**Status key:** `done` | `deferred` | `queued` | `future`

---

## Priority order

| # | Item | Status | Effort | Notes |
|---|---|---|---|---|
| 1 | CI + Branch protection | **done** | S | CI live; branch protection blocked until GitHub Pro |
| 2 | Environments (dev / staging / prod) | **done** | S | Three environments on Vercel |
| 3 | Design system + component guide | **deferred** | M | Not yet built; still valuable for contributors |
| 4 | Phase 2: DB persistence | **done** | XL | Full Prisma + Supabase persistence |
| 5 | File uploads (Supabase Storage) | **done** | M | Employee photos + leave documents |
| 6 | Form validation (Zod) | **done** | M | SA-specific validators across all forms |
| 7 | Email notifications (Resend) | **done** | M | Leave and payslip emails |
| 8 | PDF payslip downloads | **done** | M | Client-side PDF via @react-pdf/renderer |
| 9 | Row-Level Security (Supabase RLS) | **done** | M | Tenant isolation enforced at Postgres level |

---

## 1. CI + Branch protection `done`

**What was done:**

- `.github/workflows/ci.yml`: runs on every branch push and on PRs targeting `main`.
  Steps: `npm install`, `prisma generate`, `eslint`, `tsc --noEmit`, `vitest run`.
- PR #1 merged this in. CI check is named `Lint, Type-check, Test`.

**Branch protection (blocked):**

GitHub branch protection rules on private repos require GitHub Pro (~$4/month). Once
upgraded, run this to lock `main`:

```bash
gh api repos/Wandile-Mtshwene/novahr/branches/main/protection --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Lint, Type-check, Test"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

Until then, convention: all changes go through a PR even though `main` is not locked.

---

## 2. Environments (dev / staging / prod) `done`

**Goal:** three clearly separated environments so that changes can be tested before
reaching real customer data.

| Environment | When triggered | Database | URL |
|---|---|---|---|
| Local dev | `npm run dev` | Supabase project: **novahr-dev** | `localhost:3000` |
| Staging | Vercel preview deployment (any PR) | Supabase project: **novahr-staging** | `novahr-git-*.vercel.app` |
| Production | Vercel production (merge to `main`) | Supabase project: **novahr-prod** | `novahr-five.vercel.app` (until custom domain) |

**How to set up:**

1. Create two new Supabase projects: `novahr-dev` and `novahr-staging`.
   Production is the existing Supabase project.
2. Run `prisma migrate deploy` against each project to create the schema.
3. On Vercel: set environment variables per environment:
   - Production: existing `DATABASE_URL` + `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`
   - Preview: new `DATABASE_URL` etc. pointing at `novahr-staging`
   - Development (via `vercel env pull .env.local`): points at `novahr-dev`
4. Add `NEXT_PUBLIC_APP_ENV=development|staging|production` to each environment so
   the app can show a banner on non-prod environments.
5. Local dev: use `vercel link` + `vercel env pull` to pull the dev env vars into
   `.env.local` automatically. Document in `README.md`.

**Branch strategy going forward:**

```
main      production (protected, requires PR + CI)
develop   staging baseline (optional, or just use PR previews)
feature/* work branches, each gets its own Vercel preview URL
```

---

## 3. Design system + component guide `deferred`

**Status:** skipped for now. The codebase is consistent enough that individual features
can be added without it. Revisit when a second contributor joins or before a design
refresh.

**What this would include:**

- A `/style-guide` route (dev-only) showing every shared component variant side by side.
  Lighter than Storybook, zero build overhead.
- `docs/component-guide.md` with written conventions: which component to use when, prop
  names, variant names.
- Component contracts: all data tables through `<Table>`, all status badges through
  `<Badge>`, page layout through `<PageHeader>`, empty states through a shared
  empty-state component.

**Why deferred:** the shadow cost of maintaining an accurate style guide is higher than
the benefit when there is only one active contributor. Revisit at around 3+ contributors.

---

## 4. Phase 2: DB persistence `done`

**What was built:**

Full migration from static seed arrays to real Postgres via Prisma + Supabase. Covered
in detail in `docs/README.md` (Phase 1 and Phase 2 sections).

- `prisma/schema.prisma`: full relational schema (Tenant, User, Employee, LeaveBalance,
  LeaveRequest, Department, PayrollRun, Payslip, ActivityItem, NotificationItem).
- `src/lib/prisma.ts`: singleton Prisma client using `@prisma/adapter-pg`.
- `src/lib/workspace/actions.ts`: `getTenantWorkspace()` loads all data for a tenant
  in a single fetch on app mount.
- `src/lib/workspace/mappers.ts`: converts raw Prisma rows to typed domain objects.
- `src/lib/employees/actions.ts`, `src/lib/leave/actions.ts`,
  `src/lib/payroll/actions.ts`, `src/lib/notifications/actions.ts`: server actions
  for each mutation, writing activity and notification side-effects transactionally.
- `src/lib/store/app-provider.tsx`: thin client reducer that merges server action
  results into local state without a full refetch.
- All 9 mutations (add/edit employee, toggle onboarding step, submit/approve/reject
  leave, start/complete payroll run, mark notification read/all-read) write to Postgres.
- `prisma/seed.ts`: idempotent seed script creating 3 demo tenants, full employee
  datasets, leave requests, payroll runs, payslips, activity, and notifications, plus
  4 real Supabase Auth users for the persona picker.
- 193 Vitest tests across 22 files (all passing).

---

## 5. File uploads (Supabase Storage) `done`

**What was built:**

Two upload features, both using Supabase Storage public buckets.

### Employee profile photos

- Supabase Storage bucket: `employee-photos` (public).
- `Employee.photoUrl String?` column added to Prisma schema.
- `src/components/employees/avatar-upload.tsx`: HR sees a click-to-upload button over
  the avatar. Photo is upserted to `{tenantId}/{employeeId}.{ext}` with a cache-bust
  query string on the public URL. Max 5 MB.
- All avatar usages across the app show the photo when set: employee directory, leave
  tables, payroll run detail, manager dashboard, command menu, payslip dialog.

### Leave supporting documents

- Supabase Storage bucket: `leave-documents` (public).
- `LeaveRequest.documentUrl String?` column added to Prisma schema.
- `src/components/leave/leave-document-upload.tsx`: optional file picker on the leave
  request dialog. Accepts JPEG, PNG, WebP, PDF up to 10 MB.
- File is uploaded to `{tenantId}/{employeeId}/{uuid}.{ext}` before the leave request
  is created. The public URL is stored on the `LeaveRequest` row.
- A paperclip icon in the leave table and dashboard approval widget links to the
  document in a new tab.

**Manual setup required:** create both storage buckets in Supabase before file uploads
will work. Run in the Supabase SQL editor:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-photos', 'employee-photos', true),
       ('leave-documents', 'leave-documents', true)
ON CONFLICT (id) DO NOTHING;
```

---

## 6. Form validation (Zod) `done`

**What was built:**

Zod v4 schemas wired into every user-facing form with SA-specific validators.

**SA-specific validators** (`src/lib/schemas/sa.ts`):

- `saIdNumber`: 13 digits, validates the embedded date of birth (digits 1-6), Luhn
  checksum on the full number.
- `saPhone`: matches `+27XXXXXXXXX` or `0XXXXXXXXX` (10 digits starting with 0).
- `bankAccountNumber`: 6-11 digits.
- `branchCode`: exactly 6 digits.

**Schema files:**

- `src/lib/schemas/sa.ts`: SA-specific primitives and 21 unit tests.
- `src/lib/schemas/employee.ts`: per-step schemas for the onboarding wizard
  (`personalStepSchema`, `roleStepSchema`, `compensationStepSchema`) plus edit-dialog
  schemas. Exports `validatePersonalStep`, `validateRoleStep`,
  `validateCompensationStep`, `validateEditEmployeeProfile`,
  `validateEditEmployeeCompensation`.
- `src/lib/schemas/leave.ts`: `leaveRequestSchema` with cross-field end-date check.
- `src/lib/schemas/tenant.ts`: `companyProfileSchema`, `payrollSettingsSchema`.

**Where errors appear:**

- Onboarding wizard steps: inline errors under each field; Next button blocked on
  validation failure.
- Leave request dialog: inline errors under affected fields.
- Edit employee dialog: first validation error shown as a toast (across two tabs,
  per-field errors would be impractical).
- Company settings, payroll settings: inline errors under affected fields.

---

## 7. Email notifications (Resend) `done`

**What was built:**

Three transactional emails sent via the Resend SDK, all fire-and-forget (email failure
never blocks the main server action).

**`src/lib/email/index.ts`**: Resend client (lazy init, returns null if
`RESEND_API_KEY` is not set), HTML email templates (inline CSS, no React Email
dependency), and three exported send functions.

| Trigger | Recipients | Subject |
|---|---|---|
| Leave request submitted | All HR + manager users for the tenant | "Leave request from {Name} (N days of annual leave)" |
| Leave request decided (approved or rejected) | The requesting employee | "Your annual leave request has been approved/rejected" |
| Payroll run completed | Every eligible employee (one email per payslip) | "Your June 2026 payslip is ready" |

**Environment variables required** (see `.env.example`):

- `RESEND_API_KEY`: from resend.com/api-keys. Leave blank to silently skip all sends.
- `EMAIL_FROM`: verified sender address, e.g. `"NovaHR <noreply@novahr.co.za>"`. Needs
  a verified domain in Resend. Use `onboarding@resend.dev` on the free tier for testing.
- `NEXT_PUBLIC_APP_URL`: base URL included in email links.

**Wired into:**
- `src/lib/leave/actions.ts`: `createLeaveRequestRecord` (leave submitted) and
  `decideLeaveRequestRecord` (leave decided).
- `src/lib/payroll/actions.ts`: `completePayrollRunRecord` (payslips published).

---

## 8. PDF payslip downloads `done`

**What was built:**

"Download payslip" in the payslip dialog now generates a real PDF file and saves it
to the user's device, replacing the print-dialog approach.

- `src/lib/payroll/pdf.tsx`: `PayslipDocument` React component using
  `@react-pdf/renderer` primitives. A4 layout with NovaHR header, employee info block,
  earnings table, deductions table, and a net pay highlight box.
- `src/components/payroll/payslip-dialog.tsx`: dynamically imports
  `@react-pdf/renderer` and `pdf.tsx` on first click (not in the initial bundle).
  Generates a Blob, creates a temporary object URL, triggers a download, and cleans up.
  Button shows "Generating..." while the PDF is building.
- `next.config.ts`: `serverExternalPackages: ["@react-pdf/renderer"]` prevents Next.js
  from trying to bundle the package for SSR.
- Download filename: `payslip-{lastname}-{period}.pdf` (e.g.
  `payslip-patel-2026-06.pdf`).

The existing `src/lib/payroll/print.ts` (`buildPayslipHtml`, `printPayslip`) is kept
for the HTML template tests and as a fallback but is no longer wired to any button.

---

## 9. Row-Level Security (Supabase RLS) `done`

**What was built:**

Tenant isolation is now enforced at the Postgres level. A bug in a server action can
no longer expose one tenant's data to another.

**`prisma/migrations/20260619000000_enable_rls/migration.sql`**: enables
`FORCE ROW LEVEL SECURITY` on all 8 tenant-scoped tables with a policy that allows
a row when `current_setting('app.tenant_id', true)` is NULL, empty (covers seed
scripts and migrations), or matches the row's `tenantId`. `Tenant` and `User` get
`ENABLE` only (no `FORCE`, no policies): the postgres role is unrestricted (used by
Prisma server actions) while the anon and authenticated REST API roles are fully blocked.

**`src/lib/db-context.ts`**: `runAsTenant(tenantId, fn)` wraps `fn` in a Prisma
transaction and calls `set_config('app.tenant_id', tenantId, true)` before any
queries run. Using `set_config` with the `local` flag means the variable is cleared
when the transaction ends, which is safe with pgbouncer transaction mode.

**All server actions converted:**

| File | Change |
|---|---|
| `workspace/actions.ts` | `getTenantWorkspace` wrapped in `runAsTenant` |
| `employees/actions.ts` | All 4 mutation functions wrapped; `tenantId` added to 3 signatures |
| `leave/actions.ts` | Both functions wrapped; `tenantId` added to `decideLeaveRequestRecord` |
| `payroll/actions.ts` | Both functions wrapped; `tenantId` added to both signatures |
| `notifications/actions.ts` | Both functions wrapped; `tenantId` added to `markNotificationReadRecord` |

**`app-provider.tsx`**: passes `state.tenantId` to all updated action signatures.

**Test strategy**: mock `@/lib/db-context` so `runAsTenant` transparently calls
`fn(mockPrisma)`. All existing assertions on `mockPrisma.*` continue to work with
no structural changes to the mocks.

**To activate on a Supabase project:** run `prisma migrate deploy` against the target
database. The migration is idempotent and safe to run on existing data.

---

## Bug fixes and polish (merged to main)

| Item | PR | What was fixed |
|---|---|---|
| Sidebar logo always dark | #5 | `forceDark` prop added to `Logo`/`LogoIcon`; sidebar always uses dark asset |
| Auth pages logo always dark | #6 | Login and signup branding panels always show white wordmark |
| Signup theme toggle | #7 | `ThemeToggle` added to `AuthShell` content panel, matching login page |

---

## Future items (not yet scheduled)

| Item | Why |
|---|---|
| Welcome email to new employee | Currently not sent; employee gets no notification when HR adds them. Add a `sendWelcomeEmail` call in `createEmployeeRecord`. |
| Design system + `/style-guide` route | Deferred from item 3; revisit when a second contributor joins. |
| Payroll reports (Excel export) | HR wants to export payroll runs to Excel for the accountant. `xlsx` package, server action returning a Blob. |
| Leave policy per-tenant | Currently global static config. Add `LeavePolicies` table and let HR configure annual/sick/family entitlements. |
| PAYE/UIF/SDL accuracy | Calculator uses placeholder rates. Needs 2026/27 SARS tables and correct bracket lookup. |
| Custom domain | Buy `novahr.co.za`, point to Vercel, configure Resend sending domain, update all hardcoded URLs. |

---

## Infrastructure upgrade checklist (before go-live)

- [ ] GitHub Pro ($4/month): enables branch protection on private repos (see item 1)
- [ ] Vercel Pro ($20/month): removes Hobby tier limits, custom domain, removes Vercel
  branding from error pages
- [ ] Supabase Pro ($25/month): prevents free-tier project pausing after 1 week inactivity
- [ ] Domain (novahr.co.za or similar): ~R200/year, needed for email sending and branding
- [ ] Two additional Supabase projects (dev + staging): free tier is fine for these
- [ ] Resend sending domain verified: required before sending email from your own address
