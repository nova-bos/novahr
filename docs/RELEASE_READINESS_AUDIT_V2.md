# NovaHR Release Readiness Audit V2 (Follow-Up Verification)

Prepared as an independent CTO, Principal Architect, Security Consultant, QA Lead, DevOps Engineer, UX Specialist, and Product Manager review.
Audit date: 2026-07-04. Prior audit: docs/RELEASE_READINESS_AUDIT.md, dated 2026-07-03, overall 6.8/10, decision Ready for Limited Beta.

Scope: read-only verification of the remediation commit 952d2cf ("Close audit blockers") against the prior audit's findings, plus re-assessment of the items that were not addressed. Verification performed: `npm test` (254/254 passing across 27 files), `npx tsc --noEmit` (clean), `npx eslint src --quiet` (0 errors; 5 warnings in full mode, down from 6), `git show 952d2cf`, and manual reading of every file the fixes touched plus a fresh grep sweep for unscoped `where: { id }` and `where: { employeeId }` queries across `src/lib` and `src/app`. No source files were modified; this report is the only file written.

---

## 1. Executive Summary

The team addressed every launch blocker from the v1 audit in a single, well-documented commit, and the fixes are real, not cosmetic. The most important change is philosophical as much as technical: the discovery that the Supabase `postgres` role carries BYPASSRLS means row-level security was never enforcing anything for the application connection, on any table, including the nine tables the v1 audit believed were protected. The team responded correctly: instead of treating RLS as the safety net, tenant isolation is now enforced deterministically in application code with explicit `tenantId` predicates on every previously unscoped query, and the new RLS policies on the ten payroll tables are retained as dormant defence-in-depth that will activate if the app ever connects with a non-BYPASSRLS role. This is the right architecture for the constraint they have.

### Per-fix verification results

1. C-1 tenant isolation: CONFIRMED.
   - The migration `prisma/migrations/20260704090000_enable_rls_payroll_tables/migration.sql` exists and adds ENABLE plus FORCE row level security and a `tenant_isolation` policy to all ten previously uncovered tables (PayrollProfile, PayrollSettings, EarningType, DeductionType, ComplianceRecord, BankExport, PayrollItem, EmployeeSalaryHistory, EmployeeNumberConfig, TenantLeavePolicy), mirroring the original policy shape.
   - Application-layer scoping was verified query by query. A repo-wide grep for `where: { id` and `where: { employeeId` on tenant tables found no remaining exploitable unscoped query. Evidence: `src/lib/deductions/actions.ts` now uses `updateMany`/`deleteMany` with `{ id, tenantId }` (lines 82, 99, 115, 199, 216, 233, 240); `src/lib/compliance/actions.ts` scopes `{ id: recordId, tenantId }` (lines 220, 229) and the run lookup (line 142); `src/lib/pay-profiles/actions.ts` verifies the employee belongs to the tenant before the profile upsert (lines 70 to 74) and scopes the read (line 40); `src/lib/invites/actions.ts` revoke uses `updateMany` with `{ id, tenantId }` (line 165); `src/lib/bank-exports/actions.ts` scopes every run lookup (lines 15, 76, 146); `src/lib/payroll/actions.ts` and `approval-actions.ts` verify run ownership before any bare-id update (payroll lines 29 to 35, 56; approval lines 17, 67); `src/lib/leave/actions.ts` scopes the request and employee lookups (lines 39, 117, 123); `src/lib/employees/actions.ts` uses a scoped `findFirst` guard before the update (line 204) with an explicit comment; `src/lib/departments/actions.ts` and `src/lib/notifications/actions.ts` are scoped (departments 57, 78; notifications 10); `terminate-action.ts` scopes the employee lookup (line 21).
   - `requireEmployeeScope` in `src/lib/auth/require.ts` (lines 75 to 98) now verifies that HR and exco targets belong to the caller's tenant before granting scope, closing the remaining bypass for the bare-id employee updates that rely on it.
   - Residual notes: `createBankExportRecordAction` (bank-exports line 277) does not verify the supplied `payrollRunId` belongs to the tenant; the created row lands in the caller's own tenant so this is reference pollution, not cross-tenant exposure, but it should be tightened. There are still no automated cross-tenant isolation tests proving the fix holds under regression.

