# NovaHR Enterprise Audit v3

Audit start date: 2026-07-11.
Prior audits: docs/RELEASE_READINESS_AUDIT.md (2026-07-03, 6.8/10) and docs/RELEASE_READINESS_AUDIT_V2.md (2026-07-04, 7.6/10, updated to 8.5/10 after remediation commit 1e29b55).
Scope: full enterprise-grade due diligence across 16 phases, benchmarked against Sage HR, BambooHR, Rippling, Deel, Gusto, Workday, PaySpace, and SimplePay.

This document is the audit system of record. Each phase report is appended below as it completes. Nothing in this document is a fix; it is findings, evidence, and a remediation roadmap.

---

# Part A. Audit Framework

## A1. Phase plan

| # | Phase | Primary lens | Deliverable |
|---|-------|--------------|-------------|
| 0 | Project Discovery | Context and maturity | Executive overview |
| 1 | Architecture | Structure, scalability, debt | Architecture report |
| 2 | Code Quality | Readability, safety, consistency | Code quality report |
| 3 | Security | OWASP ASVS-aligned review | Enterprise security report |
| 4 | API | Server actions and route handlers as the API surface | API report |
| 5 | Database | Schema, integrity, payroll correctness | Database report |
| 6 | Performance | Frontend and backend | Performance report |
| 7 | DevOps | CI/CD, environments, observability | DevOps report |
| 8 | GitHub and Repository | Workflow, protection, hygiene | GitHub report |
| 9 | Testing | Coverage and payroll accuracy | Testing report |
| 10 | Documentation | Developer, ops, user, security docs | Documentation report |
| 11 | UX/UI | Workflows, states, accessibility | UX report |
| 12 | Compliance | POPIA, BCEA, LRA, PAYE, UIF, SDL, COIDA | Compliance report |
| 13 | Product | Feature gaps vs competitors | Feature gap analysis |
| 14 | Market | Positioning, pricing, opportunity | Market report |
| 15 | Launch Readiness | Synthesis | Final executive report |

One phase at a time. Each phase ends with a summary, score, prioritised issues, recommendations, and a pause for the founder's go-ahead.

## A2. Severity definitions

| Severity | Definition | Blocks production? |
|----------|------------|--------------------|
| Critical | Exploitable security flaw, cross-tenant data exposure, incorrect payroll money, data loss path, or legal breach. | Always |
| High | Material risk to security, correctness, availability, or compliance at real customer scale. | Usually; case by case |
| Medium | Meaningful weakness that degrades quality, maintainability, or trust. Fix within 90 days. | No |
| Low | Minor defect or polish item. Backlog. | No |
| Enhancement | Not a defect; a competitive or best-practice uplift. | No |

## A3. Finding format

Every finding carries: ID (phase prefix), severity, risk description, why it matters, files affected, recommended solution, estimated effort, dependencies, and a production-blocker flag.

Effort scale: XS under 1 hour, S under 1 day, M 1 to 3 days, L 1 to 2 weeks, XL over 2 weeks.

## A4. Evidence rules

- Every finding cites concrete evidence: file paths with line numbers, command output, configuration, schema, or observed live behaviour.
- No speculation. Where evidence is unavailable (external credentials, Vercel dashboard settings, Supabase project settings), the finding is tagged EVIDENCE-GAP and lists exactly what is needed.
- Claims from prior audits or docs are re-verified, not inherited.

## A5. Scoring methodology

Each phase scores out of 100 against enterprise SaaS standards, not "good enough":

- 90-100: enterprise grade, comparable to the benchmark products.
- 80-89: production ready with minor gaps.
- 70-79: conditionally acceptable; gaps must be scheduled.
- 60-69: significant gaps; limited beta at most.
- Below 60: not ready in this dimension.

Scoring is anchored: start at 100, subtract per finding (Critical 15-25, High 8-15, Medium 3-6, Low 1-2), add back for exemplary practices (max +10). Any open Critical caps the phase at 59.

Final composites (Phase 15):

- Overall Product Score: phases 11, 13, 14 (weights 30/45/25).
- Overall Engineering Score: phases 1, 2, 4, 5, 6, 9 (weights 20/20/10/20/10/20).
- Overall Security Score: phase 3 (70%) plus security-relevant findings from 5, 7, 12 (30%).
- Overall Launch Readiness Score: weighted mean of all phases (security and database double weight), capped at 59 while any Critical remains open.
- Overall Enterprise Readiness Score: Launch Readiness adjusted for phases 7, 10, 12 (enterprise buyers require DevOps, documentation, and compliance maturity).

## A6. Exit criteria per phase

A phase is complete when: every category in its checklist was inspected or explicitly tagged EVIDENCE-GAP; all findings are tabled with severity and effort; the score is justified against the anchors; production blockers are flagged; and the founder has confirmed continuation.

## A7. Final deliverables (Phase 15)

Executive summary, strengths and weaknesses, blocker list, prioritised improvement tiers, technical debt summary, risk register, production readiness checklist, recommended roadmap, 90-day improvement plan, all five composite scores, and a verdict: Ready for production, Ready with conditions, or Not ready.

## A8. Production readiness checklist (tracked throughout, verdicts in Phase 15)

1. No Critical findings open anywhere.
2. Tenant isolation proven by tests and enforced at every data access path.
3. Payroll calculations verified against current SARS/DoL published figures.
4. CI gates every change that can reach production.
5. Dev and prod environments fully separated (database, storage, auth).
6. Observability live: error tracking, health checks, alerting.
7. Backup and restore tested, not assumed.
8. Rate limiting effective under serverless scale-out.
9. POPIA operational requirements met (retention, DSAR, breach process).
10. Legal acceptance flows live (ToS, DPA, payroll disclaimer).
11. Rollback procedure documented and tested.
12. Load behaviour at realistic tenant counts understood.

---

# Part B. Phase Reports

## Phase 0: Project Discovery

Completed: 2026-07-11.

### Executive Summary

NovaHR is a genuinely mature late-beta product, not a prototype. It is a multi-tenant HR and payroll SaaS for South African SMEs, live in production at novahr-five.vercel.app, roughly 42,700 lines of TypeScript across 339 files, in its third audit cycle. The architecture is a Next.js 15 App Router monolith that uses server actions as its API layer (32 server-action files, only 2 HTTP route handlers: health and auth callback). Data lives in Supabase Postgres via Prisma 7 with a clean squashed migration baseline. The domain layer is unusually deep for a product at this stage: SARS 2026/27 PAYE, UIF, SDL, ETI with carry-forward, EMP201/EMP501/IRP5, employment equity reporting, POPIA export/erasure, Netcash bank integration.

Health snapshot at audit start: TypeScript compiles clean, 302/302 unit tests pass in 4 seconds, a 5-journey Playwright E2E suite exists, Sentry is configured. Two structural process risks stand out immediately: CI is configured to never run on pushes to main while main auto-deploys to production, and the last 9 commits went directly to main (main currently carries 7 ESLint errors that CI would have caught). Local development and production also share a single Supabase project, so a local mistake is a production incident.

### Findings

DISC-1. High. CI never gates production.
`.github/workflows/ci.yml` triggers on `push: branches-ignore: [main]` and on PRs to main. Direct pushes to main, which auto-deploy to production via Vercel, run no lint, no type-check, no tests. The last 9 commits (3482ff2 back through 1e29b55) went directly to main. Evidence: ci.yml lines 3-9; `git log --oneline -15`. Why it matters: the only path that reaches customers is the only path with zero automated checks. Recommended: require PRs to main via branch protection, or add a main-push CI job that must pass before deploy (Vercel ignores CI by default; use a deployment check or `git push` discipline plus branch protection). Effort: S. Blocks production: yes, as a process gate.

