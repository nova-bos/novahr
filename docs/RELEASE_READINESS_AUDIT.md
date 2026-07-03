# NovaHR Release Readiness Audit

Prepared as an independent CTO, Principal Architect, Security Consultant, QA Lead, DevOps Engineer, UX Specialist, and Product Manager review.
Audit date: 2026-07-03. Scope: full read-only inspection of the codebase at /Users/wandilemtshwene/novahr. No files other than this report were modified.

Verification performed during this audit: `npx tsc --noEmit` (clean, exit 0), `npm test` (244/244 passing across 25 files), `npx eslint src` (0 errors, 6 warnings), plus manual reading of the schema, all migrations, every server action, the middleware, the auth and crypto layers, the payroll calculator, the Netcash integration, and representative UI.

---

## 1. Executive Summary

NovaHR is a genuinely impressive build for its stage. It is a multi-tenant South African HR and payroll SaaS with a clean Next.js 15 App Router architecture, server actions instead of a sprawling REST surface, a Decimal based PAYE/UIF/SDL calculator, encrypted Netcash credentials, real transactional email, react-pdf payslips with a live studio, and a disciplined test suite that is green. Type checking is clean, the build artefacts are present, and the security model is documented and, for the most part, implemented as documented.

However, the audit found one issue that blocks unconditional production launch: row-level security (RLS), which the security documentation presents as the last-line backstop for tenant isolation, covers only 9 of the roughly 19 tenant-scoped tables. The ten payroll-compliance tables added after the original RLS migration (PayrollProfile, PayrollSettings, EarningType, DeductionType, ComplianceRecord, BankExport, PayrollItem, EmployeeSalaryHistory, EmployeeNumberConfig, TenantLeavePolicy) have no RLS policy at all. Several server actions that touch those tables use `where: { id }` or `where: { employeeId }` without a tenantId predicate, and because the RLS backstop is absent there, a signed-in HR user of tenant A who knows or guesses a row id from tenant B can read, update, or delete tenant B's data. PayrollSettings also holds the encrypted Netcash keys and statutory reference numbers, so this is a real cross-tenant exposure of financially sensitive data.

A second cluster of issues concerns the payroll calculator: it is well constructed and Decimal based, but it hardcodes the tax constants and UIF ceiling and ignores the per-tenant PayrollSettings the UI collects, and the `unpaidLeaveDays` support that exists in the calculator is never wired into an actual payroll run. The tax tables are labelled 2026/27 and must be confirmed against the gazetted Budget 2026 figures before real money moves.

None of these are architectural dead ends. They are finite, well-located fixes. With the RLS gap closed and the tenant-scoping predicates added, NovaHR is suitable for a controlled paid beta. It is not yet suitable for unrestricted self-serve production onboarding.

Recommendation: Ready for Limited Beta.

---

## 2. Overall Scorecard

Overall score: 6.8 / 10

| Dimension | Score | One-paragraph justification |
| --- | --- | --- |
| Product Quality | 7.5 | Feature coverage is broad and coherent: onboarding, employee directory, SA leave types, payroll runs with approval, compliance tracking, Netcash batch submission, payslip studio, invites, and trial billing. The product tells a complete story. Points lost because some collected settings (tenant UIF ceiling, SDL rate, unpaid leave) do not actually flow into calculations, so the product promises configurability it does not fully honour. |
| User Experience | 7.0 | Flows are logical with good empty states, toasts, confirmations on destructive and financial actions, and role-tailored dashboards. The payroll two-step (start then finalize) is clear. Some friction remains: settings are dense, the workspace reloads wholesale after mutations, and there is no undo on payroll completion. |
| UI Design | 8.0 | Consistent shadcn/radix based system, coherent tokens, dark mode, a proper button and contrast pass, tabular numerics for money, and a polished payslip studio with live preview. This is the strongest dimension. |
| Performance | 6.0 | Server actions keep payloads lean and the workspace loads in one round trip, but that single query pulls the entire tenant workspace (employees, payslips, activity, notifications) on every dashboard mount and re-runs fully after each mutation. First-load JS per route sits around 650 KB to 1.3 MB. No N+1 in the hot paths thanks to `Promise.all`, but the approval action does loop employee lookups one by one. |
| Security | 4.5 | Strong foundations (middleware gate, session-derived tenant, AES-256-GCM key encryption, hashed invite tokens, escaped email and XML, sensible headers) undermined by an incomplete RLS backstop on ten sensitive tables combined with un-scoped `where: { id }` queries, producing an exploitable cross-tenant IDOR. This is the score that gates the launch decision. |
| Reliability | 6.5 | Transactions wrap multi-row writes, the calculator is deterministic and Decimal based, and Netcash calls have timeouts and typed error states. But there is no idempotency key on Netcash batch submission, no retry ledger, and payslip emails are fired best-effort with `void` so failures are silent. |
| Code Quality | 8.0 | Clean, consistent TypeScript, small focused modules, meaningful comments that explain the why, no dead TODOs, zero lint errors, zero type errors. A few oversized files and some duplicated signup logic, but overall high. |
| Maintainability | 7.5 | Clear folder-by-domain layout, a single db-context helper, typed mappers between Prisma rows and domain types, and a documented security model. The duplication between the two signup paths and the settings upsert boilerplate are the main drags. |
| Scalability | 6.0 | Multi-tenant schema with per-tenant indexes and cuid keys scales horizontally, and pgbouncer pooling is configured. The full-workspace fetch pattern and the lack of pagination on employees, payslips, and leave will strain a tenant with thousands of employees. Activity and notifications are already capped at 100. |
| Test Coverage | 6.5 | 244 unit and integration tests with genuinely good coverage of the calculator, business-day logic, mappers, SA validation, and several server actions. But there are no end-to-end tests, no React component tests, and the un-scoped tenant-isolation paths are exactly what the tests do not exercise. Playwright is a dependency with no specs. |
| Documentation | 8.0 | Unusually strong: security.md, database.md, data-layer.md, auth.md, a UAT checklist, a testing roadmap, and four role-specific PDF manuals. The main gap is that security.md overstates RLS coverage, which is itself a risk. |
| Accessibility | 6.0 | Focus-visible rings, aria-labels on icon buttons, semantic headings, and keyboard-operable radix primitives give a reasonable baseline. Gaps: 6 eslint a11y warnings including a missing alt prop, limited aria-live for async status, and no evidence of a full WCAG AA contrast audit on the custom accent colours. |
| Developer Experience | 8.0 | One command test, clean tsc, fast Vitest (about 2.3s), a single .env file for app and Prisma CLI, seed script, and a CI pipeline. Onboarding a new developer would be quick. |
| Production Readiness | 5.0 | Build is green and the app deploys, but no error monitoring, no health check endpoint, no rate limiting, no backup or rollback runbook, and the open tenant-isolation gap keep this below the line for unrestricted production. |

