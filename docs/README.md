# NovaHR: Developer Documentation

> **Business, legal, and go-to-market documentation** lives in subfolders: `legal/`,
> `compliance/`, `payroll-compliance/`, `customer/`, `customer-success/`, `sales/`,
> `marketing/`, `brand/`, `internal/`. Start with
> [`legal/README.md`](./legal/README.md) (document map and in-app acceptance plan) and
> [`BUSINESS_DOCUMENT_REGISTER.md`](./BUSINESS_DOCUMENT_REGISTER.md) (master register
> with the 2026-07-10 status update).

This is the developer documentation for the NovaHR build: Phases 1 through 4:
moving the app from an in-memory demo onto a real Supabase Postgres database and Supabase
Auth (Phases 1-2), adding payslip PDF export (Phase 3), and building the public-facing
marketing and pricing pages (Phase 4).

If you're picking this codebase up for the first time, read these docs in order:

1. **This file**, what changed across all phases, and how to get a local environment running.
2. [`database.md`](./database.md), the Prisma schema, the data model, and `src/lib/prisma.ts`.
3. [`auth.md`](./auth.md): Supabase Auth wiring (browser/server clients, middleware,
   `AuthProvider`, `useAuth()`).
4. [`tenants.md`](./tenants.md), how the signed-in user's company (`Tenant`) is loaded
   from the database and made available via `useCurrentTenant()`.
5. [`data-layer.md`](./data-layer.md), the fetch-once/dispatch-mutation-results
   architecture for employees, leave, payroll, activity, and notifications.
6. [`auth-pages.md`](./auth-pages.md), the `/login`, `/signup`, `/forgot-password` and
   `/reset-password` pages and the server actions behind them.
7. [`seed-data.md`](./seed-data.md), the seed script and the full demo dataset for all 3
   tenants, plus the 4 demo personas used for sales demos.
8. [`testing.md`](./testing.md), the Vitest unit test suite (21 files / 163 tests), how to
   run it, and the patterns to follow for new tests.
9. [`phase3-payslip-pdf.md`](./phase3-payslip-pdf.md), payslip PDF export via browser print
   (`src/lib/payroll/print.ts`).
10. [`phase4-landing-page.md`](./phase4-landing-page.md), the public marketing landing page,
    pricing tiers, and route protection model.
11. [`uat-checklist.md`](./uat-checklist.md), manual UAT checklist (checkbox format) covering
    all phases plus the MVP polish improvements.

## Production hardening (July 2026)

A full production-readiness pass. The important changes:

- **Server-side security**: middleware now enforces route protection; every server action
  authenticates the session and authorizes by role via `src/lib/auth/require.ts`; the
  workspace payload is sanitized per role so employees never receive colleagues' salaries,
  banking or ID numbers. See [`security.md`](./security.md).
- **All SA leave types**: maternity, parental, adoption, commissioning parental and study
  leave added alongside annual/sick/family/unpaid, with BCEA-correct entitlements and the
  Van Wyk interim position. Leave is counted in working days, excluding weekends and SA
  public holidays (calendar shown in-app). See [`leave.md`](./leave.md).
- **Payroll correctness**: 2026/27 SARS tables verified against the Budget 2026 Tax Guide;
  medical aid tax credits now flow from payroll profiles into PAYE.
- **Launch blockers closed**: departments CRUD (Settings > Departments), email invite flow
  with hashed one-time tokens (Settings > Users, `/accept-invite/[token]`), 14-day trial
  expiry with lock screen and `/billing` upgrade page, `/terms` and `/privacy` pages.
- **Testing**: 233 unit tests; release plan in [`TESTING_ROADMAP.md`](./TESTING_ROADMAP.md).

## MVP improvements (post-Phase 4)

- **Settings persistence**: Company profile and payroll settings (pay frequency, pay day,
  bank) now write to Postgres via `src/lib/tenant/actions.ts`. Statutory reference fields are
  display-only. Leave policy settings are read-only with an informational note. Notification
  preferences persist to `localStorage`.
- **Exco live tenants**: The tenants page now fetches real companies from the DB via
  `getAllTenants()` in `src/lib/workspace/actions.ts` instead of the static demo array.
- **New company empty state**: HR admins with zero employees see a "Get started" welcome card
  (`src/components/dashboard/getting-started-card.tsx`) with three guided steps.
- **Landing page hero**: The mock dashboard preview in the hero section now shows a branded
  titlebar, four stat cards, and a recent activity feed.

## What changed in Phase 1

Before this phase, NovaHR was a fully working UI demo, but:

- All data (tenants, employees, leave, payroll, etc.) lived in static arrays under
  `src/lib/data/*` and was held in a React reducer (`AppProvider`), nothing persisted.
- "Login" just matched against a hardcoded list in `src/lib/auth/demo-users.ts` and stored
  the chosen user in `localStorage`.

After this phase:

- There's a full **Prisma schema** (`prisma/schema.prisma`) modeling the whole domain
  (tenants, users, employees, leave, payroll, activity, notifications), ready to run against
  a **Supabase Postgres** database.
- **Real Supabase Auth** powers login, signup, logout, and password reset, with sessions
  stored in cookies (so they survive page refreshes, unlike the old localStorage demo).