DISC-2. High. Development and production share one Supabase project.
Local `.env` and Vercel production point at the same Supabase project (epmsbbcedbhtiwwtiyts). Local migrations, seed scripts, and E2E runs execute against the production database, mitigated today only by careful habits and E2E teardown filters. Evidence: documented in docs and confirmed by project history; `.vercel/project.json` links the prod project. Why it matters: one wrong `prisma migrate reset` or seed run destroys customer data; enterprise due diligence fails on this alone. Recommended: separate dev Supabase project (or branch database), distinct storage buckets, distinct auth user pool. Effort: M. Blocks production: yes for enterprise readiness.

DISC-3. Medium. main is currently lint-red.
`npm run lint` on main: 7 errors, 6 warnings (react/no-unescaped-entities in src/components/payroll/current-run-card.tsx:231,233; no-explicit-any in scripts/capture-guide-screenshots.ts; prefer-const in e2e/golden-journeys.spec.ts:306; alt-text warnings in src/lib/payroll/pdf.tsx). Direct consequence of DISC-1. Effort: XS.

DISC-4. Medium. Release engineering basics missing.
package.json is version 0.1.0 with no `engines` field (CI pins Node 22, local and Vercel are unpinned), no CHANGELOG, no semantic versioning or release tagging. Evidence: package.json. Effort: XS to S.

DISC-5. Low. Silent best-effort error handling observed.
During the test run, EMP201 auto-generation logged `TypeError: Cannot read properties of undefined (reading 'upsert')` from src/lib/compliance/actions.ts:159 inside a passing test: the failure is swallowed by a best-effort catch. Pattern will be examined properly in Phase 2. Effort: noted for Phase 2.

Positive observations (score credits): squashed, replayable migration baseline with RLS SQL captured; 302 passing unit tests including tax tripwires and 12 cross-tenant isolation tests; E2E golden journeys; Sentry client/server/edge configs present; extensive documentation tree (developer docs, prior audits, legal pack, manuals); honest security documentation of the BYPASSRLS reality.

### Risks

1. Ungated auto-deploy is the highest-leverage systemic risk: every other quality investment can be bypassed by one push.
2. Shared dev/prod Supabase converts routine development into production-touching operations.
3. Server-actions-only API is fine for the app today but means there is no integration surface for the enterprise buyers this product targets (payroll APIs, accounting sync). Assessed in Phase 4.
4. Known-dormant items carried from v2: in-memory rate limiting on serverless, POPIA retention schedule, Netcash and Resend not yet live-tested. Carried into Phases 3, 7, 12.

### Evidence

Commands run 2026-07-11: file tree scan, package.json review, `git status -sb`, `git log`, `ls prisma/migrations`, `cat .github/workflows/ci.yml`, `npx vitest run` (302/302 pass, 3.99s), `npx tsc --noEmit` (clean), `npm run lint` (7 errors, 6 warnings), schema grep (24 models, 18+ enums, 747 lines).

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| DISC-1 | High | CI never runs on main pushes; main auto-deploys | S | Yes |
| DISC-2 | High | Dev and prod share one Supabase project | M | Yes (enterprise) |
| DISC-3 | Medium | 7 ESLint errors on main | XS | No |
| DISC-4 | Medium | No engines pin, no versioning/CHANGELOG | XS-S | No |
| DISC-5 | Low | Swallowed error in EMP201 best-effort path | Phase 2 | No |

### Recommendations

1. Turn on GitHub branch protection for main requiring the existing CI workflow to pass on a PR. This single setting fixes DISC-1 and makes DISC-3 impossible to recur.
2. Provision a separate dev Supabase project and re-point local `.env`. Keep prod credentials only in Vercel.
3. Fix the 7 lint errors (15 minutes) so the gate starts green.
4. Add `"engines": { "node": ">=22" }` and start tagging releases.

### Quick Wins

Lint fixes (XS), engines pin (XS), branch protection (XS on GitHub, S including workflow adjustment).

### Long-Term Improvements

Dev/prod environment separation (M), release versioning discipline (S), integration API strategy (Phase 4 will size this).

### Score: 78/100

Anchor math: base 100, DISC-1 (-10), DISC-2 (-10), DISC-3 (-4), DISC-4 (-3), DISC-5 (-1); +6 credit for test health, migration hygiene, and documentation depth well above stage norm. Discovery-level maturity is solidly "conditionally production ready": the product substance is strong, the delivery pipeline around it is the weak layer.

### Production Blockers

DISC-1 (ungated deploys) and DISC-2 (shared dev/prod environment).

### Next Phase Recommendation

Phase 1, Architecture Audit. Founder instructed the audit to run all phases continuously; reports below.

---

## Phase 1: Architecture Audit

Completed: 2026-07-11.

### Executive Summary

The architecture is a well-organised server-action monolith. Domain logic lives in 30 focused modules under src/lib (payroll, leave, compliance, deductions, invites, bank-exports, and so on), each pairing actions with pure calculation modules. Data access is disciplined: exactly one PrismaClient (src/lib/prisma.ts), zero Prisma imports from components, a mapper boundary (src/lib/workspace/mappers.ts) that converts DB rows including Decimal handling, and 3 server-only tagged modules. Client/server separation is clean: 151 client component files, 32 server-action files, no leakage found. The main structural weaknesses are a routing-namespace collision class of bug (which has already caused a production incident, see AUD3-C1 in Phase 7), oversized mixed-concern files, and demo data compiled into the product source.

### Findings

ARCH-1. Medium. Route-group collision risk is structural, not incidental. Public marketing/trust pages live at src/app/<name> while the authenticated app lives at src/app/(app)/<name>. Route groups do not namespace URLs, so any public page that reuses an app route name collides at build time. This already happened: src/app/compliance/page.tsx vs src/app/(app)/compliance/page.tsx (commit 4a67df4). Recommended: move public trust pages under a dedicated prefix (for example /trust/... or all under /legal/...), and document the rule in AGENTS.md. Effort: S. Dependency: fixes AUD3-C1.

ARCH-2. Medium. Oversized files mixing concerns: src/app/(app)/deductions/page.tsx (658 lines, page plus UI plus logic), src/lib/payroll/pdf.tsx (903 lines, four templates in one module), src/components/settings/payslip-studio.tsx (527 lines), src/lib/compliance/actions.ts (442 lines). None is unmanageable yet; all will resist change. Effort: M spread over time.

ARCH-3. Medium. src/demo/employees.ts (1,153 lines, the largest file in src) ships demo data inside product source. It was mostly decoupled (tenant-card.tsx fixed in 1e29b55) but remains importable and bundle-adjacent. Recommended: move to seed/fixture territory outside src or behind a build-time flag. Effort: S.

ARCH-4. Medium. Client-side global store (src/lib/store/app-provider.tsx, 382 lines) hydrates workspace data into React context. It works at current scale but creates a wide re-render surface and a second source of truth alongside server data. Watch it; consider server components plus targeted queries per page as the long-term direction. Effort: L if rearchitected, not urgent.

ARCH-5. Enhancement. Nova suite reuse: NovaHR, NovaPOS, NovaFinance, NovaPilot each carry their own copies of UI primitives and auth/tenant scaffolding. A shared internal package (monorepo or published private packages) would cut quadruplicated maintenance. Effort: XL, strategic.