---

## 3. Architecture Assessment

Folder structure is domain-oriented and easy to navigate: `src/lib/<domain>/actions.ts` for server actions, `src/components/<domain>` for UI, `src/app/(app)/<route>` for pages, with a clean separation between the marketing/auth routes and the authenticated `(app)` group. Data access is centralised through two helpers: `src/lib/prisma.ts` (a singleton client on the pg adapter) and `src/lib/db-context.ts` (`runAsTenant`, which opens a transaction and sets the `app.tenant_id` Postgres session variable). Domain types live in `src/lib/types.ts` and are produced from Prisma rows by pure mapper functions in `src/lib/workspace/mappers.ts`, which is a good boundary that keeps Prisma types out of the client.

State management on the client is a single `AppProvider` reducer (`src/lib/store/app-provider.tsx`, 382 lines) that mirrors server mutations optimistically-ish (it dispatches the server result into local state). This is clean but couples the whole app to one large context, and after `SET_TENANT` it refetches the entire workspace.

Separation of concerns is generally good. The calculator is pure and side-effect free. Server actions handle authz, transactions, and email. The Netcash SOAP client is isolated under `src/lib/services/netcash` and `src/lib/bank-exports/netcash.ts`.

Oversized files (line counts):
- `src/demo/employees.ts` 1153 (demo seed data, not shipped logic)
- `src/lib/payroll/pdf.tsx` 903 (four payslip templates in one file; a candidate for splitting per template)
- `src/components/ui/sidebar.tsx` 702 (vendored shadcn component, acceptable)
- `src/app/(app)/deductions/page.tsx` 658 (page doing too much; extract table and dialogs)
- `src/components/settings/payslip-studio.tsx` 527
- `src/components/payroll/payroll-run-detail.tsx` 397

Duplicated logic: the two signup entry points (`createCompanyAccount` and `completeGoogleSignup` in `src/app/signup/actions.ts`) repeat the tenant + user + first-run creation block almost verbatim; `deriveInitials` is defined in at least two files (signup actions and invites actions); the settings upsert pattern (`upsert where tenantId, spread data`) is copy-pasted across roughly eight actions. Coupling is otherwise low.

Data layer design is sound: cuid primary keys, `@@index([tenantId])` on every tenant-scoped model, cascade deletes from Tenant down, and a compound unique on ComplianceRecord and LeaveBalance. The notable design smell is the Netcash schema drift discussed in section 6 (the migration adds `netcashServiceKey` while the schema declares `netcashSalaryKey` and `netcashAccountServicesKey`).

---

## 4. Code Quality Assessment

Consistency is high. Naming is uniform (`somethingAction` or `somethingRecord` for server actions, `map*` for mappers), imports are ordered, and the codebase honours its own no-em-dash writing rule. `npx tsc --noEmit` returns clean and `npx eslint src` returns 0 errors. There is no `console.log` in shipped code (only intentional `console.error` diagnostics), and there are no stray TODO/FIXME/HACK markers.

Dead and stale code:
- The demo layer (`src/demo/*`, about 2500 lines) is production-imported in two live components: `exco-dashboard.tsx` and `tenants/tenant-card.tsx` compute headcount and group payroll from hardcoded demo employees rather than the tenant workspace. For the exco and multi-tenant views this means the numbers shown are fictional demo data, not the signed-in tenant's real data. This is both a correctness bug and a data-leakage-of-fake-data concern and should be treated as a functional defect, not just dead code.
- `getPayrollConfig` in `src/lib/config/payroll.ts` returns empty reference numbers and is largely superseded by DB-backed settings; it is close to vestigial.
- `generateNetcashNifAction` builds a NIF with an empty `serviceKey` (`const serviceKey = "";`), so the generated file is only useful for preview, not submission. This is intentional but easy to misread.

Unused imports: none found by eslint. A handful of deliberate `eslint-disable` for unused destructured fields (stripping non-column keys before Prisma writes), which is a reasonable pattern.

