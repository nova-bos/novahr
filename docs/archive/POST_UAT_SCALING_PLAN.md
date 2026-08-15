# Post-UAT Scaling Plan

Written July 2026. To be executed once UAT closes and the app is production-ready.
This document is the source of truth for how we move from a working product to a scalable, handover-ready one.

---

## 1. Pipeline: dev, staging, production

### Current state
All UAT runs directly against the single Vercel production deployment (`novahr-five.vercel.app`) backed by a single Supabase project. There is no staging environment and no gate between a code change and production.

### Target state

```
feature/<name>  →  staging  →  main
     ↓                ↓           ↓
  PR preview     staging env   production
  (Vercel)       (Supabase S)  (Supabase P)
```

**Three Supabase projects:** dev (local or shared), staging, production. Each has its own database, Auth config, and connection string. Migrations run separately per environment so staging mirrors what production will get before it gets it.

**Three Vercel environments:**
- Preview: auto-created on every PR. Uses `STAGING_DATABASE_URL`, `STAGING_SUPABASE_*`.
- Staging: the `staging` branch auto-deploys to a named Vercel env (`staging.novahr.app`). Used for smoke tests and sign-off.
- Production: the `main` branch auto-deploys to `novahr-five.vercel.app` (and eventually the custom domain).

**Branch protection rules (GitHub):**
- `main`: require PR, require status checks (build + type check + tests), no force-push.
- `staging`: require PR from feature branches, require build pass.
- Direct push to main is blocked. Staging is the gate.

**CI checks on every PR (GitHub Actions):**
1. `prisma validate` — schema must be valid.
2. `prisma migrate diff --exit-code` — no uncommitted schema drift.
3. `tsc --noEmit` — zero type errors.
4. `eslint` — zero errors (warnings allowed).
5. `jest --ci` (once test suite exists) — all tests pass.
6. `next build` — build must succeed.
All six must be green before a PR can merge.

**Environment variable strategy:**
- Use Vercel env var groups: `production`, `preview`, `development`.
- Never commit `.env` files. All secrets live in Vercel and in 1Password.
- Key pairs to manage per environment: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`.

**Migration workflow:**
```bash
# On a feature branch
npx prisma migrate dev --name <description>

# On merge to staging: CI runs
npx prisma migrate deploy