Positives: dependency hygiene is good (no unused heavyweight deps spotted; Prisma 7 with pg adapter is current; React 19, Next 15.5). SOLID/DRY: calculation modules are pure and tested; the requireX guard family gives a single auth entry point; decToNumber gives a single Decimal boundary. No circular-dependency smells found at module level.

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| ARCH-1 | Medium | Public/app route namespace collisions (already bit once) | S | Via AUD3-C1 |
| ARCH-2 | Medium | Oversized mixed-concern files | M | No |
| ARCH-3 | Medium | 1,153-line demo dataset inside src | S | No |
| ARCH-4 | Medium | Client global store as second source of truth | L | No |
| ARCH-5 | Enhancement | No shared package layer across Nova suite | XL | No |

### Score: 80/100

Base 100; ARCH-1 (-5, systemic and already realised), ARCH-2 (-4), ARCH-3 (-4), ARCH-4 (-4), ARCH-5 (-3); +0 net after credits for data-access discipline offset the absence of any written architecture decision records. Production blockers: none directly (ARCH-1 manifests as the Phase 7 Critical).

---

## Phase 2: Code Quality Audit

Completed: 2026-07-11.

### Executive Summary

Code quality metrics are excellent for a 42,700-line codebase: TypeScript compiles clean in strict application code, exactly 2 `any` usages in all of src, zero TODO/FIXME markers, zero console.log statements outside tests, zero empty catch blocks, and a consistent naming and module style throughout. The gaps are: main is currently lint-red (7 errors), input validation is ad hoc rather than schema-driven (1 of 32 server-action files uses zod despite zod being a dependency), and the "best effort" error pattern hides real failures (observed live: EMP201 auto-generation swallowing a TypeError during the test run).

### Findings

CQ-1. Medium. main fails lint: 7 errors, 6 warnings (react/no-unescaped-entities in src/components/payroll/current-run-card.tsx:231,233; four no-explicit-any in scripts/capture-guide-screenshots.ts; prefer-const in e2e/golden-journeys.spec.ts:306; four jsx-a11y/alt-text warnings in src/lib/payroll/pdf.tsx). Effort: XS.

CQ-2. Medium. Validation is manual, not schema-driven (carried from v2 as VAL-1). zod 4 is installed but only 1 of 32 action files imports it. Field checks exist (SA ID Luhn, phone, bank, PAYE/UIF/SDL reference regexes) but every action hand-rolls its own guards, so coverage is uneven and unverifiable. Recommended: one zod schema per action input, parsed at entry; reuse existing regexes inside schemas (src/lib/schemas already exists as the natural home). Effort: L (mechanical, spread across actions).

CQ-3. Medium. Best-effort catches log and continue, and at least one hides a real defect: during vitest, EMP201 generation threw `TypeError: Cannot read properties of undefined (reading 'upsert')` from src/lib/compliance/actions.ts:159 inside a passing test; in production the same pattern would silently skip compliance record creation. 22 console.error sites are the only trace. Recommended: route best-effort failures through Sentry captureException with context, and make tests assert on them. Effort: S.

CQ-4. Low. No Prettier or formatting enforcement in the repo (style is consistent today because one author plus one agent wrote it; that does not survive a second contributor). Effort: XS.

Positives: no dead code hits, no duplicate util sprawl, error copy is user-facing and consistent (sonner toasts), and the codebase honours its own writing rules (zero em dashes, per CLAUDE.md).

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| CQ-1 | Medium | 7 ESLint errors on main | XS | No |
| CQ-2 | Medium | zod in 1/32 action files; ad hoc validation | L | No |
| CQ-3 | Medium | Best-effort catches swallow real failures | S | No |
| CQ-4 | Low | No formatter enforcement | XS | No |

### Score: 84/100

Base 100; CQ-1 (-4), CQ-2 (-6), CQ-3 (-5), CQ-4 (-2); +1 credit for exceptional hygiene metrics. No production blockers.

---

## Phase 3: Security Audit

Completed: 2026-07-11.

### Executive Summary

The security model is coherent and honestly documented: the Supabase postgres role has BYPASSRLS (verified in v2), so tenant isolation is enforced in application code via the requireUser/requireRole/requireTenant/requireEmployeeScope guard family (90 call sites) plus explicit tenantId predicates, with RLS kept as dormant defence-in-depth that does actively protect the Supabase REST surface. Netcash keys are AES-256-GCM encrypted, storage buckets are private with signed URLs and MIME/size limits, CSP and HSTS are set, login/signup/invites/contact are throttled. Twelve cross-tenant isolation tests exist. The material gaps: /account is missing from middleware protection, CSP still allows unsafe-inline scripts without nonces, rate limiting is per-warm-instance in-memory (ineffective against distributed attempts on serverless), and there is no MFA, which enterprise HR buyers treat as table stakes.

### Findings

SEC-1. Medium. /account absent from PROTECTED_PREFIXES (src/middleware.ts:8-19), and src/app/(app)/account/page.tsx is a client component guarded only by the client-side AuthGuard in the (app) layout. Data exposure is nil (profile actions call requireUser, verified in src/lib/auth/profile-actions.ts:13,30), but the defence-in-depth contract "middleware blocks unauthenticated app routes" is silently violated for one route, and the next such route may not have guarded actions. Recommended: derive PROTECTED_PREFIXES from the (app) route group, or add /account plus a test asserting parity. Effort: XS.

SEC-2. High (enterprise). No MFA. Supabase Auth supports TOTP; nothing is wired. Every benchmark competitor (PaySpace, SimplePay, Sage) offers MFA; HR data plus banking details make this a procurement checkbox. Effort: M. Blocks enterprise sales, not beta.

SEC-3. Medium. In-memory rate limiting (src/lib/security/rate-limit.ts) is per warm instance by its own admission (header comment). On Vercel scale-out, an attacker distributing across instances bypasses limits; Supabase-side auth limits are the real backstop. Carried from v2 (RL-1). Recommended: Upstash Redis or a Postgres-table window. Effort: S-M.

SEC-4. Medium. CSP allows 'unsafe-inline' script-src in production without nonces (next.config.ts:24,36). XSS surface is small (single dangerouslySetInnerHTML, static chart styles in src/components/ui/chart.tsx:95), but a nonce-based CSP is the enterprise standard. Effort: M (Next.js nonce plumbing).

SEC-5. Medium. No session hardening options: no configurable session lifetime, no device/session list, no admin-forced logout. Supabase defaults apply. Effort: M. Enterprise expectation.

SEC-6. Low. Secrets inventory is clean (.env.example complete, service-role key used in exactly 2 server modules, admin client gated). NETCASH_ENCRYPTION_KEY still has no documented rotation procedure (carried from v2). Effort: S (document plus dual-key decrypt window).

SEC-7. EVIDENCE-GAP. Dependency vulnerability posture unknown: no Dependabot config in repo, GitHub Advanced Security fields return null (private repo, free plan). Needs: npm audit run and Dependabot enablement (see Phase 8). 

Positives: no unguarded mutating action found (the 2 guardless action files are the public login/signup and the rate-limited contact form); POPIA export/erasure implemented; audit logging exists (9 call sites, viewable in Settings with CSV export); honest threat-model documentation in docs/security.md.

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| SEC-1 | Medium | /account outside middleware protection | XS | No |
| SEC-2 | High | No MFA | M | Enterprise only |
| SEC-3 | Medium | Rate limits per-instance in-memory | S-M | No |
| SEC-4 | Medium | CSP unsafe-inline without nonces | M | No |
| SEC-5 | Medium | No session management controls | M | No |
| SEC-6 | Low | No key-rotation procedure | S | No |
| SEC-7 | EVIDENCE-GAP | Dependency scanning not enabled | XS | No |