Estimated technical debt: approximately 12 to 16 person-days. Roughly 3 days to close the RLS and tenant-scoping gaps, 3 to 4 days to wire tenant settings and unpaid leave into the calculator and re-verify tax tables, 2 days to replace demo-data-backed dashboards with real queries, 1 day to reconcile the Netcash schema naming, and 3 to 4 days for monitoring, health checks, and rate limiting.

---

## 5. Security Assessment

### CRITICAL

C-1. Incomplete RLS coverage plus un-scoped queries yield cross-tenant IDOR.
Files: `prisma/migrations/20260619000000_enable_rls/migration.sql`, `src/lib/deductions/actions.ts` (updateEarningTypeAction, toggleEarningTypeAction, deleteEarningTypeAction, and the DeductionType equivalents), `src/lib/pay-profiles/actions.ts` (getPayrollProfileAction, upsertPayrollProfileAction use `where: { employeeId }`), `src/lib/compliance/actions.ts` (markComplianceSubmittedAction uses `where: { id: recordId }`).
The RLS migration protects only Employee, LeaveBalance, LeaveRequest, Department, PayrollRun, Payslip, ActivityItem, NotificationItem, and later Invite. The ten payroll-compliance tables have no policy. `runAsTenant` still sets `app.tenant_id`, but with no policy on those tables it is a no-op there. Several actions then query by primary key or by employeeId without a tenantId predicate. Because `requireTenant` validates only that the passed tenantId matches the session, an authenticated HR user can pass their own tenantId while supplying a foreign row id and the query will read or mutate another tenant's earning types, deduction types, payroll profile, compliance records, or (via BankExport) banking data. PayrollSettings, which stores the encrypted Netcash keys, is in the unprotected set.
Fix: add `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, and a `tenant_isolation` policy to all ten tables (mirroring the existing pattern, using the parent Employee lookup where the table is keyed by employeeId), and independently add explicit `tenantId` predicates to every `where` in these actions as defense in depth. This should be treated as a launch blocker.

### HIGH

H-1. No rate limiting anywhere.
Files: `src/middleware.ts`, all server actions, `src/app/signup/actions.ts`, `src/lib/invites/actions.ts`, `src/lib/marketing/contact-action.ts`.
There is no throttling on login, signup, invite acceptance, Netcash key testing, or the public contact form. Signup and invite acceptance both create Supabase Auth users and can be abused for enumeration or resource exhaustion. Netcash key testing proxies to an external SOAP service and could be used to hammer it.
Fix: add per-IP and per-account rate limiting (Upstash Redis or Vercel Firewall rules) on auth, invite, and any action that calls an external service.

H-2. Netcash batch submission has no idempotency protection.
Files: `src/lib/bank-exports/actions.ts` (submitNetcashBatchAction), `src/lib/bank-exports/netcash.ts` (submitNifBatch).
A double click or a client retry after a slow response can submit the same salary batch twice, paying employees twice. There is no submission ledger row created before the call, no dedupe token, and the network path explicitly warns the batch may have been received on timeout while returning an error.
Fix: create a BankExport row in `pending` before submitting, key it to the run, reject a second submission for a run that already has a non-cancelled export, and store the Netcash file token.

H-3. Content-Security-Policy allows `unsafe-inline` and `unsafe-eval` for scripts.
File: `next.config.ts`.
The script-src directive permits inline and eval, which substantially weakens XSS protection. This is common with some Next.js setups but should be tightened with a nonce-based policy before handling real payroll data.
Fix: move to nonce or hash based script-src and drop unsafe-eval.

### MEDIUM

M-1. Storage bucket authorization not verifiable from the app code.
Files: `src/components/employees/avatar-upload.tsx`, `src/components/leave/new-leave-request-dialog.tsx`.
Uploads go directly from the browser to Supabase Storage buckets (`employee-photos`, leave docs) using the anon client, with tenant-prefixed paths. The security of these objects depends entirely on Supabase Storage RLS policies that are not in the repo. Avatar URLs use `getPublicUrl`, implying a public bucket, which means employee photos may be world-readable if the bucket is public. Leave documents (which may contain medical certificates, POPIA special personal information) must not be in a public bucket.
Fix: confirm and commit the Storage policies; make the leave-documents bucket private and serve via signed URLs; validate file type server-side, not only by client accept attribute.

M-2. Service-role key used in a server action reachable by unauthenticated callers.
File: `src/lib/invites/actions.ts` (acceptInviteAction).
`acceptInviteAction` is a public server action that uses `SUPABASE_SERVICE_ROLE_KEY` to create a confirmed auth user. The token check is solid (SHA-256 hash lookup, status and expiry checks), but combined with H-1 (no rate limit) this is a sensitive surface. Keep the key strictly server-only (it is) and add throttling.

M-3. Sensitive diagnostics in error paths.
Files: `src/lib/services/netcash/client.ts`, `src/lib/bank-exports/netcash.ts`.
The Netcash client logs faults and truncated response bodies to `console.error`. The code is careful to avoid logging service keys, which is good, but response snippets could still contain identifiers in some fault conditions. Route these through a structured logger with redaction once monitoring is added.

M-4. Payslip PII: masking is applied in the PDF but the full workspace payload still ships ID and tax numbers to privileged clients.
Files: `src/lib/payroll/pdf.tsx` (maskId, maskAccount are used, good), `src/lib/workspace/actions.ts`.
The PDF correctly masks ID and account numbers. However HR and exco clients receive full unmasked idNumber, taxNumber, and bank account numbers for every employee in the workspace payload. That is arguably necessary for HR, but exco rarely needs raw ID numbers, and this widens the blast radius of any client-side compromise.

### LOW

L-1. Demo credentials are shipped in the client bundle. `src/lib/auth/demo-users.ts` embeds persona passwords and is imported by `src/app/login/page.tsx`, so demo passwords are in the public JS. Acceptable only if the demo tenant is truly disposable and isolated; remove before serving real customers, or gate the demo picker behind a non-production flag.

L-2. `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'` are set, good, but there is no `Strict-Transport-Security` header. Add HSTS.

