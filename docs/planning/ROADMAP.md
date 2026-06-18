# NovaHR: Technical Roadmap

Living document. Update status as work completes.

**Status key:** `done` | `in progress` | `queued` | `future`

---

## Priority order

| # | Item | Status | Effort |
|---|---|---|---|
| 1 | CI + Branch protection | **done** | S |
| 2 | Environments (dev / staging / prod) | **done** | S |
| 3 | Design system + component guide | queued | M |
| 4 | Phase 2: DB persistence | queued | XL |
| 5 | File uploads (Supabase Storage) | queued | M |
| 6 | Form validation (Zod) | queued | M |
| 7 | Email notifications (Resend) | queued | M |
| 8 | PDF payslip downloads | queued | M |
| 9 | Row-Level Security (Supabase RLS) | queued | M |

Environments come before DB persistence because you need to know which database you are
writing to before committing real data. The design system is parallelisable and can be
done by a second contributor at any point.

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

**Files to touch:** `.env.local.example` (add to repo with placeholder values),
`README.md` (update getting-started section), Vercel dashboard (env var configuration).

---

## 3. Design system + component guide `queued`

**Goal:** make it easy for contributors to add features that look and feel like the rest
of the app, without having to dig through existing pages to copy patterns.

**Approach: internal style guide route**

A `/style-guide` route in the app (dev-only, not linked from the nav) that renders every
shared component variant side by side. This is lighter than Storybook and has zero build
overhead, but gives the same visual reference.

**What to document and standardise:**

- **Buttons:** primary, secondary, destructive, ghost, icon-only. All go through
  `<Button>` from `src/components/ui/button.tsx` (shadcn). No raw `<button>` elements.
- **Cards:** all content panels use `<Card>/<CardHeader>/<CardContent>` from shadcn.
- **Badges:** status badges (e.g. leave status, employment status) go through
  `<Badge variant="...">`. Define a fixed set of variants in `badge.tsx`.
- **Form fields:** all inputs, selects, textareas, and date pickers go through the
  corresponding shadcn components. No raw `<input>` elements.
- **Tables:** all data tables use `<Table>/<TableHeader>/<TableRow>` etc. from shadcn.
- **Page layout:** every app page follows the same shell: `<PageHeader>` component with
  title + optional right-side action button, then content below.
- **Empty states:** consistent empty-state component with icon + heading + optional CTA.
- **Loading states:** skeleton loaders using `<Skeleton>` from shadcn, not spinners.

**Files to create:**

- `src/app/(app)/style-guide/page.tsx` (the showcase page, guarded to dev env only)
- `docs/component-guide.md` (written reference: which component to use when, prop
  conventions, variant names)

**Relationship to shadcn/ui:**

shadcn components live in `src/components/ui/`. To extend a component (e.g. add a new
button variant), edit the file there directly. Do not wrap shadcn components in a second
wrapper just to rename them.

---

## 4. Phase 2: DB persistence `queued`

The biggest item. Full spec in `docs/planning/ACTION_PLAN.md` and the plan file.

**Summary of what changes:**

- `src/lib/store/app-provider.tsx` becomes a thin wrapper that fetches initial state from
  server actions instead of static seed data. Mutations call server actions instead of
  dispatching to a reducer.
- New server action modules: `src/lib/employees/actions.ts`,
  `src/lib/leave/actions.ts`, `src/lib/payroll/actions.ts`,
  `src/lib/notifications/actions.ts`, `src/lib/workspace/actions.ts`.
- Prisma client (`src/lib/prisma.ts`) is the single DB access point.
- All mutations write an `ActivityItem` row for the audit feed.

Do this work in the `staging` database (item 2 above) so production demo data is not
touched during development.

---

## 5. File uploads (Supabase Storage) `queued`

**What:**

- Employee profile pictures stored in a `avatars` Supabase Storage bucket.
- Sick note documents attached to sick leave requests, stored in a `documents` bucket
  (HR-only access via signed URLs).

**How:**