### Score: 78/100

Base 100; SEC-2 (-8), SEC-1 (-4), SEC-3 (-4), SEC-4 (-3), SEC-5 (-3), SEC-6 (-2), SEC-7 (-2); +4 credit for the guard architecture, isolation tests, and honest documentation. No beta blockers; SEC-2 blocks enterprise deals.

---

## Phase 4: API Audit

Completed: 2026-07-11.

### Executive Summary

NovaHR deliberately has almost no HTTP API: 2 route handlers total (GET /api/health and the Supabase auth callback) and 32 server-action modules doing all reads and writes. For the product as a closed web app this is defensible and reduces attack surface: server actions are origin-bound, guarded, and not enumerable like REST. Judged as an enterprise HR platform, it is a strategic gap: there is no integration surface at all. No REST/GraphQL API, no OpenAPI spec, no webhooks, no API keys or scopes, no versioning story. Competitors (PaySpace, SimplePay, Rippling, Deel) all expose payroll/employee APIs and webhooks; accounting integrations (Xero, Sage) are the most-requested SME feature category.

### Findings

API-1. High (strategic). No public API or webhook layer exists, and nothing in the architecture prepares for one (validation is ad hoc per action, CQ-2, so nothing is reusable as an API contract). Recommended path: zod schemas per domain first (shared with actions), then a versioned /api/v1 for employees, payslips, leave, plus webhooks for run-completed/leave-approved. Effort: XL. Blocks enterprise integrations, not beta.

API-2. Low. GET /api/health exists (good) but its response contract is undocumented and unauthenticated depth unknown; keep it shallow (no DB secrets, no version leak beyond commit hash). Effort: XS to review.

API-3. Low. Server-action error responses are consistent (typed result objects with user-safe messages) but not centrally standardised; a helper would prevent drift. Effort: S.

Internal action-layer consistency (naming, status semantics, pagination, filtering) is otherwise assessed under Phases 2 and 6.

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| API-1 | High | No integration API/webhooks at all | XL | Enterprise only |
| API-2 | Low | Health endpoint contract unreviewed | XS | No |
| API-3 | Low | No shared action-result helper | S | No |

### Score: 58/100

Scored against enterprise SaaS expectations where an API is part of the product. Base 100; API-1 (-38 as the entire category is absent), API-2 (-1), API-3 (-3). The score is low by design of the rubric, not because the current code is bad: what exists is clean and guarded. No beta blockers.

---

## Phase 5: Database Audit

Completed: 2026-07-11.

### Executive Summary