L-3. Password policy is an 8-character minimum with no complexity or breach check. Consider raising to 10 and adding a breached-password check.

Positives worth recording: session-derived tenant everywhere in core actions, invite tokens stored only as SHA-256 hashes, AES-256-GCM authenticated encryption for Netcash keys with the key sourced from `NETCASH_ENCRYPTION_KEY` and validated as 32 bytes, XML and email HTML escaping, middleware route protection that runs before any page code, and role-scoped workspace sanitisation for non-privileged users.

---

## 6. Database Assessment

Schema design is clean and normalised. Every tenant-scoped model carries `tenantId` with an index and a cascade relation to Tenant. Keys are cuid, money is stored as Float (see caveat below), enums are used well for statuses and categories, and useful compound uniques exist (`ComplianceRecord(tenantId, period, type)`, `LeaveBalance(employeeId, type)`, `Invite.tokenHash`, `PayrollProfile.employeeId`).

Findings:
- D-1 (High). RLS is applied to only 9 of the tenant-scoped tables; ten payroll-compliance tables have none (see C-1). This is a database-level defect.
- D-2 (Medium). Money is stored as `Float`. The runtime calculator correctly uses decimal.js, but persisted totals (Payslip.netPay, PayrollRun.totalGross, BankExport.totalAmount) are IEEE-754 doubles. For financial records the store should be `Decimal`/numeric to avoid drift on aggregation and reporting.
- D-3 (Medium). Schema drift: migration `20260623000000_add_netcash_settings` adds a column named `netcashServiceKey`, while `schema.prisma` declares `netcashSalaryKey` and `netcashAccountServicesKey`. The two key model in the schema and code does not match the single-key migration. Either a later migration reconciles this outside the repo, or the deployed database and the Prisma schema disagree. This must be verified before launch; a `prisma migrate diff` against production is warranted.
- D-4 (Low). No explicit foreign key from `User.employeeId` is enforced beyond the optional relation; fine, but `approvedBy`, `decidedBy`, `changedBy`, `invitedBy` are free-form strings rather than user id relations, which weakens audit integrity (names can change or collide).
- D-5 (Low). No partitioning or archival strategy for Payslip, PayrollItem, and ActivityItem, which grow unbounded per tenant per month.

Migrations are ordered and use a lock file. Indexing is adequate for current query patterns. Scalability is acceptable to the low thousands of employees per tenant; beyond that, add pagination and consider numeric money columns.

---

## 7. API / Server Action Assessment

There is no REST surface; all mutations are server actions, which reduces the attack surface and centralises authz. Authorization is applied consistently: every inspected action calls `requireUser`, `requireRole`, `requireTenant`, or `requireEmployeeScope` as its first statement. The role matrix is coherent (HR/exco privileged, managers scoped to reports, employees to self), and `decideLeaveRequestRecord` correctly forbids managers deciding their own or non-reports' requests.

Validation is uneven. The public and identity-adjacent actions use zod (signup, invite create, invite accept, SA schemas for ID/phone/bank). Many internal mutations (employee update, tenant update, payroll settings, deductions) take typed objects but do not zod-validate at the boundary, trusting TypeScript types that do not exist at runtime. For a system handling money and PII, server-side zod validation should be universal, not selective.

Response consistency is good within a domain but mixed across the codebase: some actions return `{ success, error }`, some throw, some return `{ status: "error", message }`. Error handling generally catches and returns a message, though a few actions leak raw `err.message` to the client (deductions, settings), which can expose internals.

The most important API-layer defect is the tenant-scoping gap described in C-1: `requireTenant(tenantId)` authorises the tenant but the subsequent query is keyed by a foreign id without a tenant predicate, and RLS does not backstop it on those tables.

---

## 8. Performance Assessment

Build artefacts are present in `.next`. First-load JS by route (approximate, from the app build manifest):
- Dashboard 1.34 MB, Reports 1.11 MB, app layout 1.01 MB, employee profile 0.96 MB, settings 0.92 MB, new employee 0.91 MB, leave 0.88 MB, deductions 0.80 MB, payroll 0.77 MB.
These are heavy for a data app. The main contributors are recharts (dashboard, reports), framer-motion (page transitions), and react-day-picker. `@react-pdf/renderer` is correctly server-external and dynamically imported at the payslip call sites, which is the right pattern.

Data access:
- The workspace fetch (`getTenantWorkspace`) is a single `Promise.all` of eight queries, so no N+1 there, but it loads the entire tenant (all employees with balances, all payslips, all leave, all runs) on every dashboard mount and again after each mutation via `SET_TENANT`/refetch. For a 500-employee tenant this is a large, repeated payload.
- `approvePayrollRunAction` loops `tx.employee.findUnique` once per payslip to send emails, which is an N+1 inside the transaction. Batch this with a single `findMany`.
- No pagination on employees, payslips, or leave lists. Activity and notifications are capped at 100, which is good.
- No caching layer; every navigation refetches. Next.js caching and `use cache` are not employed.