2. CV-1 tax constants: CONFIRMED (as a code artefact).
   - `src/lib/payroll/calculator.ts` lines 6 to 55 pin the source (National Treasury Budget 2026 Tax Guide, verified against sars.gov.za on 2026-07-04) with rebates 17,820 / 9,765 / 3,249, MATC 376 / 376 / 254, s11F cap R430,000, and the full seven-bracket table. The R99,000 threshold tripwire exists in `calculator.test.ts` (line 51) and is a genuinely good check: 17,820 divided by 0.18 equals exactly 99,000, so the test cross-validates the primary rebate against the first bracket rate. Internal consistency of brackets and bases was re-derived by hand and holds. What this audit cannot do is independently re-fetch the gazetted tables; the claim of line-by-line verification is accepted on the strength of the pinned source and the consistency checks.

3. CV-2 per-tenant statutory settings: CONFIRMED.
   - `calculator.ts` defines `StatutorySettings` and `STATUTORY_DEFAULTS` (lines 30 to 46) and uses `statutory.uifEnabled`, the configured rates, the configured ceiling scaled by pay frequency, and `statutory.sdlEnabled`/`sdlRate` throughout (lines 178 to 198). `completePayrollRunRecord` in `src/lib/payroll/actions.ts` loads the tenant's PayrollSettings (lines 94 to 114) and passes `{ isSDLLiable, statutory }` into every `buildPayslip` call (line 117). The settings-versus-calculator disconnect from v1 is closed for real runs. Note that client-side projections intentionally fall back to defaults, which is documented in a comment; and CV-3 (unpaid leave) remains unwired: `buildPayslip` is never called with `unpaidLeaveDays`.

4. H-2 Netcash idempotency: CONFIRMED.
   - `submitNetcashBatchAction` in `src/lib/bank-exports/actions.ts` (lines 136 to 262) claims a pending BankExport ledger row inside the tenant transaction, refuses if a prior export for the run is `exported` (with an explicit double-payment warning message) or has a fresh `pending` claim, releases stale claims after 10 minutes, submits outside the transaction, records `exported` plus the Netcash file token on success, cancels with a truncated reason on failure, and writes an ActivityItem audit entry. `actions.test.ts` contains the 5 claimed tests. Residual note: there is no database uniqueness constraint backing the ledger (BankExport has only `@@index([tenantId])`), so two truly concurrent requests could both pass the `findFirst` check under read committed isolation before either row commits. The window is milliseconds and requires two warm instances racing, but a partial unique index on (payrollRunId, fileFormat) where status in (pending, exported) would close it outright.

5. H-1 rate limiting: CONFIRMED, with a scope caveat.
   - `src/lib/security/rate-limit.ts` implements a sliding-window limiter with bounded memory and honestly documents the per-warm-instance limitation. It is applied exactly where claimed: invite accept and lookup per client IP (invites 201, 240), invite creation per tenant (invites 90), Netcash key test per tenant (settings 277), contact form per IP (contact-action 21). 13 tests cover it. Caveat: login and signup, which the v1 audit's H-1 explicitly included, remain unthrottled in-app and rely on Supabase and Vercel defaults, as `docs/security.md` itself acknowledges. The riskiest self-hosted surfaces (service-role invite acceptance, external SOAP calls) are covered; credential stuffing on login is not.

6. H-3 CSP hardening: CONFIRMED as claimed.
   - `next.config.ts` drops `unsafe-eval` in production while keeping `wasm-unsafe-eval` for the client PDF renderer, adds Strict-Transport-Security (2 years, includeSubDomains), Permissions-Policy, `object-src 'none'`, and `base-uri 'self'`. Note that `script-src` still carries `unsafe-inline`; the v1 recommendation of a nonce-based policy was not implemented, so this is a meaningful but partial hardening.