# On merge to main: CI runs against production DB
npx prisma migrate deploy
```
Never run `migrate dev` against staging or production. `migrate deploy` only.

**Release process:**
1. Feature branch → PR to `staging`. CI must pass.
2. Deploy to staging env. Manual smoke test or automated E2E.
3. PR from `staging` to `main`. One reviewer sign-off required.
4. Merge. CI deploys to production automatically.
5. Monitor Vercel runtime logs for 10 minutes post-deploy.

---

## 2. Component system

### Current state
Components are split between `/src/components/ui/` (shadcn base), domain folders (`/employees/`, `/payroll/`, etc.), and a mix of semantic tokens and hard-coded Tailwind colour classes. There is no single source of truth for a "text input with a label and an error message".

### Target state: a NovaHR Design System layer

The goal is not to rebuild from scratch. shadcn/radix stays as the base. We add a thin `nova-ui` layer on top that wraps shadcn with our conventions, variants, and accessibility defaults. All domain code imports from `nova-ui`, never directly from shadcn primitives or Tailwind classes for color.

#### 2a. Token layer (already started, needs completion)

All colours go through CSS custom properties defined in `globals.css`. Any component using `bg-green-100 text-green-800` must be converted to a semantic token. Target tokens:
- Status: `--success`, `--warning`, `--destructive`, `--info`
- Layout: `--background`, `--foreground`, `--muted`, `--accent`, `--border`
- Brand: `--primary`, `--primary-foreground`

Audit: run `grep -r "bg-red-\|bg-green-\|bg-yellow-\|bg-blue-\|text-gray-" src/` and convert each hit to a token.

#### 2b. Form primitives (new: `src/components/nova-ui/`)

Every form field across the app should use one of these. Never compose your own label + input + error inline in a page component.

| Component | Props | Notes |
|-----------|-------|-------|
| `TextField` | `label, name, placeholder, hint, error, required, disabled` | Wraps `<Input>` + `<Label>` + error message. SA locale on keyboard type. |
| `NumberField` | `label, name, min, max, step, prefix, suffix, error` | For currency, percentages, counts. Formats on blur. |
| `CurrencyField` | `label, name, currency="ZAR", error` | NumberField preset: R prefix, 2 decimal places, comma-separated. |
| `PercentageField` | `label, name, min=0, max=100, error` | NumberField preset: % suffix, 2 decimals. |
| `SelectField` | `label, name, options, placeholder, error, searchable?` | Wraps `<Select>` or `<Combobox>` depending on `searchable`. |
| `ComboboxField` | `label, name, options, placeholder, error, creatable?` | Searchable select with optional free-text entry. |
| `TextareaField` | `label, name, rows, maxLength, hint, error` | With optional character counter. |
| `DateField` | `label, name, min, max, error` | Native date input, formatted as `DD MMM YYYY` display. |
| `CheckboxField` | `label, name, description, error` | Single checkbox with descriptive subtext. |
| `SwitchField` | `label, name, description, disabled` | Toggle with label and optional description. |
| `RadioGroupField` | `label, name, options, error` | Vertical radio list. |
| `FileField` | `label, name, accept, maxSizeMb, error` | Drag-and-drop + click. Shows file name and size on select. |

All form fields:
- Are fully keyboard-accessible and ARIA-compliant.
- Accept an `error` prop that displays below the field in `text-destructive`.
- Accept a `hint` prop that displays below the label in `text-muted-foreground`.
- Are controlled (accept `value` + `onChange`) OR uncontrolled with `name` for native form submission.

#### 2c. Alert and feedback components

| Component | Variants | Usage |
|-----------|----------|-------|
| `Alert` | `info`, `success`, `warning`, `error` | Inline page alerts. Already partially exists as `FormAlert`. Extend it. |
| `Toast` | `info`, `success`, `warning`, `error` | Uses sonner. Wrapper function `toast.nova(type, title, description)` so the call site never passes colour. |
| `EmptyState` | Slot: `icon, title, description, action` | Replaces ad-hoc empty state JSX scattered across directory components. |
| `LoadingState` | `message?` | Spinner + optional message. One consistent look. |
| `ConfirmDialog` | `title, description, confirmLabel, onConfirm, destructive?` | Replaces `window.confirm()` calls (compliance panel, termination). Async. |
| `StatusBadge` | `status` (typed union) | One badge component for ALL status types: payroll run status, leave request status, compliance status, employee status. Internally maps status to colour token. |

#### 2d. Layout and data display

| Component | Notes |
|-----------|-------|
| `PageHeader` | Already exists. Add `breadcrumb` prop slot. |
| `Section` | A titled subsection inside a page. `title`, `description`, `action` slot. Replaces ad-hoc `<div className="flex flex-col gap-...">` patterns. |
| `StatCard` | Already scattered in multiple domain folders. Unify into one: `title`, `value`, `delta`, `icon`, `loading`. |
| `DataTable` | Wrap TanStack Table with our styles, skeleton loading state, empty state, and pagination. The current employee directory table is the reference implementation. |
| `DetailRow` | `label + value` for detail panels. Already used in employee profile. Extract into nova-ui. |

#### 2e. Component documentation

Use Storybook. Every nova-ui component gets a story showing:
- Default state
- All variants/props
- Error/loading/empty states
- Dark mode side-by-side

Run locally with `npm run storybook`. The story file lives alongside the component: `TextField.stories.tsx` next to `TextField.tsx`.

---

## 3. Code organisation

### Current state
Business logic, server actions, types, and utilities are mixed across `/src/lib/` in flat and nested structures that have grown organically. New developers cannot easily find where something lives.

### Target structure

```
src/
  app/                    # Next.js routes only. No business logic.
  components/
    nova-ui/              # Design system layer (new)
    ui/                   # shadcn base (keep, do not modify)
    layout/               # App shell components (sidebar, topbar, etc.)
    [domain]/             # Domain-specific components (employees, payroll, etc.)
  lib/
    actions/              # All server actions, one file per domain
    constants/            # Enums, config values, lookup tables
    db/                   # Prisma client, runAsTenant, db helpers (rename from lib/prisma.ts)
    errors/               # Error classes, error mappers, friendly messages
    format/               # All formatters: currency, date, number, percentage, phone, SA ID
    schemas/              # All Zod schemas, one file per domain
    services/             # Business logic functions (pure: no request context, no DB calls)
    operations/           # Ordered operation pipelines (see section 3b)
    store/                # App-wide React state (keep, extend)
    types/                # All TypeScript types and interfaces
    utils/                # Generic utility functions (string, array, object helpers)
    validators/           # SA-specific validation: ID, phone, bank account, PAYE ref