Top recommendations and expected gains:
1. Paginate and lazily load the directory and payslip lists, and stop refetching the whole workspace after single-row mutations (dispatch the returned row only, which the reducer already supports). Expected: 40 to 70 percent reduction in post-mutation data transfer for medium tenants.
2. Code-split recharts and framer-motion out of the shared layout so non-dashboard routes do not pay for them. Expected: 200 to 400 KB off several routes.
3. Batch the approval email lookups into one query. Expected: removes an N+1 that scales with headcount.

---

## 9. UX Assessment

Onboarding (signup): a two-field company + admin signup creates the tenant, the first HR user, and a first scheduled payroll run so the payroll page is never empty. That last touch is thoughtful. The tenant is created with placeholder legal details that are editable later. Click count to a working workspace is low (about 3). Google signup has a dedicated completion step to capture company name.

Employee creation: a multi-step wizard (personal, role, compensation, review) with SA-aware validation (ID number Luhn check, phone, bank account, branch code). Employee numbers auto-generate from a configurable format. Good.

Payroll run lifecycle: a clear two-stage model, start (status processing) then finalize (generates payslips, computes totals, creates next run, optionally routes to approval). Confirmation dialogs guard finalization, and projected gross/net are shown before commit. Approval, when enabled, gates payslip emails until the designated approver signs off, which is correct. Weaknesses: there is no way to undo or reverse a completed run from the UI, and unpaid leave entered elsewhere does not reduce pay in the run (the calculator supports it but the run does not pass it).

Leave: request dialog computes working days excluding weekends and SA public holidays, shows balance impact and an over-limit warning, supports a document upload, and routes approvals to HR and managers with email. Strong flow.

Settings: consolidated but dense. The payslip studio with live preview is a highlight. The concern is that some settings (tenant UIF ceiling, SDL rate, unpaid leave behaviour) are collected but not consumed by the calculator, which will confuse an HR admin who changes a rate and sees no effect.

Empty states, toasts, and loading skeletons are present across routes (`loading.tsx`, `error.tsx` per route group). Overall UX is above average for the stage; the main risks are silent settings and irreversible payroll.

---

## 10. Accessibility Assessment

Baseline is reasonable. The button system defines `focus-visible` rings and `aria-invalid` styling, icon-only buttons carry `aria-label` (for example the avatar upload and the password reveal toggle), radix primitives bring keyboard operability and roles for dialogs, menus, and tables, and headings are semantic.

Gaps against WCAG 2.1 AA:
- eslint reports 6 a11y warnings, including at least one image element missing an alt prop.
- Async status changes (payroll processing, upload progress) rely on toasts and spinners without `aria-live` regions, so screen reader users may miss state transitions.
- Only 28 `aria-label` occurrences across 36 files that use any aria attribute; many custom clickable `div`/`button` compositions in dashboards were not individually verified for name and role.
- The custom accent colour system (payslip accent, status badges) has not been run through a formal contrast checker at AA thresholds; some muted-foreground on muted-background combinations are visually light.
- No skip-to-content link was found.

None are blockers, but a dedicated AA pass with axe and a screen reader is warranted before onboarding customers with accessibility obligations.

---

## 11. Testing Assessment

244 tests across 25 files, all passing, running in about 2.3 seconds. What they actually cover:
- Payroll calculator: 22 tests, the strongest area (brackets, rebates, UIF cap, medical credits, pension s11F cap, rounding).
- SA validation schemas: 21 tests (ID Luhn, phone, bank).
- Marketing pricing: 21. Format helpers: 29. Mappers: 18. Store reducer: 16. Business days: 14. Employee factory: 13. Netcash auth: 11. Payslip print HTML: 11.
- Server actions: employees 8, leave 6, workspace 5, tenant 5, payroll 3, notifications 2, compliance indirectly.

Coverage gaps in priority order:
1. Tenant isolation tests. There is no test that asserts a user of tenant A cannot read or mutate tenant B's rows, which is precisely the area with the live defect (C-1). Add integration tests that attempt cross-tenant access on every action, especially the payroll-compliance tables.
2. Authorization matrix tests. Assert that each role is rejected on actions it should not reach (employee calling payroll, manager deciding own leave, non-approver approving a run).
3. End-to-end tests. Playwright is installed but there are zero specs. Add E2E for signup, employee onboarding, a full payroll run, leave request and approval, and invite acceptance.
4. Component tests. No React component tests exist; add them for the payroll run card, leave dialog validation, and the payslip studio.
5. Netcash submission idempotency and error-path tests (double submit, timeout, fault codes).

---

## 12. DevOps Assessment

CI (`.github/workflows/ci.yml`) runs on non-main pushes and PRs to main: install, prisma generate, lint, tsc, test, on Node 22. This is a solid gate. Gaps: it does not run `next build`, so a build regression can reach main; it does not run migrations against a throwaway database or a `prisma migrate diff`, so schema drift (D-3) would not be caught.

Environment management is clean: a single `.env` read by both Next.js and the Prisma CLI, a well-documented `.env.example` listing DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_ENV, RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_APP_URL. Note: NETCASH_ENCRYPTION_KEY is required by the crypto module but is not listed in `.env.example`, so a deployer could miss it and break Netcash key storage. Add it (name only) to the example.

Missing operational capabilities:
- No error monitoring or reporting (no Sentry or equivalent). Server action failures surface only as `console.error`.
- No health check endpoint for uptime monitoring.
- No documented backup or restore procedure beyond Supabase defaults, and no rollback runbook for a bad payroll run.
- No structured logging; diagnostics are `console.error` strings.
- No feature flag to disable the demo login picker in production.