7. UX banking fixes: CONFIRMED.
   - `src/components/employees/onboarding/step-compensation.tsx` derives the branch code silently from the selected bank's universal branch code (line 126) with a comment explaining why it is not editable. `src/components/employees/edit-bank-details-dialog.tsx` exists (176 lines) and is wired into `profile-compensation.tsx`. `updateEmployeeRecord` in `src/lib/employees/actions.ts` resets `bankAccountValidated` and `bankValidatedAt` when bank fields change (lines 190 to 191) and writes an audit ActivityItem naming the actor (lines 233 to 245), with a comment correctly identifying bank-detail edits as the classic payroll fraud vector.

### Items from v1 that remain open (re-verified as unchanged)

- Float money columns: all monetary columns in `prisma/schema.prisma` remain `Float` (salary fields, Payslip amounts, PayrollRun totals, BankExport.totalAmount, ComplianceRecord totals).
- Demo-data dashboards: `src/components/dashboard/exco-dashboard.tsx` and `src/components/tenants/tenant-card.tsx` still import from `@/demo` and display fictional numbers.
- Leave documents: `new-leave-request-dialog.tsx` still uploads to the public `leave-documents` bucket via `getPublicUrl`; medical certificates remain potentially world-readable.
- Observability: no Sentry or equivalent, no health endpoint (`src/app/api` does not exist), no structured logging.
- Schema drift: migration `20260623000000_add_netcash_settings` still adds `netcashServiceKey` while the schema declares `netcashSalaryKey` and `netcashAccountServicesKey`; no reconciling migration exists in the repo, so `prisma migrate deploy` on a fresh database would produce a schema that does not match the client.
- E2E tests: Playwright remains a dependency with zero specs.
- POPIA retention: no retention or erasure workflow.
- BYPASSRLS: correctly understood and worked around, but it means tenant isolation is now a single-layer, application-code control in practice. Every future query must remember its tenant predicate, and there is no automated test suite enforcing that invariant.

### New findings from this audit

- N-1 (Medium, documentation as risk): `docs/security.md` section 4 still states that RLS means "even a bug in an action cannot read another tenant's rows", which is now known to be false for the current connection role. The same document still says the Netcash service key is stored in plaintext, contradicting the AES-256-GCM implementation verified in v1. Stale security documentation misleads future contributors about which control is actually load-bearing.
- N-2 (Low): `createBankExportRecordAction` accepts a client-supplied `payrollRunId` without verifying run ownership.
- N-3 (Low): no database unique constraint backs the Netcash submission ledger; the idempotency check is race-safe in practice but not proven under concurrency.
- N-4 (Medium, carried scope gap of H-1): login and signup have no in-app rate limiting.
- OPS-2 remains: NETCASH_ENCRYPTION_KEY is still absent from `.env.example` (grep count 0) and CI still does not run `next build`.

---

## 2. Updated Overall Scorecard

Overall score: 7.6 / 10 (prior 6.8 / 10)