```

**Rules:**
- `app/` has no logic. It only imports from `components/` and `lib/actions/`.
- `components/` has no server actions and no direct Prisma calls.
- `lib/services/` is pure business logic: no HTTP, no DB, no React. These are testable in isolation.
- `lib/operations/` orchestrates services in a defined order (see below).
- `lib/actions/` calls operations and formats the result for the client.
- Circular imports between lib modules are forbidden. Dependency direction: `actions` → `operations` → `services` → `schemas/types/utils`.

### 3a. Consolidating format utilities

Current: `formatCurrency`, `formatDate`, etc. live in `lib/format.ts`. But there are ad-hoc one-off formats inline in components.

Target: `lib/format/` as a folder.
- `lib/format/currency.ts` — `formatCurrency`, `formatCurrencyCompact`, `formatAxisCurrency`
- `lib/format/date.ts` — `formatDate`, `formatDateRange`, `formatPeriod`, `parseLocalDate`
- `lib/format/number.ts` — `formatPercent`, `formatCount`, `formatCompact`
- `lib/format/sa.ts` — `formatSAID`, `formatPhoneNumber`, `formatBankAccount`, `formatTaxRef`
- `lib/format/index.ts` — re-exports all of the above

### 3b. Operation pipelines (run order files)

The most important piece for developer handover. Many business processes in NovaHR have a strict order of operations. These should be explicit, not inferred from reading the code.

Each pipeline is a typed async function that:
1. Validates its inputs.
2. Runs steps in a defined order.
3. Logs each step to the audit log.
4. Returns a typed result.
5. Rolls back on failure (uses a Prisma transaction where possible).

Example pipelines to define:

**`lib/operations/payroll-run.ts`**
```
1. validatePayPeriod(tenantId, period)
2. lockPayPeriod(tenantId, period)            // prevent double-run
3. resolveEmployees(tenantId)                 // scoped, active only
4. calculateGrossEarnings(employees, period)  // basic + allowances
5. applyDeductions(employees, settings)       // PAYE, UIF, SDL, RA, pension, medical
6. applyLeaveAdjustments(employees, period)   // unpaid leave
7. generatePayslips(employees, tenantId)
8. writePayrollRun(tx, result)
9. stampCompliance(tx, tenantId, period)      // EMP201 totals
10. notifyEmployees(payslipIds)               // email queue
```

**`lib/operations/employee-onboard.ts`**
```
1. validatePersonalDetails(input)
2. validateCompensation(input, settings)
3. validateBankDetails(input)
4. createEmployee(tx, tenantId, input)
5. createPayrollProfile(tx, employee)
6. assignDepartment(tx, employee, deptId)
7. linkManager(tx, employee, managerId?)
8. writeAuditLog(tx, "hire", employee)
9. notifyHR(employee)
```

**`lib/operations/leave-request.ts`**
```
1. validateDateRange(input)
2. checkLeaveBalance(employeeId, type, days)
3. checkConflicts(employeeId, dateRange)
4. createRequest(tx, input)
5. notifyManager(request)
6. writeAuditLog(tx, "leave_request", request)
```

**`lib/operations/tenant-invite.ts`**
```
1. validateEmail(email)
2. checkExistingUser(email, tenantId)
3. createInviteToken(tenantId, email, role)
4. sendInviteEmail(token) OR returnCopyableLink()
5. writeAuditLog(tx, "invite_sent", ...)
```

Each operation exports a named function and a `<OperationName>Input` / `<OperationName>Result` type. The server action file calls it:
```typescript
// lib/actions/payroll.ts
export async function runPayrollAction(tenantId, period) {
  const session = await requireUser();
  requireRole(session, "hr");
  return runPayrollOperation(tenantId, period);
}
```

---

## 4. Testing strategy

### Current state
`lib/format.test.ts` exists (120 passing tests per audit). No component tests, no integration tests, no E2E tests.

### Target: three-layer test pyramid

**Layer 1: Unit tests (`jest`, existing)**
- All `lib/services/` functions
- All `lib/format/` formatters
- All `lib/validators/` validators
- All `lib/schemas/` Zod schemas
- All `lib/operations/` pipelines (with a mocked Prisma client)
- Target: 80% coverage of `lib/`

**Layer 2: Integration tests (`jest` + real test DB)**
- Server actions against a real Supabase test project
- Payroll calculation end-to-end: input employee data, run calculation, assert payslip totals
- Leave balance adjustments after approval
- Tenant isolation: assert that tenant A cannot read tenant B's data
- Run in CI against the staging Supabase project

**Layer 3: E2E tests (`Playwright`)**
- Critical user journeys only:
  1. Sign up → confirm email → complete onboarding
  2. Add employee → run payroll → download payslip
  3. Submit leave request → approve as manager → check balance
  4. Invite user → accept invite → verify role-gated navigation
- Run on every merge to staging, not on every PR (too slow)

**Test conventions:**
- Test files live next to the code: `format.ts` → `format.test.ts`
- Integration tests: `src/lib/[domain]/__tests__/[name].integration.test.ts`
- E2E: `e2e/[journey-name].spec.ts`
- No `window.confirm()` in tested code. Use `ConfirmDialog` instead (see 2c).

---

## 5. Developer handover package

### What a new developer needs to get productive in one day

**`docs/DEVELOPERS.md`** (to be written):
- Repo setup: clone, `cp .env.example .env.local`, `npm install`, `npx prisma migrate dev`, `npm run dev`
- Environment: which Supabase project to use for local dev, where to get the keys
- Branching: always branch from `staging`, PR to `staging`, never to `main` directly
- Commit format: `<type>(<scope>): <description>` — types: feat, fix, chore, refactor, test, docs
- Where to find things: the table in section 3 above

**`docs/ARCHITECTURE.md`** (to be written):
- Layered architecture diagram
- Auth flow: Supabase Auth → requireUser() → tenant isolation via runAsTenant()
- Data flow: client → server action → operation → service → DB
- Store: when to use the app store vs. server-fetched data
- Role model: hr, manager, employee, exco — what each can see and do

**Architecture Decision Records (`docs/adr/`)**:
One short file per significant decision. Example ADRs to write:
- `001-app-router-over-pages.md`
- `002-prisma-over-drizzle.md`
- `003-bypassrls-app-layer-isolation.md` (important: explains why we don't use Postgres RLS)
- `004-supabase-auth-only.md` (we use Supabase for auth but Prisma for all data)
- `005-server-actions-over-api-routes.md`

**Onboarding checklist for a new developer:**
- [ ] Read `DEVELOPERS.md`
- [ ] Read `ARCHITECTURE.md`
- [ ] Read the three most recent ADRs
- [ ] Run the app locally against the dev Supabase project
- [ ] Run `npm test` and confirm all pass
- [ ] Read one domain end-to-end: follow a payroll run from the UI button to the DB write
- [ ] Make a small change in a feature branch and open a PR to staging

---

## 6. Execution order (post-UAT phases)

These phases run in sequence. Each phase has a definition of done before moving to the next.

### Phase 1: Pipeline setup (week 1)
1. Create staging Supabase project. Export prod schema, apply to staging.
2. Add `staging` branch to the repo.
3. Configure Vercel environments: staging env vars wired to staging Supabase.
4. Set up GitHub Actions workflow: type check + lint + build on every PR.
5. Add branch protection rules to `main` and `staging`.
6. Write `DEVELOPERS.md` and `ARCHITECTURE.md`.

Done when: a feature branch PR to staging triggers CI, the staging Vercel env deploys, and main is protected.

### Phase 2: Test foundation (week 2)
1. Set up Jest with TypeScript path aliases.
2. Write unit tests for `lib/services/payroll/` (the most complex business logic).
3. Write unit tests for `lib/validators/`.
4. Write integration tests for tenant isolation.
5. Add test run to the CI workflow.

Done when: `npm test` passes in CI on every PR with >60% coverage of `lib/services/`.

### Phase 3: Component system (weeks 3-4)
1. Create `src/components/nova-ui/` folder.
2. Implement form primitives: `TextField`, `NumberField`, `SelectField`, `CurrencyField`.
3. Implement feedback: unified `Alert`, `StatusBadge`, `EmptyState`, `ConfirmDialog`.
4. Replace `window.confirm()` calls with `ConfirmDialog` (compliance panel, termination, deletion).
5. Replace inline form field compositions with nova-ui components, starting with the onboarding wizard and settings pages.
6. Run the colour token audit: grep for hard-coded Tailwind colour classes and convert each.
7. Set up Storybook. Write stories for every nova-ui component.

Done when: Storybook runs, all nova-ui components have stories, no hard-coded colour classes remain.

### Phase 4: Operations layer (week 5)
1. Create `lib/operations/` folder.
2. Extract payroll run pipeline into `lib/operations/payroll-run.ts`.
3. Extract employee onboarding into `lib/operations/employee-onboard.ts`.
4. Extract leave request into `lib/operations/leave-request.ts`.
5. Update server actions to call operations instead of having logic inline.
6. Write unit tests for each operation with a mocked Prisma client.

Done when: server actions are thin wrappers, all business logic lives in operations, operations are tested.

### Phase 5: Code organisation cleanup (week 6)
1. Restructure `lib/format.ts` into `lib/format/` subfolder.
2. Consolidate scattered types into `lib/types/` with one file per domain.
3. Move inline Zod schemas to `lib/schemas/`.
4. Write ADRs for the three most important architectural decisions.
5. Write the onboarding checklist and verify it with a test run-through.

Done when: a new developer can set up locally and submit a PR in under 4 hours using only the written docs.

### Phase 6: E2E tests (week 7)
1. Set up Playwright.
2. Write E2E for sign-up flow.
3. Write E2E for payroll run flow.
4. Write E2E for leave request and approval.
5. Add E2E run to CI on merge to staging only.

Done when: four critical journeys are covered by E2E tests running in CI against the staging environment.

---

## 7. Applying this to future products

The components, operations layer, and test patterns built in Phase 3-4 above become the starting template for every product after NovaHR (NovaFinance, NovaPOS, NovaPilot, etc.).

The plan is to extract the shared pieces into a private `@nova/ui` npm package or a Turborepo monorepo once at least two products need the same components. Do not do this early — wait until the second product actually needs to share something. Premature abstraction is worse than duplication.

Checklist before starting a new product:
- [ ] Clone the nova-ui component set
- [ ] Clone the CI workflow
- [ ] Clone the operations layer pattern (adapt pipeline steps for the new domain)
- [ ] Set up staging + production Supabase projects from day one
- [ ] Write `DEVELOPERS.md` before writing any features

---

*This document is a plan, not a commitment. Priorities may shift after UAT closes. Review and update before starting Phase 1.*