Deployment to Vercel is straightforward and the build is green, but production observability is essentially absent.

---

## 13. Compliance Assessment (POPIA and payroll)

NovaHR handles special personal information under POPIA: ID numbers, bank details, salary, and potentially medical certificates in leave documents. Observations:
- Data minimisation and access: role-scoped sanitisation of the workspace payload for non-privileged users is a genuine POPIA-aligned control. Good.
- The cross-tenant IDOR (C-1) is a POPIA breach risk: it can expose one responsible party's employee financial data to another. This alone justifies the Limited Beta ceiling.
- Leave documents may be stored in a public Storage bucket (M-1). Medical certificates in a public bucket would be a serious POPIA violation. Must be private with signed URLs.
- Retention: there is no data retention or deletion policy in code. SARS requires payroll records for 5 years; POPIA requires deletion when no longer needed. There is no scheduled archival or right-to-erasure workflow.
- Audit logging: ActivityItem records hires, leave decisions, payroll runs, and settings changes, which is a reasonable audit trail, but the actor is a display name string rather than a user id, weakening non-repudiation (D-4). Netcash credential changes are logged, which is good.
- Consent and privacy: a privacy page and terms exist, and the privacy copy states only strictly necessary cookies are used, consistent with the code (no analytics found).
- Financial data protection: Netcash keys are encrypted at rest with AES-256-GCM; this is the right control. Bank account numbers are stored in plaintext columns, which is standard for payroll but should be documented in the data protection impact assessment.

Overall the compliance posture is thoughtful but has two concrete blockers (C-1, and the leave-document bucket) and one policy gap (retention and erasure).

---

## 14. Payroll Module Deep Dive

Calculation engine (`src/lib/payroll/calculator.ts`). The engine is Decimal based with ROUND_HALF_UP, which is the correct posture for payroll. It implements progressive brackets with a stored `prevUpTo` per bracket to avoid off-by-one errors, age-based primary/secondary/tertiary rebates derived from date of birth (decoded from the SA ID number), the section 6A medical aid tax credit (main + first dependant + per additional dependant), the section 11F pension deduction cap (lesser of 27.5 percent of remuneration and R430,000), an 80/20 travel allowance inclusion depending on a logbook flag, UIF at 1 percent with a monthly cap that scales by pay frequency, and SDL at 1 percent gated on a R500,000 annual payroll threshold. This is a sophisticated and largely correct model, better than many commercial competitors expose.

Correctness caveats:
- CV-1 (High, verify before launch). The tax constants are labelled 2026/27 (brackets topping the 18 percent band at R245,100, primary rebate R17,820, medical credits R376/R376/R254). Since the current tax year at audit date is 2026/27, using projected figures is appropriate in principle, but these values must be reconciled line by line against the gazetted 2026 Budget tax tables. The medical credit of R376 in particular differs from the prior year and should be confirmed. The tests lock in these constants, so if the constants are wrong the tests will pass while the payroll is wrong. Treat the tax tables as an authority-verified input, not a self-checked one.
- CV-2 (High). The calculator hardcodes the UIF ceiling (R177.12 monthly) and the SDL and UIF rates, and does not read the per-tenant PayrollSettings (uifCeiling, uifEmployeeRate, sdlRate, sdlEnabled, uifEnabled). The settings UI lets HR change these with no effect on actual pay. Either wire the settings through or remove them from the UI to avoid a compliance-relevant illusion of control.
- CV-3 (Medium). `unpaidLeaveDays` is a fully implemented calculator input, but `completePayrollRunRecord` never passes it, so unpaid leave never reduces pay in a real run. The workingDaysInMonth default is a flat 21.
- CV-4 (Low). SDL liability is derived from summed annual gross at run time rather than from the tenant registration status; a small employer under the threshold is correctly exempt, but there is no override for tenants who are SDL-registered regardless.

Payslip generation. `pdf.tsx` renders four templates, masks ID and bank account numbers, and is dynamically imported to keep it off the main bundle. Persisted payslip line items are also normalised into the PayrollItem table for structured querying, which is good data design.

Netcash batch flow. `generateNifFile` builds a correct tab-delimited H/K/T/F NIF with sanitisation, cents conversion, and account-type mapping; `submitNifBatch` posts to the NIWS_NIF endpoint with the tempuri.org contract namespace (the RC1 fix) and parses the result including Netcash error codes. The gaps are operational, not format: no idempotency (H-2), best-effort with no persisted submission record before the call, and the CSV/NIF preview action uses an empty service key by design.

Approval workflow. When `requireApproval` and an `approvalUserId` are set, the run goes to `awaiting_approval` and only the designated approver can approve; payslip emails are held until approval. Rejection returns the run to processing. This is a correct, if minimal, maker-checker control. It is undermined slightly by the fact that approval is off by default.

Audit trail. Runs, approvals, and settings changes write ActivityItem rows; the actor is a name string (D-4).

Net assessment: the calculator is the best part of the product and is close to production-correct, but it must be decoupled from hardcoded constants, wired to tenant settings and unpaid leave, and its tax tables independently verified before any real salary is paid.

---

## 15. Competitor Comparison

Versus BambooHR, HiBob, Employment Hero, Sage HR (formerly CakeHR), and Zoho People.