1. Create the two buckets in Supabase Storage (public for avatars, private for documents).
2. Add a `avatarUrl` column to the `Employee` model in `schema.prisma`.
3. Add a `sickNoteUrl` column to the `LeaveRequest` model.
4. Build an upload component using `supabase.storage.from('avatars').upload(...)`.
5. Use signed URLs (`createSignedUrl`) for the private `documents` bucket.
6. Validate file type (images only for avatars; PDF/JPG for sick notes) and size (max 5MB)
   before upload.

---

## 6. Form validation (Zod) `queued`

**What:** replace the current minimal validation with Zod schemas on all user-facing forms.

**Forms to cover:**

- Onboarding wizard (multi-step)
- Leave request dialog
- Edit employee dialog
- Company settings form
- Payroll settings form

**SA-specific validators to write:**

- SA ID number: 13 digits, date of birth embedded in digits 1-6, last digit Luhn checksum.
- Bank account number: 6-11 digits depending on bank.
- Phone: `+27XXXXXXXXX` or `0XXXXXXXXX` (10 digits starting with 0).

**Pattern:** define schemas in `src/lib/schemas/` and share them between server actions
(for server-side validation) and client forms (for inline feedback via `react-hook-form`
+ `zodResolver`).

---

## 7. Email notifications (Resend) `queued`

**Triggers:**

- Leave approved or rejected: email to the employee.
- Payslip published: email to the employee.
- New employee onboarded: welcome email to the employee.

**How:**

1. Sign up for Resend (free tier: 3,000 emails/month).
2. Add `RESEND_API_KEY` to Vercel env vars.
3. Create `src/lib/email/` with typed `sendEmail` wrapper around the Resend SDK.
4. Call `sendEmail` at the end of the relevant server actions (added in item 4).

**Sending domain:** use `onboarding@resend.dev` on the free tier until a domain is
purchased, then switch to `noreply@novahr.co.za`.

---

## 8. PDF payslip downloads `queued`

**Goal:** a "Download payslip" button that produces a real PDF file, not just a
browser print dialog.

**Recommended approach: `@react-pdf/renderer`**

- Pure JavaScript, works on Vercel without any additional runtime config.
- Build a `PayslipDocument` React component using `react-pdf` primitives that mirrors
  the existing HTML template in `src/lib/payroll/print.ts`.
- Expose a route handler at `GET /api/payslip/[id]` that renders the PDF and streams it
  with `Content-Type: application/pdf`.

**Alternative (if layout fidelity is critical): `@sparticuz/chromium` + Puppeteer**

- Renders the existing HTML template pixel-perfectly.
- Works on Vercel via a serverless function with the `@sparticuz/chromium` package.
- Cold-start is slower and the function bundle is larger (~50MB).
- Only worth this complexity if the `@react-pdf/renderer` output does not meet design
  requirements.

---

## 9. Row-Level Security (Supabase RLS) `queued`

**Why this matters:** currently, tenantId scoping is enforced only at the application
layer. If there is ever a bug in a server action, one tenant could read another's data.
RLS enforces this at the database level regardless of application code.

**What to add:**

RLS policies on every table: `Tenant`, `Employee`, `Department`, `LeaveRequest`,
`PayrollRun`, `Payslip`, `ActivityItem`, `NotificationItem`, `LeaveBalance`.

Example policy pattern:
```sql
CREATE POLICY "tenant isolation" ON "Employee"
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

The application sets `app.tenant_id` at the start of each request using
`SET LOCAL app.tenant_id = '...'` inside a Prisma transaction or via a custom
`pg_session` extension.

**Prerequisite:** complete item 4 (DB persistence) first, so there is real multi-tenant
data to protect.

**Do this before any real customer data enters the system.**

---

## Infrastructure upgrade checklist (before go-live)

- [ ] GitHub Pro ($4/month): enables branch protection on private repos (see item 1)
- [ ] Vercel Pro ($20/month): removes Hobby tier limits, adds custom domain, removes
  Vercel branding from error pages
- [ ] Supabase Pro ($25/month): prevents free-tier project pausing after 1 week inactivity
- [ ] Domain (novahr.co.za or similar): ~R200/year, needed for custom email and branding
- [ ] Two additional Supabase projects (dev + staging): free tier is fine for these