| Dimension | Prior | New | Justification |
| --- | --- | --- | --- |
| Product Quality | 7.5 | 8.0 | The largest honesty gap in the product, settings that were collected but ignored, is closed: tenant UIF and SDL configuration now genuinely drives pay calculations, and the tax engine carries a pinned, tripwired statutory basis. Banking edits are now a first-class HR flow with fraud-aware auditing. Held back from higher because unpaid leave still never reduces pay in a real run (the calculator supports it, the run does not pass it) and the exco and multi-tenant views still render demo data rather than the tenant's reality, which is a correctness defect in a shipped screen. |
| User Experience | 7.0 | 7.5 | Two concrete improvements: the branch code is no longer a user-editable trap (it is derived from the bank's universal branch code, with a comment explaining the misdirected-salary risk), and HR can now correct banking details from the profile with verification reset, closing a dead end that previously required back-channel fixes. Idempotency refusal messages are written in plain language ("Submitting again would pay employees twice"), which is exactly right for a financial product. Remaining friction is unchanged: dense settings, whole-workspace reloads after mutations, and no undo on completed payroll. |
| UI Design | 8.0 | 8.0 | Nothing in this remediation touched the design system, and nothing needed to. The shadcn/radix foundation, tokens, dark mode, tabular numerics, and the payslip studio remain the strongest surface of the product. The new bank-details dialog follows the established dialog and form patterns rather than inventing new ones, which is the correct outcome for a security-driven change. |
| Performance | 6.0 | 6.0 | No performance work was claimed and none was found. The full-workspace fetch and refetch pattern, 650 KB to 1.3 MB first-load JS, absence of pagination, and the N+1 employee lookups inside `approvePayrollRunAction` (approval-actions.ts line 42) are all still present. The added scoped guard queries are single-row indexed lookups with negligible cost, so nothing regressed either. |
| Security | 4.5 | 7.0 | The gating defect is closed and closed properly: every previously unscoped query verified in this audit now carries a tenant predicate or sits behind a scoped ownership check, `requireEmployeeScope` no longer trusts HR/exco blindly, and the BYPASSRLS discovery was handled with intellectual honesty rather than a false sense of RLS safety. Rate limiting covers the invite, contact, and Netcash surfaces; CSP drops eval and gains HSTS. Why not higher: tenant isolation is now a single-layer control with no isolation test suite guarding it, the leave-documents bucket is still public (POPIA-sensitive medical certificates), `unsafe-inline` remains in script-src, login/signup are unthrottled in-app, the limiter is per-instance, demo credentials still ship in the client bundle, and the security documentation now actively misdescribes the enforcement model. |
| Reliability | 6.5 | 7.5 | The double-payment risk, the most dangerous reliability defect in a payroll product, is closed with a well-shaped ledger state machine: pending claim, exported refusal, stale-claim release, cancellation with reason, token persistence, and audit trail, all covered by 5 tests. Deducted for the missing database uniqueness constraint underpinning that ledger (a narrow but real concurrency window) and for payslip emails still being fired best-effort with `void` and no failure record. |
| Code Quality | 8.0 | 8.0 | The remediation maintains the codebase's standard: the new code is idiomatic, the comments explain intent (why the branch code is not editable, why bank edits are audited, why the ledger releases stale claims), tsc is clean, and eslint reports zero errors with warnings down from 6 to 5. The check-then-act scoping pattern is applied consistently rather than ad hoc. No new debt introduced. |
| Maintainability | 7.5 | 7.5 | Structure is unchanged and remains good. One latent maintainability concern sharpened by this remediation: because isolation now lives in dozens of individually written `where` clauses rather than one enforced layer, correctness depends on every future author remembering the pattern. A lint rule, a query wrapper, or an isolation test suite would convert this from convention to guarantee. The stale security.md also now needs maintenance it has not received. |
| Scalability | 6.0 | 6.0 | Unchanged. The schema and indexing remain adequate to low thousands of employees per tenant; the full-workspace payload, unpaginated lists, and in-memory rate limiter (explicitly documented as per-instance) are the known ceilings. The rate limiter's bounded map and opportunistic cleanup are sensible for its stated scope. |
| Test Coverage | 6.5 | 7.0 | 254 tests (up from 244), still fast and green. The additions are the right ones: 5 idempotency ledger tests, 13 rate limiter tests, the R99,000 tax threshold tripwire, and updated action tests asserting tenant-scoped where clauses. Still missing, and now more important than before given single-layer enforcement: dedicated cross-tenant isolation tests, an authorization matrix suite, any E2E spec (Playwright remains installed and unused), and component tests. |
| Documentation | 8.0 | 7.5 | The prior score credited unusually strong docs but flagged that security.md overstated RLS. That overstatement is now materially false rather than merely optimistic: the document claims RLS makes action bugs unable to read other tenants' rows, while the team has proven the connection role bypasses RLS entirely. It also still describes the Netcash key as plaintext when it is encrypted. The migration file and commit message document the real model well, but the canonical security document was not updated, and `.env.example` still omits NETCASH_ENCRYPTION_KEY. |
| Accessibility | 6.0 | 6.0 | Essentially unchanged: one a11y warning resolved (5 remain, including an image missing an alt prop), and the new bank dialog inherits accessible primitives from the existing form system. No aria-live work, no contrast audit, no skip link. Not a focus of this remediation and not regressed by it. |
| Developer Experience | 8.0 | 8.0 | Unchanged and still strong: one-command test in about 3 seconds, clean tsc, a single .env, seed script, CI gate. The missing `next build` step in CI and the missing NETCASH_ENCRYPTION_KEY in `.env.example` remain the two paper cuts, both flagged in v1 and both still open. |
| Production Readiness | 5.0 | 6.5 | The two failure modes that could cause direct financial or legal harm on day one (cross-tenant exposure of payroll data and double salary payment) are closed and deployed. Rate limiting exists on the abusable public surfaces and headers are hardened. What still separates this from production-grade operations: zero observability (no error monitoring, no health endpoint, no structured logs), an unresolved migration-versus-schema drift that would break a fresh `migrate deploy`, no E2E safety net, no backup or rollback runbook, and demo-data screens still live in the product. |

---

## 3. Remaining Issue Register

Resolved and removed since v1: C-1, CV-1, CV-2, H-1 (partial, see N-4), H-2, H-3 (partial, unsafe-inline remains), L-2 (HSTS added).

| ID | Title | Severity | Area | Effort |
| --- | --- | --- | --- | --- |
| M-1 | Leave documents in a public bucket; medical certificates world-readable by URL | High | Security/Compliance | 1 d |
| D-3 | Netcash column schema drift: migration adds netcashServiceKey, schema declares netcashSalaryKey/netcashAccountServicesKey, no reconciling migration in repo | High | DB/DevOps | 0.5 d |
| TEST-1 | No cross-tenant isolation tests, no authz matrix suite, no E2E specs; isolation is now single-layer app code and untested as an invariant | High | Testing | 3 to 4 d |
| OPS-1 | No error monitoring, health endpoint, structured logging, or rollback runbook | Medium | DevOps | 2 d |
| DEMO-1 | exco-dashboard and tenant-card render demo data, not tenant data | Medium | Correctness | 1 d |
| N-1 | security.md misstates the enforcement model post-BYPASSRLS and still calls the Netcash key plaintext | Medium | Documentation/Security | 0.25 d |
| N-4 | Login and signup have no in-app rate limiting (Supabase/Vercel defaults only) | Medium | Security | 0.5 d |
| D-2 | Money stored as Float across all financial columns | Medium | DB | 1 to 2 d |
| RET-1 | No POPIA retention or erasure policy; no 5-year SARS archival plan | Medium | Compliance | 2 d |
| CV-3 | Unpaid leave supported by the calculator but never passed by completePayrollRunRecord | Medium | Payroll | 0.5 d |
| M-4 | Full ID and tax numbers shipped to exco clients in the workspace payload | Medium | Security | 0.5 d |
| VAL-1 | Server actions not uniformly zod-validated at the boundary | Medium | API | 1 to 2 d |
| PERF-1 | Full workspace refetch after mutations; no pagination on large lists | Medium | Performance | 2 d |
| ISO-1 | Isolation-by-convention: no lint rule or wrapper enforcing tenant predicates on future queries | Medium | Security/Maintainability | 1 d |
| N-3 | No partial unique index backing the BankExport submission ledger; narrow concurrent double-claim window | Low | Reliability | 0.25 d |
| N-2 | createBankExportRecordAction does not verify payrollRunId ownership | Low | Security | 0.25 d |
| OPS-2 | NETCASH_ENCRYPTION_KEY missing from .env.example; CI does not run next build | Low | DevOps | 0.5 d |
| L-1 | Demo credentials shipped in the client bundle via the login page | Low | Security | 0.5 d |
| CSP-1 | script-src still allows unsafe-inline; nonce-based policy not implemented | Low | Security | 0.5 d |
| PERF-2 | N+1 employee lookups in approvePayrollRunAction email loop | Low | Performance | 0.5 d |
| RL-1 | Rate limiter is per warm instance (documented); move to shared store for exact global limits | Low | Security | 0.5 d |
| A11Y-1 | 5 eslint a11y warnings; no aria-live; no AA contrast audit | Low | Accessibility | 1 to 2 d |
| D-4 | Audit actor stored as display name, not user id (partially improved: salary history now records session.id in changedBy) | Low | Compliance | 1 d |
| EMAIL-1 | Payslip emails fire-and-forget with void; failures invisible | Low | Reliability | 0.5 d |

---

## 4. Production Readiness Decision

Decision: Ready for Limited Beta, with the beta ceiling raised.

Justification: Every finding that could cause direct, irreversible harm to a customer on day one has been verifiably closed. The cross-tenant IDOR is fixed at the layer that actually executes (application code), with the BYPASSRLS discovery handled honestly rather than papered over; the double-payment path is guarded by a persisted ledger with tests; the tax engine has a pinned statutory basis with a consistency tripwire; and tenant statutory settings now do what the UI promises. On those grounds NovaHR is safe to run a substantially larger beta than v1 sanctioned: more tenants, real payrolls, real Netcash submissions.

It is not yet Ready for Production for four specific reasons. First, medical certificates can still land in a publicly addressable storage bucket, which is a POPIA special-personal-information exposure that no beta agreement can waive away. Second, there is zero production observability: if a payroll action starts failing tonight, nobody will know until a customer phones. Third, the migration history and the Prisma schema disagree about the PayrollSettings Netcash columns, which means the repo cannot provably reconstruct the production database; that is an unacceptable state for a system of record. Fourth, tenant isolation is now a single-layer control enforced by convention in dozens of where clauses, with no automated cross-tenant test proving the invariant holds as the code evolves. All four are days of work, not weeks. Close them, and the production promotion is earned.

---

## 5. Recommended Next Steps (priority order)

1. Privatise the leave-documents bucket, serve files via short-lived signed URLs, add server-side file type validation, and commit the Storage policies to the repo (M-1). This is the single remaining item with legal exposure.
2. Reconcile the Netcash schema drift: generate a migration that renames or adds the real columns, run `prisma migrate diff` against production, and add a CI step that applies migrations to a throwaway database so drift can never silently recur (D-3, OPS-2).
3. Write cross-tenant isolation tests: for every action that accepts an id, assert a tenant-A session cannot read or mutate a tenant-B row; add an authorization matrix suite; then add a lint rule or query helper that makes the tenantId predicate structural rather than remembered (TEST-1, ISO-1).
4. Stand up observability: Sentry (or equivalent) for server actions, a /api/health endpoint, structured redacted logging in the Netcash paths, and a one-page payroll rollback runbook (OPS-1).
5. Correct security.md to describe the real enforcement model (application-layer predicates as primary, RLS as dormant defence-in-depth, BYPASSRLS documented) and fix the stale plaintext-key claim; add NETCASH_ENCRYPTION_KEY to .env.example (N-1, OPS-2).
6. Replace the demo-data exco dashboard and tenant cards with real tenant queries (DEMO-1).
7. Add a partial unique index on BankExport (payrollRunId, fileFormat) where status is pending or exported, and scope createBankExportRecordAction's run lookup (N-3, N-2).
8. Add in-app rate limiting to login and signup, and wire the payslip email loop through a recorded, retryable path instead of void (N-4, EMAIL-1).
9. Wire unpaidLeaveDays from approved unpaid leave into completePayrollRunRecord (CV-3).
10. Begin the production-hardening tail: migrate money columns to Decimal, draft the POPIA retention and erasure policy, add the first Playwright E2E specs (signup, payroll run, leave), strip demo credentials from the production bundle, and move to a nonce-based CSP (D-2, RET-1, TEST-1, L-1, CSP-1).

Items 1 through 5 are the production gate. On current evidence of execution speed (the entire v1 blocker list was closed in one day), this is roughly one focused week of work.