Where NovaHR competes or wins:
- SA-native statutory payroll (PAYE with age rebates, medical credits, s11F, UIF cap, SDL threshold) with Netcash NIWS batch payment is a genuine local advantage over BambooHR and HiBob, which are not built for SA payroll and rely on partners. Sage HR and Employment Hero have SA/regional payroll but NovaHR's calculator transparency is competitive.
- Payslip studio with live preview and four templates is a nicer authoring experience than Zoho People's and comparable to Sage.
- Clean role-based experience, per-role dashboards, and modern UI match or exceed Sage HR and Zoho on polish.
- Single-tenant-per-user simplicity plus an exco multi-company view is a differentiator for SA groups.

Where NovaHR lags:
- No employee self-service mobile app; competitors all ship native apps.
- No time tracking, attendance, shift scheduling, or expense management (Employment Hero and Zoho are far broader suites).
- No performance reviews, goals, or engagement surveys (BambooHR and HiBob core strengths).
- No integrations marketplace, no API for customers, no SSO/SAML for enterprise (all competitors offer these).
- No org chart, no ATS/recruiting, no benefits administration beyond medical aid fields.
- Reporting is basic versus BambooHR's and Zoho's analytics.
- Operational maturity (monitoring, SLAs, audit certifications like ISO 27001, SOC 2) is absent; enterprise buyers will ask.

Positioning: NovaHR is a credible SA SMB HR-and-payroll challenger on the strength of local payroll correctness and UI polish, but it is a point solution, not yet a suite, and lacks the operational and integration surface enterprise buyers expect.

---

## 16. Production Readiness Decision

Decision: Ready for Limited Beta.

Justification: The application is functionally coherent, type-clean, tested at the unit level, and built on a sound architecture with several strong security controls. It is emphatically not internal-testing-only. However, it cannot be declared ready for unrestricted production because of one confirmed cross-tenant data exposure (C-1: ten tables without RLS plus un-scoped id queries, including the table that stores encrypted Netcash keys), an unverified tax-table basis for real salary calculations (CV-1), a settings-versus-calculator disconnect (CV-2), a double-payment risk on batch submission (H-2), no rate limiting (H-1), a possible public bucket for medical documents (M-1), and no production observability. A controlled beta with a small number of vetted tenants, close monitoring, the RLS gap closed, and Netcash submission guarded is the responsible next step. Promote to full production once the Week 1 and Week 2 items below are complete and independently verified.

---

## 17. Prioritised Issue Register

| ID | Title | Severity | Area | Effort |
| --- | --- | --- | --- | --- |
| C-1 | Ten tables lack RLS; un-scoped id/employeeId queries enable cross-tenant IDOR | Critical | Security/DB | 2 to 3 d |
| CV-1 | 2026/27 tax tables unverified against gazetted Budget 2026 | High | Payroll | 1 d |
| CV-2 | Calculator ignores per-tenant PayrollSettings (UIF ceiling, rates, SDL) | High | Payroll | 1 to 2 d |
| H-1 | No rate limiting on auth, invite, contact, Netcash test | High | Security | 1 to 2 d |
| H-2 | Netcash batch submission not idempotent (double-pay risk) | High | Payroll/Reliability | 1 to 2 d |
| H-3 | CSP allows unsafe-inline and unsafe-eval | High | Security | 0.5 d |
| D-2 | Money stored as Float | Medium | DB | 1 to 2 d |
| D-3 | Netcash column schema drift (netcashServiceKey vs salary/accountServices) | Medium | DB | 0.5 d |
| CV-3 | Unpaid leave never wired into a real run | Medium | Payroll | 0.5 d |
| M-1 | Storage bucket policies unverified; leave docs may be public | Medium | Security/Compliance | 1 d |
| M-2 | Public service-role action needs throttle | Medium | Security | folded into H-1 |
| M-3 | Unredacted diagnostics in Netcash error paths | Medium | Security | 0.5 d |
| M-4 | Full ID/tax numbers shipped to exco clients | Medium | Security | 0.5 d |
| DEMO-1 | exco-dashboard and tenant-card compute from demo data, not real | Medium | Correctness | 1 d |
| VAL-1 | Server actions not uniformly zod-validated | Medium | API | 1 to 2 d |
| PERF-1 | Full workspace refetch after single-row mutations; no pagination | Medium | Performance | 2 d |
| PERF-2 | N+1 employee lookups in approval action | Low | Performance | 0.5 d |
| OPS-1 | No error monitoring, health check, or rollback runbook | Medium | DevOps | 2 d |
| OPS-2 | NETCASH_ENCRYPTION_KEY missing from .env.example; CI does not build | Low | DevOps | 0.5 d |
| A11Y-1 | 6 eslint a11y warnings; no aria-live; no AA contrast audit | Low | Accessibility | 1 to 2 d |
| D-4 | Audit actor is a name string, not a user id | Low | Compliance | 1 d |
| L-1 | Demo credentials in client bundle | Low | Security | 0.5 d |
| L-2 | No HSTS header | Low | Security | 0.25 d |
| RET-1 | No data retention or erasure policy (POPIA/SARS) | Medium | Compliance | 2 d |
| TEST-1 | No tenant-isolation, authz-matrix, or E2E tests | High | Testing | 3 to 4 d |

---

## 18. Quick Wins, Medium, and Long-Term