The schema (747 lines, 24 models, 18 enums) is in good shape for a payroll product: all 35 money columns are Decimal(15,2) (migrated from Float in PR #34), 27 composite indexes, 34 explicit onDelete rules, uniqueness where it matters, salary history, an ETI claim ledger, normalised PayrollItem rows alongside immutable payslip JSON snapshots, and a replayable squashed baseline migration that includes the RLS SQL. Migration hygiene was restored in v2 remediation and has held (one clean migration since baseline). Residual risks: the shared dev/prod database (DISC-2) is as much a data risk as an ops risk; backups are Supabase-managed but restore has never been rehearsed; one load-bearing partial unique index exists only as raw SQL that Prisma does not model; and there are no soft deletes anywhere, which is a deliberate choice (POPIA erasure redacts instead) but leaves hard deletes with FK cascades as the only removal path.

### Findings

DB-1. High. Backup/restore is assumed, never tested. Supabase free/pro tiers differ materially in PITR availability; no restore rehearsal is documented anywhere (docs/compliance/backup-policy.md is a policy, not a runbook). For payroll data this is a launch condition. Recommended: document tier, take a manual dump, rehearse a restore to a scratch project, write the runbook. Effort: S-M. EVIDENCE-GAP: current Supabase plan/PITR status.

DB-2. Medium. BankExport_active_nif_per_run_key partial unique index lives only in raw migration SQL (noted at baseline creation); Prisma schema cannot express it, so a future `migrate dev` may generate a drop. Mitigation: comment in schema.prisma next to BankExport, plus a CI check that the index exists. Effort: XS-S.

DB-3. Medium. Payslip earnings/deductions are JSON snapshots. Correct for immutability (payslips must not change retroactively) and IRP5 builds from them intentionally, but cross-run analytical queries and future BI will need PayrollItem to be complete; PayrollItem is only written by app-completed runs. Recommended: backfill job plus an invariant test that completed runs always produce PayrollItems. Effort: S.

DB-4. Medium. No soft deletes; Employee deletion cascades (34 onDelete rules) and POPIA erasure redacts in place. The combination is coherent, but accidental hard deletes of tenants/employees have no undo except backup restore (see DB-1). Recommended: restrict destructive deletes at app layer (already partial: termination is a status), and rely on DB-1 being fixed. Effort: S.

DB-5. Low. No CHECK constraints (for example non-negative money, valid period ranges); all invariants live in application code. Acceptable with current test depth; note for defence-in-depth. Effort: S.

Positives: dormant RLS now covers all tenant tables including the three fixed in 1e29b55; runAsTenant sets app.tenant_id for future activation; EmployeeSalaryHistory and ActivityItem give the audit trails Phase 12 needs; seed script is separated; migration ledger verified clean (`migrate status` at baseline).

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| DB-1 | High | Restore never rehearsed; PITR status unknown | S-M | Yes |
| DB-2 | Medium | Partial unique index invisible to Prisma | XS-S | No |
| DB-3 | Medium | PayrollItem completeness not guaranteed | S | No |
| DB-4 | Medium | Hard deletes only; no undo path | S | No |
| DB-5 | Low | No DB-level CHECK constraints | S | No |

### Score: 82/100

Base 100; DB-1 (-9), DB-2 (-4), DB-3 (-3), DB-4 (-3), DB-5 (-2); +3 credit for Decimal migration, index discipline, and immutable payslip design. Production blocker: DB-1 (restore rehearsal) as a launch condition.

---

## Phase 6: Performance Audit

Completed: 2026-07-11. Partially EVIDENCE-GAPPED: bundle analysis was impossible because `next build` fails on main (AUD3-C1); re-run route-size analysis after the build is fixed.

### Executive Summary

Performance is untested rather than known-bad. The app is fast today because tenants are tiny (demo-scale). The structural risks are all about scale: 40 findMany call sites in src/lib with only 3 using `take`, so every list (employees, payslips, activity, leave) loads entire tenant datasets into the client-side store; 151 client components hydrate a large interactive surface; heavy client dependencies (recharts, @react-pdf/renderer with wasm, framer-motion) sit in the main app experience. There is no caching strategy and no performance budget. At 50 employees none of this matters; at a 1,000-employee tenant the dashboard, payroll run pages, and store hydration will degrade sharply.

### Findings

PERF-1. High (at scale). Unpaginated queries: 40 findMany vs 3 take in src/lib (carried from v2). The app-provider store hydrates whole-tenant datasets per session. Recommended: paginate at the action layer (cursor on id), starting with employees, payslips, activity log; cap store hydration to dashboard needs. Effort: L. Not a beta blocker at current tenant sizes; a hard scaling wall later.

PERF-2. Medium. Client bundle likely heavy: recharts plus react-pdf (wasm yoga) plus framer-motion all client-side; 151 client components. Unmeasurable until AUD3-C1 is fixed; then run build and set budgets per route. Effort: S to measure, M to trim (dynamic import PDF and charts).

PERF-3. Medium. No caching anywhere: every navigation re-fetches via actions; no React cache(), no unstable_cache/tags, no HTTP caching on the health route. Acceptable for correctness-first payroll; add read-path caching selectively (public holidays, settings) rather than broadly. Effort: S-M.

PERF-4. Low. Webpack build warnings about serializing 100-250kiB strings (build log) hint at large inlined data (likely src/demo/employees.ts, ARCH-3). Effort: covered by ARCH-3.

PERF-5. EVIDENCE-GAP. No load testing has ever been run against payroll run completion (the heaviest transaction: per-employee tax calc, payslip create, PayrollItem writes, deduction updates). Needs: a k6/artillery script against a staging environment (blocked on DISC-2 separation). Effort: M.

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| PERF-1 | High | Unpaginated tenant-wide queries and store hydration | L | At scale |
| PERF-2 | Medium | Heavy client bundle, unmeasured | S-M | No |
| PERF-3 | Medium | No caching strategy | S-M | No |
| PERF-4 | Low | Large inlined demo data in build | (ARCH-3) | No |
| PERF-5 | EVIDENCE-GAP | No load test of payroll completion | M | Launch condition at scale |

### Score: 65/100

Base 100; PERF-1 (-14), PERF-2 (-6), PERF-3 (-5), PERF-4 (-2), PERF-5 (-8). Scored against enterprise scale expectations; current small-tenant experience is subjectively fast.

---

## Phase 7: DevOps Audit

Completed: 2026-07-11.

### Executive Summary

This is the weakest area of the platform, and it produced the audit's one Critical finding. Production deploys have been silently failing for two days: commits ae027b5 through 3482ff2 introduced a route collision (src/app/compliance/page.tsx vs src/app/(app)/compliance/page.tsx) that breaks `next build`; the last five Vercel production deployments all show Error status, and production is serving a build from two days ago. The payroll disclaimer gate, clickwrap legal pages, and doc updates the team believes are live are not deployed. Nobody was alerted because CI does not run on main (DISC-1), Vercel deploy failures notify nobody, and there is no uptime or deploy monitoring. Combined with the shared dev/prod database (DISC-2), absent staging environment, and unrehearsed backups (DB-1), the delivery pipeline is the gap between a good product and a trustworthy service.

### Findings

AUD3-C1. CRITICAL. Production deployment pipeline broken and silent for 2 days. Evidence: `next build` fails on main with "You cannot have two parallel pages that resolve to the same path" (/compliance); `vercel ls` shows 5 consecutive Error production deployments (20h-1d old), last Ready deploy 2 days ago; conflict introduced in 4a67df4. Impact: production is stale; legally significant features (clickwrap ToS acceptance, payroll disclaimer gate) believed shipped are not live; the 20260710083049 migration may be applied to the shared DB while prod code predates it. Fix: rename the public compliance page route (ARCH-1), verify build, redeploy, then add deploy-failure notifications. Effort: S for the fix; the process fixes are DISC-1 plus DEVOPS-2. Blocks production: yes, actively.

DEVOPS-2. High. No alerting of any kind: no Vercel deploy notifications, no uptime monitor on /api/health, Sentry configured in code but alert rules and DSN presence in prod unverified (EVIDENCE-GAP: Vercel env and Sentry dashboard). A payroll platform that fails silently on payday is dead. Recommended: Vercel Slack/email notifications, an uptime pinger (UptimeRobot/Checkly) on /api/health, Sentry alert rules. Effort: S.

DEVOPS-3. High. No staging environment: Vercel previews exist per branch but point at the production database (DISC-2), so nothing can be tested realistically without touching prod data. Recommended: dev Supabase project wired to preview env vars. Effort: M (same work as DISC-2).

DEVOPS-4. Medium. Rollback exists (Vercel instant rollback) but is undocumented and DB migrations have no down-path convention. Document: when to rollback vs roll-forward, and the expand/contract migration rule already implicitly followed. Effort: S.

DEVOPS-5. Medium. Sentry integration is half-landed: sentry.client.config.ts triggers a deprecation warning in the build (should be instrumentation-client.ts, which also exists, so there may be double-init); tunnelRoute /monitoring is set; DSN presence in Vercel unverified. Effort: S.

Positives: CI itself (lint, tsc, vitest on Node 22) is correct where it runs; .env.example is complete; health endpoint exists; prisma generate is in the build; secrets are not in the repo (checked .gitignore covers .env).

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| AUD3-C1 | Critical | Prod deploys failing silently for 2 days (route collision) | S | YES, active |
| DEVOPS-2 | High | Zero alerting (deploys, uptime, errors) | S | Yes |
| DEVOPS-3 | High | No staging; previews hit prod DB | M | Yes (with DISC-2) |
| DEVOPS-4 | Medium | Rollback/migration runbook missing | S | No |
| DEVOPS-5 | Medium | Sentry half-landed, DSN unverified | S | No |

### Score: 48/100

Base 100; AUD3-C1 (-25), DEVOPS-2 (-10), DEVOPS-3 (-8), DEVOPS-4 (-4), DEVOPS-5 (-5). Critical caps the phase below 60 regardless. This phase, plus DISC-1/DISC-2, is where the next engineering week should go.

---

## Phase 8: GitHub and Repository Audit

Completed: 2026-07-11.

### Executive Summary

The repository is private (Wandile-Mtshwene/novahr) on a GitHub Free plan, which structurally disables the most important control: branch protection on main returns HTTP 403 "Upgrade to GitHub Pro or make this repository public". PR discipline was excellent through the feature push (PRs #23-#34 with clean titles) but the last 9 commits bypassed PRs entirely, which is exactly the failure mode branch protection prevents and exactly what caused AUD3-C1 to land unreviewed. No Dependabot, no CODEOWNERS, no issue/PR templates, no releases or tags, secret scanning unavailable on the current plan.

### Findings

GH-1. High. Branch protection impossible on current plan (evidence: GitHub API 403). Options: GitHub Pro (about $4/month, cheapest correct fix), or a required-status-check workaround via a main-push CI job plus self-discipline, which is not a control. Recommended: Pro plan plus require PR plus require CI status. Effort: XS plus cost. Blocks production as the enforcement half of DISC-1.

GH-2. Medium. No Dependabot configuration (.github/dependabot.yml absent) and dependency alert status null. For a payroll platform, unpatched dependency CVEs are a compliance finding in any vendor assessment. Effort: XS.

GH-3. Medium. No release management: version frozen at 0.1.0, no tags, no CHANGELOG, no GitHub Releases. Rollback target identification currently requires reading commit messages. Effort: S to start tagging.

GH-4. Low. No CODEOWNERS, issue templates, or labels. Solo-founder context makes these low value today; add when a second contributor arrives. Effort: XS.

Positives: commit messages are consistently high quality; history is clean (v2-era branch cleanup held: no stale branches); .gitignore is correct; the repo contains the business document corpus, deliberately.

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| GH-1 | High | Branch protection unavailable (Free plan, private repo) | XS + cost | Yes (with DISC-1) |
| GH-2 | Medium | No Dependabot | XS | No |
| GH-3 | Medium | No versioning/releases/CHANGELOG | S | No |
| GH-4 | Low | No CODEOWNERS/templates/labels | XS | No |

### Score: 52/100

Base 100; GH-1 (-15, it is the enforcement gap that let a Critical through), GH-2 (-6), GH-3 (-5), GH-4 (-2); recent direct-to-main practice (-20 as realised process failure). Fixing GH-1 plus DISC-1 recovers most of this score.

---

## Phase 9: Testing Audit

Completed: 2026-07-11.

### Executive Summary

Domain-logic testing is a genuine strength: 302 unit tests across 37 files, all green in 4 seconds, concentrated exactly where money is: payroll calculator (429-line spec with SARS tripwire constants), ETI (14 band tests plus carry-forward), mappers, deductions, and 12 dedicated cross-tenant isolation tests. A 5-journey Playwright E2E suite covers signup-to-payroll golden paths. The gaps are breadth and measurement: zero component tests (151 client components untested), no coverage measurement configured at all, E2E runs only locally (not in CI, and cannot run in CI while previews share the prod DB), and no security or load test automation.

### Findings

TEST-1. Medium. No coverage measurement (vitest.config.ts has no coverage setup), so "well tested" is anecdotal. Recommended: enable v8 coverage, set an initial floor on src/lib (likely already 70%+), report in CI. Effort: XS-S.

TEST-2. Medium. Zero component/UI tests. The four-step onboarding wizard, payroll run flow, and payslip studio are complex stateful UIs verified only by 5 E2E journeys. Recommended: targeted React Testing Library specs for wizard validation, approval gating, and leave request forms. Effort: M.

TEST-3. Medium. E2E not in CI (needs DISC-2/DEVOPS-3 staging first; running the current suite in CI would hit production Supabase). Effort: S after staging exists.

TEST-4. Low. Observed test smell: passing tests that print stack traces from swallowed errors (CQ-3) will mask real regressions in best-effort paths. Assert on captured errors instead. Effort: S.

TEST-5. Enhancement. No mutation/property-based testing on the tax calculator; property tests (monotonicity of PAYE in income, rebate boundaries) would harden the most reputation-critical code. Effort: M.

Positives: tripwire tests on statutory constants are exactly the right idea; isolation tests directly encode the security model; E2E teardown design shows production-awareness; test speed (4s) keeps the suite alive.

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| TEST-1 | Medium | No coverage measurement | XS-S | No |
| TEST-2 | Medium | 0 component tests | M | No |
| TEST-3 | Medium | E2E not in CI (blocked on staging) | S | No |
| TEST-4 | Low | Swallowed-error test smell | S | No |
| TEST-5 | Enhancement | No property tests on tax calc | M | No |

### Score: 72/100

Base 100; TEST-1 (-5), TEST-2 (-8), TEST-3 (-6), TEST-4 (-2), TEST-5 (-3, held to Enhancement weight); minus 8 additional for the breadth gap vs enterprise norms (unit-only depth); +4 credit for isolation and tripwire test design. No blockers.

---

## Phase 10: Documentation Audit

Completed: 2026-07-11.

### Executive Summary

Documentation is far beyond stage norm: 104 markdown files spanning developer docs (auth, data layer, database, tenants, leave, security, seed data, testing), two prior audit reports, a testing roadmap, UAT checklist, four role-based user manuals (HTML plus PDF), 19 branded PDFs, and a full legal/compliance/sales/CS corpus with a document register. docs/security.md now tells the truth about BYPASSRLS (fixed in v2 remediation). The weaknesses are currency and operations: the docs claim features are live in production that are not deployed (AUD3-C1 makes README and register statements false today), there are no Architecture Decision Records (decisions like server-actions-only, BYPASSRLS acceptance, and JSON payslip snapshots live only in audit docs and memory), and there is no operational runbook (deploy, rollback, restore, incident).

### Findings

DOC-1. Medium. Documentation asserts undeployed features are live (README "live in production", register status blocks, clickwrap/disclaimer described as shipped). Root cause is AUD3-C1, but the doc process lacks a "verified in prod" discipline. Effort: XS after deploy is fixed.

DOC-2. Medium. No ADRs. At least five load-bearing decisions deserve one page each: app-layer tenancy over RLS, server-actions-only API, JSON payslip immutability, Decimal money with number app types, squashed baseline migration. Effort: S.

DOC-3. Medium. No ops runbook: deploy verification, rollback procedure, restore procedure, incident response steps (the compliance folder has a breach policy but not an engineering incident runbook). Effort: S.

DOC-4. Low. Developer onboarding path untested: README setup steps have never been exercised on a clean machine by a second person; shadow-DB requirements for migrate dev are documented only in session memory, not the repo. Effort: S.

Positives: breadth and honesty are exceptional; the business/legal corpus with [●] founder-input markers and review-status tracking is investor-grade; user manuals with screenshots exist for all four roles.

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| DOC-1 | Medium | Docs claim undeployed features are live | XS | With AUD3-C1 |
| DOC-2 | Medium | No ADRs for load-bearing decisions | S | No |
| DOC-3 | Medium | No engineering ops runbook | S | No |
| DOC-4 | Low | Clean-machine onboarding unverified | S | No |

### Score: 85/100

Base 100; DOC-1 (-5), DOC-2 (-4), DOC-3 (-4), DOC-4 (-2); no further credit needed, the base reflects the corpus. Strongest phase so far alongside code quality.

---

## Phase 11: UX/UI Audit

Completed: 2026-07-11. Method note: assessed from code structure, lint output, prior manual/E2E artefacts, and the live app's known state; a moderated usability session with a real HR admin remains the gold standard and has not been done (EVIDENCE-GAP).

### Executive Summary

The app has the UX infrastructure of a serious product: 9 route-level loading.tsx skeletons, 9 error.tsx boundaries plus a global-error boundary, toast feedback throughout (sonner), a welcome modal, a getting-started checklist, mobile nav with overflow handling, dark mode, four payslip templates with a live-preview studio, and role-scoped navigation for HR, manager, employee, and executive. Known gaps: no not-found.tsx anywhere (404s fall through to the framework default), accessibility has never been audited (the four jsx-a11y alt-text lint warnings in the payslip PDF are the only signal, and screen-reader/keyboard coverage is unknown), and empty-state handling could not be verified systematically.

### Findings

UX-1. Medium. Accessibility unaudited: no axe/lighthouse pass recorded, 4 open jsx-a11y warnings, keyboard-only operation of the onboarding wizard and payroll flow unverified. Radix primitives give a good baseline, but payroll/HR buyers increasingly require WCAG statements (and tenders ask). Recommended: one axe pass per key page, fix criticals, publish an accessibility statement. Effort: M.

UX-2. Low. No not-found.tsx (0 found); deep links to deleted employees/runs get the default Next 404 instead of an in-app recovery path. Effort: XS.

UX-3. Low. Empty states unverified by this audit (no shared EmptyState component found; pages may inline them). Verify the first-run experience of each page for a brand-new tenant. Effort: S to review.

UX-4. Enhancement. Notification preferences UI still writes to localStorage while the schema has User.notificationPreferences (carried item); users on multiple devices get inconsistent behaviour. Effort: S.

Positives: loading/error boundary coverage is real engineering, not decoration; the role-scoped IA (fixed in the 7-to-9 uplift: managers see their own payslips, exco is honest single-tenant) matches how SA SMEs actually run payroll; the payslip studio is a differentiator-grade feature.

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| UX-1 | Medium | No accessibility audit ever run | M | No (tender risk) |
| UX-2 | Low | No not-found pages | XS | No |
| UX-3 | Low | Empty states unverified | S | No |
| UX-4 | Enhancement | Notification prefs in localStorage | S | No |

### Score: 74/100

Base 100; UX-1 (-9), UX-2 (-2), UX-3 (-3), UX-4 (-3); minus 12 for the absence of any real-user usability evidence at this maturity (enterprise products test with users); +3 credit for state-handling infrastructure.

---

## Phase 12: Compliance Audit

Completed: 2026-07-11. Jurisdiction: South Africa.

### Executive Summary

Compliance engineering is unusually deep: PAYE/UIF/SDL calculation to SARS 2026/27 tables with tripwire tests, ETI with claim ledger and carry-forward, EMP201/EMP501/IRP5-IT3(a) generation with SARS source codes, EEA2/EEA4 employment equity reports, BCEA-correct leave entitlements with SA public holidays, POPIA data export and erasure, audit logging, and a policy corpus covering retention, breach response, deletion, PAIA, and DSARs. Three hard caveats keep this phase from scoring higher: the statutory constants (ETI bands, IRP5 source codes, EEA categories) have never been verified against current official SARS/DoL publications by a human, the clickwrap consent and payroll disclaimer flows are built but NOT live in production (AUD3-C1), and the retention policy exists on paper with no enforcement in code (1 code mention). All legal drafts remain pending attorney review, as they self-declare.

### Findings

COMP-1. High. Statutory constants externally unverified. The calculator is tested against its own constants; nobody has signed off those constants against the current SARS ETI guide, PAYE BRS (source codes), and EEA forms. A wrong ETI band or source code produces wrong money or rejected SARS submissions at scale. Owner: founder, against official publications. Effort: S per table, recurring annually. Blocks production for real payroll: yes.

COMP-2. High. Consent/acceptance flows not live (clickwrap ToS at signup, payroll disclaimer gate) because of AUD3-C1, and no ToS-acceptance timestamp field was found in the schema (only payrollDisclaimerAcceptedAt, schema line 168). POPIA and basic contract enforceability want a record of who accepted what, when, and which version. Recommended: deploy fix first; add termsAcceptedAt/termsVersion capture at signup. Effort: S.

COMP-3. Medium. Retention is policy-only (RET-1 carried from v2): docs/compliance/data-retention-policy.md exists, code has no scheduled enforcement (no cron/job deleting or flagging expired records; BCEA/SARS require multi-year retention while POPIA requires eventual disposal). Recommended: a documented manual annual process first, automation later. Effort: S-M.

COMP-4. Medium. COIDA is unrepresented: no Return of Earnings (W.As.8/ROE) support or data capture. Competitors handle this seasonally. Effort: M, feature-level.

COMP-5. Medium. Attorney review pending on all legal documents (self-declared in the corpus). Cost item, not engineering. Blocks charging customers, arguably.

COMP-6. Low. Audit trail exists (ActivityItem, 9 logging call sites, CSV export) but coverage is not systematic per mutating action; a review of which actions log is needed for a defensible POPIA trail. Effort: S.

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| COMP-1 | High | Statutory constants unverified vs official sources | S, recurring | Yes |
| COMP-2 | High | Consent flows not live; ToS acceptance not recorded | S | Yes |
| COMP-3 | Medium | Retention unenforced (policy only) | S-M | No |
| COMP-4 | Medium | No COIDA/ROE support | M | No |
| COMP-5 | Medium | Legal docs pending attorney review | Cost | For paid GA |
| COMP-6 | Low | Audit-trail coverage unreviewed | S | No |

### Score: 70/100

Base 100; COMP-1 (-10), COMP-2 (-9), COMP-3 (-5), COMP-4 (-4), COMP-5 (-4), COMP-6 (-2); +4 credit for engineering depth (ETI ledger, IRP5, EEA reports are rare at this stage). Blockers: COMP-1 and COMP-2 before any real customer's payroll.

---

## Phase 13: Product Audit (Feature Gap Analysis)

Completed: 2026-07-11. Benchmarks: SimplePay and PaySpace (SA direct), Sage HR, BambooHR, Rippling, Deel, Gusto, Workday.

### Executive Summary

Against its actual near-term competitor set (SimplePay, PaySpace Lite, Sage Business Cloud Payroll for SA SMEs), NovaHR's payroll core is competitive and its UX is ahead. Payroll, leave, statutory filings, payslips, bank files, equity reporting, POPIA tooling, multi-role ESS via web: all present. The honest gaps sort into three tiers. Tier 1 (SA SME dealbreakers): time and attendance capture, employee self-service mobile experience (PWA at minimum), accounting integration (Xero/Sage export first, API later), and billing/payments (PayFast blocked externally on bank account). Tier 2 (expected within a year): performance reviews, recruitment/ATS basics, org chart, benefits administration, workflow automation. Tier 3 (enterprise/Workday territory, not this product's fight yet): multi-country payroll, position management, compensation planning.

### Findings

PROD-1. High. No accounting integration or even a general-ledger export mapping (journal per payroll run: gross, PAYE, UIF, SDL, net, per department). Every SA competitor exports to Xero/Sage/QuickBooks; accountants are also the main referral channel. Recommended: GL journal CSV export first (S-M), Xero API later (L). 

PROD-2. High. Billing is not live (PayFast blocked on business bank account, external). The product cannot charge money; pricing/entitlement enforcement (TenantPlan exists) is unexercised. External dependency; keep visible.

PROD-3. Medium. No time and attendance (clock-in, timesheets, overtime capture feeding payroll). BCEA overtime rules are documented in the compliance corpus but nothing captures hours. Effort: XL, phased.

PROD-4. Medium. No mobile-first ESS: the web app is responsive, but leave requests and payslip access are the two features employees use monthly; a PWA install prompt plus push notifications would cover 80% of the need. Effort: M.

PROD-5. Medium. Notifications engine is minimal: email at workflow points, in-app items, but no digest, no reminders (leave returning, probation ending, ETI expiry, EMP201 due dates). Compliance deadline reminders are a high-value, low-cost differentiator. Effort: M.

PROD-6. Low. No org chart, no performance module, no ATS: correct sequencing to defer; note for roadmap.

Positives and differentiators worth marketing: payslip template studio, ETI engine with carry-forward (SimplePay-grade, rare in new entrants), honest exec view, POPIA export/erasure self-service, Nova suite cross-sell story.

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| PROD-1 | High | No GL/accounting export | S-M start | GA-blocking for many buyers |
| PROD-2 | High | Billing not live (external blocker) | External | Blocks revenue |
| PROD-3 | Medium | No time and attendance | XL | No |
| PROD-4 | Medium | No mobile ESS/PWA | M | No |
| PROD-5 | Medium | No deadline/reminder engine | M | No |
| PROD-6 | Low | No org chart/performance/ATS | Roadmap | No |

### Score: 62/100

Base 100; PROD-1 (-9), PROD-2 (-8), PROD-3 (-6), PROD-4 (-5), PROD-5 (-4), PROD-6 (-3); minus 6 for breadth vs the full benchmark set; +3 for differentiators. Read this score as "young product with the right spine", not "weak product".

---

## Phase 14: Market Analysis

Completed: 2026-07-11. Analytical phase; figures are directional and should be re-validated before investor use.

### Executive Summary

The SA SME payroll market is real, regulated, and sticky: every employer must run PAYE monthly, file EMP201s, and issue payslips, and churn is low once payroll history accumulates. Incumbents: SimplePay (SME favourite, roughly R40-R50 per employee per month tier pricing), PaySpace (mid-market/enterprise, now Deel-owned, which creates upmarket drift and an SME opening), Sage (legacy trust, dated UX). NovaHR's wedge: modern UX at SME price, the Nova Business OS bundle (POS plus accounting plus HR for the same SMB), and speed of iteration. The two market-facing blockers are the same as the product ones: cannot charge (PayFast pending bank account) and cannot send email from a real domain (Resend pending domain), both external. The credible near-term motion is accountant-led distribution: accountants run payroll for dozens of SMEs and choose the software.

### Findings

MKT-1. High (external). Go-to-market is gated on business infrastructure: bank account (PayFast), domain (Resend sending plus credibility), Netcash production credentials (meeting scheduled). None is engineering work; all block revenue.

MKT-2. Medium. Pricing is undefined in public: TenantPlan exists in code, financial models exist in the repo, but no published pricing page or packaging decision (per-employee vs flat tiers). Recommended: launch pricing anchored under SimplePay with an accountant/multi-client plan. Effort: decision plus S.

MKT-3. Medium. No accountant/bureau multi-client story yet (one login managing many tenants): the Tenants area is single-company for exco; a bureau console would unlock the highest-leverage channel. Effort: L, roadmap item.

MKT-4. Enhancement. AI opportunity via NovaPilot is real and unclaimed in SA SME payroll (anomaly detection on runs, "explain this payslip" for employees, compliance Q&A) but should follow, not precede, launch basics.

Opportunities summary: beta cohort via the founder's network now (free, feedback-for-access), accountant channel next, Nova bundle pricing as differentiation, COIDA/ROE season and EMP501 season as marketing moments.

### Severity Table

| ID | Severity | Finding | Effort | Blocks prod |
|----|----------|---------|--------|-------------|
| MKT-1 | High | Bank account/domain/Netcash creds gate GTM | External | Blocks revenue |
| MKT-2 | Medium | No pricing decision/page | S | Pre-GA |
| MKT-3 | Medium | No bureau/accountant console | L | No |
| MKT-4 | Enhancement | AI differentiation unclaimed | Roadmap | No |

### Score: 68/100

Base 100; MKT-1 (-12, external but decisive), MKT-2 (-6), MKT-3 (-8), MKT-4 (-2, enhancement weight); +minor credit implicit in base for a genuinely defensible wedge and suite story. 

---

## Phase 15: Launch Readiness (Final Executive Report)

Completed: 2026-07-11.

### Scorecard

| Phase | Score |
|-------|-------|
| 0 Discovery | 78 |
| 1 Architecture | 80 |
| 2 Code Quality | 84 |
| 3 Security | 78 |
| 4 API | 58 |
| 5 Database | 82 |
| 6 Performance | 65 |
| 7 DevOps | 48 |
| 8 GitHub | 52 |
| 9 Testing | 72 |
| 10 Documentation | 85 |
| 11 UX/UI | 74 |
| 12 Compliance | 70 |
| 13 Product | 62 |
| 14 Market | 68 |

### Composite Scores

- Overall Product Score (UX 30, Product 45, Market 25): 67/100
- Overall Engineering Score (Arch 20, CQ 20, API 10, DB 20, Perf 10, Testing 20): 76/100
- Overall Security Score (Phase 3 at 70% plus security-relevant DB/DevOps/Compliance at 30%): 75/100
- Overall Launch Readiness Score: 59/100 CAPPED by the open Critical (uncapped weighted value: 71/100, security and database double-weighted)
- Overall Enterprise Readiness Score (launch basis adjusted for DevOps, Documentation, Compliance): 66/100

### Verdict: NOT READY, by one Critical and a short list of conditions. Expected to reach READY WITH CONDITIONS (limited beta, real customers, close monitoring) within days once the blocker list below is cleared, because every internal blocker is small.

### Critical blocker (fix today)

1. AUD3-C1: rename the public /compliance page (route collision), verify `next build`, push, confirm a green Vercel production deploy, then click through clickwrap and the payroll disclaimer gate in prod. Everything shipped in the last 2 days is currently not live.

### Production gate (this week, all small)

2. DISC-1 + GH-1: GitHub Pro (or public repo), branch protection on main, PRs required, CI required. 30 minutes plus $4/month.
3. DEVOPS-2: deploy-failure notifications, uptime monitor on /api/health, confirm Sentry DSN live and one alert rule. Half a day.
4. CQ-1: fix the 7 lint errors so the gate starts green. 30 minutes.
5. DB-1: confirm Supabase plan/PITR, rehearse one restore to a scratch project, write the runbook. Half a day to a day.
6. COMP-1: founder verifies ETI bands, IRP5 source codes, EEA categories against current official SARS/DoL publications. A focused afternoon, then recurring annually.
7. COMP-2: after the deploy fix, record ToS acceptance (termsAcceptedAt/termsVersion) at signup. Half a day.

### 30-day conditions (before charging money / GA)

8. DISC-2 + DEVOPS-3: separate dev/staging Supabase project; previews stop touching prod data; E2E moves into CI (TEST-3).
9. SEC-3: shared-store rate limiting (Upstash or Postgres window).
10. GH-2/GH-3: Dependabot on; start tagging releases.
11. MKT-2 + PROD-2 externals: bank account, PayFast, domain, Resend, pricing page.
12. COMP-5: attorney review pass on ToS/DPA at minimum.

### 90-day improvement plan

- Month 1: the 30-day conditions above, plus PERF-1 pagination on employees/payslips/activity, PROD-1 GL journal export, SEC-1 middleware parity test, DOC-3 ops runbook.
- Month 2: SEC-2 MFA (TOTP via Supabase), PROD-4 PWA/mobile ESS pass, PROD-5 compliance deadline reminders, TEST-1/TEST-2 coverage floor plus first component tests, CQ-2 zod rollout to the top 10 mutating actions.
- Month 3: MKT-3 bureau console design spike, SEC-4 CSP nonces, COMP-3 retention enforcement (manual process documented, automation started), UX-1 accessibility pass, PERF-5 load test of payroll completion at 1,000 employees.

### Risk register (top 8, likelihood x impact)

| Risk | L | I | Mitigation |
|------|---|---|-----------|
| Silent deploy/ops failure recurs | High | High | Blockers 2-3 |
| Statutory constant wrong in a real filing | Med | Critical | Blocker 6, annual ritual |
| Prod data damaged from dev access | Med | Critical | Condition 8 |
| Payroll trust incident (silent best-effort failure) | Med | High | CQ-3, Sentry alerts |
| Enterprise deal lost to missing MFA/API | High | Med | SEC-2, API-1 roadmap |
| Scale wall at first large tenant | Low | High | PERF-1, PERF-5 |
| Legal exposure from unreviewed contracts | Med | High | COMP-5 |
| GTM stall on external infra | High | High | MKT-1: bank, domain, Netcash |

### Strengths worth protecting

Domain depth (SARS-grade payroll engine with tripwire tests), code hygiene metrics most teams never reach, documentation corpus, honest security model, migration discipline, and iteration speed. 

### Closing statement

NovaHR's product core is stronger than its delivery pipeline. Nothing found in 15 phases suggests structural rework; every internal blocker is measured in hours or days. The pattern to break is pushing unreviewed, unbuilt code to an auto-deploying main branch: it has now cost two days of silent production staleness on legally significant features. Fix the pipe, verify the constants, rehearse a restore, and this platform is a credible limited-beta payroll product with a real path to the SA SME market.

END OF AUDIT V3.