- A brand-new company can **sign up** (`/signup`), gets its own `Tenant` + `User` row, and
  lands on a working (empty) dashboard.
- The 4 demo personas (Aisha, Thabo, Lerato, Michael) become **real seeded accounts**, so the
  `/login` persona-picker still works for sales demos.

## What changed in Phase 2

Phase 2 finishes the migration Phase 1 started. `AppProvider`'s in-memory reducer for
employees, departments, leave, payroll runs/payslips, the activity feed, and notifications
now reads and writes real Postgres via Prisma + Server Actions, see
[`data-layer.md`](./data-layer.md).

- One aggregate `getTenantWorkspace(tenantId)` fetch loads the signed-in user's whole
  workspace (tenant + employees + departments + leave + payroll + activity +
  notifications) on mount and on tenant switch.
- Each of the 9 mutations, add/edit employee, toggle onboarding step, submit/approve/
  reject leave, start/complete payroll run, mark notification read/all-read, is now a
  Server Action that writes to Postgres (plus any side-effect `ActivityItem`/
  `NotificationItem` rows) and returns the resulting record(s) for the UI to merge in.
- The seed script now seeds the **full** demo dataset, every employee, department, leave
  request, payroll run/payslip, activity item, and notification for all 3 demo tenants, not
  just the 3 NovaTech employees referenced by demo personas. See
  [`seed-data.md`](./seed-data.md).
- A brand-new signup still lands on an empty-but-functional dashboard -
  `getTenantWorkspace` returns empty arrays for a tenant with no seeded data, same as the
  old static-array fallback did.

### Explicitly deferred to a later phase

- `LeavePolicy` and `PayrollConfig` remain global static config, not per-tenant DB rows -
  see [`database.md`](./database.md#whats-not-in-the-database-yet).
- PAYE/UIF/SDL figures are still the existing placeholder calculation
  (`src/lib/payroll-calc.ts`).
- PDF export for payslips/reports.
- The exco dashboard and `/tenants` page's cross-tenant aggregates still read the static
  `src/lib/data/*` arrays directly, see
  [`data-layer.md`](./data-layer.md#cross-tenant-views-exco-dashboard--tenants-page). A real
  "all tenants I have access to" query is future work.

## Local setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project (e.g. `novahr-dev`).
2. **Project Settings → Database**: copy the **connection pooling** string (port `6543`) for
   `DATABASE_URL`, and the **direct connection** string (port `5432`) for `DIRECT_URL`.
3. **Project Settings → API**: copy the `Project URL`, `anon public` key, and `service_role`
   secret key.
4. **Authentication → Providers → Email**: for local development, turn **off** "Confirm
   email" so new signups can use the app immediately. (The code handles the
   "check your email" case either way, see [`auth-pages.md`](./auth-pages.md).)
5. **Authentication → URL Configuration**: add `http://localhost:3000/reset-password` (and
   later your production URL) as a redirect URL, so the "forgot password" email link works.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in the 5 values from step 1. See [`.env.example`](../.env.example) for what each one is
for. `.env` is read by both Next.js (at runtime) and the Prisma CLI (via
`prisma.config.ts`, which loads `.env` explicitly, see [`database.md`](./database.md)).

> Requires Node 20.12+ / 21.7+ (any current LTS) for `process.loadEnvFile`, which
> `prisma.config.ts` uses to load `.env`.

### 3. Create the database tables

```bash
npx prisma migrate dev --name init
```

This creates every table in `prisma/schema.prisma` in your Supabase database and generates
the Prisma Client.

### 4. Seed demo data

```bash
npx prisma db seed
```

This creates the 3 demo tenants, the full demo dataset for all 3 tenants (employees,
departments, leave requests, payroll runs/payslips, activity, and notifications), and 4 real
Supabase Auth users + `User` rows for the `/login` persona picker. It's idempotent, safe to
re-run.

### 5. Run the app

```bash
npm run dev
```

- Go to `/login` and pick a persona (e.g. "Lerato Dlamini") to sign in as a seeded HR admin
  for NovaTech Solutions.
- Go to `/signup` to create a brand-new company and land on its (empty) dashboard.

## Map of new/changed files

| Area | Files |
| --- | --- |
| Database | `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/prisma.ts`, `prisma/seed.ts` |
| Supabase clients | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts` |
| Auth state | `src/lib/auth/auth-provider.tsx`, `src/lib/auth/actions.ts`, `src/lib/auth/types.ts` |
| Workspace state | `src/lib/workspace/actions.ts`, `src/lib/workspace/mappers.ts`, `src/lib/store/app-provider.tsx`, `src/lib/store/hooks.ts` |
| Data layer (Phase 2) | `src/lib/employees/actions.ts`, `src/lib/leave/actions.ts`, `src/lib/payroll/actions.ts`, `src/lib/notifications/actions.ts` |
| Auth pages | `src/app/login/page.tsx`, `src/app/signup/{page,actions}.tsx`, `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`, `src/components/auth/auth-shell.tsx` |
| Demo data | `src/lib/auth/demo-users.ts` |
| Tests | `vitest.config.ts`, `src/lib/workspace/test-fixtures.ts`, `**/*.test.ts` (18 files, 134 tests) |
| Env | `.env.example`, `.gitignore` |