Quick wins (one day or less each):
- Add HSTS; drop unsafe-eval from CSP (H-3, L-2).
- Add NETCASH_ENCRYPTION_KEY to .env.example and add `next build` to CI (OPS-2).
- Reconcile the Netcash column naming and run `prisma migrate diff` against production (D-3).
- Wire `unpaidLeaveDays` into `completePayrollRunRecord` (CV-3).
- Batch the approval email lookups into one findMany (PERF-2).
- Gate the demo login picker behind a non-production flag; stop importing demo passwords in production (L-1).
- Stop refetching the whole workspace after single-row mutations (the reducer already handles single rows) (part of PERF-1).

Medium improvements (under one week):
- Close C-1: add RLS to the ten tables and add explicit tenantId predicates to the affected actions, plus tenant-isolation tests (C-1, TEST-1).
- Wire PayrollSettings into the calculator and verify the tax tables against Budget 2026 (CV-1, CV-2).
- Add idempotency to Netcash submission with a pre-submit ledger row (H-2).
- Add rate limiting on auth, invite, contact, and Netcash test (H-1, M-2).
- Confirm and privatise the leave-document bucket; serve via signed URLs; add server-side file validation (M-1).
- Replace demo-data dashboards with real tenant queries (DEMO-1).
- Add zod validation to the remaining mutating actions (VAL-1).

Long-term improvements:
- Migrate money columns to numeric/Decimal and add reconciliation reporting (D-2).
- Add error monitoring (Sentry), a health endpoint, structured redacted logging, and a documented backup/rollback runbook (OPS-1).
- Build a data retention and right-to-erasure workflow for POPIA and 5-year SARS retention (RET-1).
- Add E2E and component test suites; introduce pagination across large lists (TEST-1, PERF-1).
- Full WCAG AA pass (A11Y-1).
- Broaden the suite toward competitor parity: self-service mobile, time and attendance, SSO/SAML, an integrations API.

---

## 19. Technical Debt Summary

Estimated total debt: 12 to 16 person-days to reach unconditional production readiness, of which roughly 6 to 8 days are launch-blocking (RLS and scoping, tax verification, settings wiring, Netcash idempotency, rate limiting, bucket privacy). The debt is concentrated and well-located rather than diffuse, which is a good sign. The highest-leverage single fix is C-1, because it simultaneously closes a security hole, a database defect, and a compliance risk, and because the existing RLS pattern makes the fix mechanical. The second-highest is decoupling the calculator from hardcoded constants, because it converts an unverifiable engine into a configurable, auditable one. Secondary debt (Float money, demo-data dashboards, schema drift, missing monitoring) is real but non-blocking for a controlled beta.

---

## 20. 30-Day Improvement Roadmap

Week 1, critical fixes and launch blockers:
- Implement RLS on PayrollProfile, PayrollSettings, EarningType, DeductionType, ComplianceRecord, BankExport, PayrollItem, EmployeeSalaryHistory, EmployeeNumberConfig, TenantLeavePolicy; add tenantId predicates to the affected actions; write cross-tenant isolation tests (C-1, TEST-1).
- Verify the 2026/27 tax tables against the gazetted Budget 2026 and pin the source in a comment and a test (CV-1).
- Reconcile Netcash schema drift and diff against production (D-3).
- Add NETCASH_ENCRYPTION_KEY to .env.example; add `next build` to CI (OPS-2).

Week 2, high-impact:
- Wire PayrollSettings (UIF ceiling, rates, SDL toggles) and unpaid leave into the calculator (CV-2, CV-3).
- Add idempotent Netcash submission with a pre-submit ledger row and token storage (H-2).
- Add rate limiting on auth, invite, contact, and Netcash test (H-1, M-2).
- Tighten CSP and add HSTS (H-3, L-2).
- Confirm and privatise Storage buckets; add server-side file validation (M-1).

Week 3, UX and correctness:
- Replace demo-data-backed exco and tenant dashboards with real queries (DEMO-1).
- Add uniform zod validation to mutating actions and consistent error shapes (VAL-1).
- Add an undo/reversal path or a clear irreversibility warning for completed payroll runs.
- Begin E2E coverage for signup, payroll run, and leave (TEST-1).
- Address the eslint a11y warnings and add aria-live to async status (A11Y-1).

Week 4, performance and polish:
- Stop full-workspace refetching after mutations; paginate directory and payslip lists (PERF-1).
- Code-split recharts and framer-motion out of the shared layout (PERF-1).
- Batch approval email lookups (PERF-2).
- Add error monitoring, a health check, and a backup/rollback runbook (OPS-1).
- Draft the data retention and erasure policy (RET-1).

---

## 21. Final CTO Recommendation

NovaHR is a strong, well-engineered product that is closer to production than most SaaS at this stage. The engineering discipline is evident: clean types, a green test suite, a thoughtful security model, an unusually capable SA payroll calculator, and genuinely good documentation. I would be comfortable putting it in front of a small number of vetted, closely-monitored paying customers, which is why the decision is Ready for Limited Beta rather than anything lower.

I would not open unrestricted self-serve production onboarding until the row-level security gap is closed. It is the one finding that could expose one customer's payroll and encrypted payment credentials to another, and it directly contradicts the isolation guarantee the documentation makes. Fortunately it is a mechanical fix using a pattern already present in the codebase. Alongside it, the tax tables must be independently verified and the calculator decoupled from its hardcoded constants before any real salaries are paid, and the Netcash batch path must be made idempotent to remove the double-payment risk.

Do these Week 1 and Week 2 items, add tenant-isolation and authorization tests to prove the fixes, stand up basic monitoring, and NovaHR earns a full production promotion. The foundation is sound; the remaining work is finite, specific, and mostly a few days of focused effort. This is a launch that is weeks away, not months.
