# NovaHR Battle Plan: Becoming a Worthy Competitor

**Created:** 11 July 2026
**Sources synthesised:** Enterprise Audit v3 (ENTERPRISE_AUDIT_V3.md), Competitor Analysis (marketing/novahr-competitor-analysis-2026-07-11.md), Release Readiness Audits v1/v2, UAT Checklist, Testing Roadmap.
**Purpose:** Single source of truth for everything NovaHR needs to fix, add, or change to become the undisputed compliance-first HR and payroll platform for South African businesses with 10 to 100 employees. Organized by priority. Specific enough to hand to a developer and start today.

---

## The Verdict (Read This First)

NovaHR's product core is strong. The SARS payroll engine, compliance surface, role design, and Netcash integration are ahead of what most SME entrants build. The gap is not features; it is trust and completeness of workflow.

A buyer evaluating NovaHR against SimplePay, Sage, or PaySpace will hit four questions we cannot answer well yet:

1. "Can my accountant get the numbers out?" (No GL export exists.)
2. "Can my staff use it on their phones?" (No PWA/mobile ESS.)
3. "Is it secure enough for banking data?" (No MFA.)
4. "What if something goes wrong?" (No formal restore rehearsal, no deploy alerting, no migration kit.)

Fix those four. Everything after that turns NovaHR from a capable product into a force in the market.

---

## What We Already Have (Protect and Market This)

These are verified from the live repository and production deployment (novahr-five.vercel.app, confirmed READY 11 July 2026). Never undersell these.

| Strength | Why It Matters | Who Else Has It |
|---|---|---|
| 2026/27 SARS PAYE/UIF/SDL/ETI engine with tripwire tests | Deeper than most new entrants; 35 Decimal(15,2) money columns | PaySpace (very deep), SimplePay (comparable) |
| ETI claim ledger with carry-forward | Correct per SARS recon periods | PaySpace only among SME tools |
| EMP201/EMP501/IRP5/IT3(a)/EEA2/EEA4 from payroll data | One workflow, not separate modules | PaySpace at enterprise price; NovaHR at R999 |
| Netcash NIF/EFT export and direct NIWS submission with AES-256-GCM key encryption | Practical SA operational advantage | PaySpace (managed), PayDay (legacy) |
| 9 BCEA leave types with SA public holiday calculation | Complete statutory leave | SimplePay, Sage |
| Payroll approval workflow with maker-checker | Audit trail for signatories | Sage Premier, PaySpace Premier |
| 4 branded payslip templates with live studio (logo, accent, footer, layout toggles) | Differentiated UX | Nobody in the SME bracket |
| Employee document vault with private storage and signed URLs | POPIA-compliant | HRSimplified (upper tier) |
| POPIA self-service data export and erasure | Required by law; most tools ignore it | Rare even in enterprise tools |
| Cross-tenant isolation tests (12 tests) and explicit tenantId predicates on all queries | Defensible audit evidence | Enterprise HR platforms |
| Role-based views: HR, Manager, Employee, Executive | Right mental model for SA SMEs | Most tools flatten HR and manager |
| 301 unit tests, 5-journey Playwright E2E suite | Engineering credibility | SimplePay, PaySpace |
| Honest security documentation (BYPASSRLS acknowledged, documented) | Enterprise procurement trust | Almost nobody documents this honestly |
| Flat-band pricing at R499/R999/R2,499 | Value sweet spot at 20 to 60 employees | Unique in the category |

---

## PHASE 0: Critical Blockers (Fix Before Anything Else)

These are active production problems. Nothing else matters until these are done.

### 0.1 CI/CD and Branch Protection

**Audit ref:** DISC-1, GH-1, AUD3-C1 (resolved but recurrence risk is high)
**Problem:** Pushes directly to main auto-deploy to production with zero automated checks. The last 9 commits bypassed PRs. This is how AUD3-C1 (route collision) caused 5 consecutive silent production failures.
**Evidence:** `.github/workflows/ci.yml` lines 3-9: `push: branches-ignore: [main]` runs CI on everything except the branch that goes to customers.

**Fix (30 minutes plus $4/month):**
1. Upgrade GitHub to Pro (wandile-mtshwene/novahr is private; Free plan returns 403 on branch protection).
2. In GitHub Settings > Branches > Add rule for `main`:
   - Require a pull request before merging
   - Require status checks: `lint-type-test` (the CI job name)
   - Require branches to be up to date before merging
   - Do not allow force pushes
3. In `.github/workflows/ci.yml`, change `branches-ignore: [main]` to `branches: ['**']` so PRs to main also run CI.
4. Alternatively as an interim: add a `push: branches: [main]` job in CI that must pass; use the Vercel ignored build step feature to block deploys if the check fails.

**Done when:** A direct push to main is rejected by GitHub, and a PR cannot merge unless CI passes.

### 0.2 Lint Errors on Main

**Audit ref:** DISC-3, CQ-1
**Problem:** `npm run lint` currently shows 7 errors on main. CI would catch these if it ran, which it does not.

**Fix (30 minutes):**
- `src/components/payroll/current-run-card.tsx:231,233` - replace `'` with `&apos;` or rewrite the string (react/no-unescaped-entities).
- `scripts/capture-guide-screenshots.ts` - add type annotations instead of `any`.
- `e2e/golden-journeys.spec.ts:306` - change `let` to `const`.
- `src/lib/payroll/pdf.tsx` - add `alt` props to `<img>` elements in PDF components.

**Done when:** `npm run lint` exits 0.

### 0.3 Deploy Failure Alerting

**Audit ref:** DEVOPS-2
**Problem:** The five-day production outage was discovered manually. No alerts fired.

**Fix (2 hours):**
1. In Vercel Project Settings > Notifications: enable email/Slack alerts for deployment failures and errors.
2. Add UptimeRobot or Checkly free plan monitoring on `https://novahr-five.vercel.app/api/health`. Alert on non-200 via email.
3. Verify Sentry DSN is set in Vercel env (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`). Check `sentry.client.config.ts` and `instrumentation-client.ts` are not double-initialising (DEVOPS-5): remove `sentry.client.config.ts` if both exist; keep only `instrumentation-client.ts` per Next.js 15 convention.
4. In Sentry, create one alert rule: any unhandled exception in production fires immediately to email.

**Done when:** A broken deploy sends an email within 5 minutes. An unhandled runtime error appears in Sentry within 60 seconds.

### 0.4 Database Backup and Restore Rehearsal

**Audit ref:** DB-1
**Problem:** Supabase manages backups, but restore has never been rehearsed. For payroll data this is a launch condition. Nobody knows if PITR is available on the current plan.

**Fix (half a day):**
1. Log into Supabase dashboard. Under project settings, find the current plan and PITR window (Free plan: daily snapshots only; Pro: 7-day PITR).
2. If on Free plan: upgrade to Pro before onboarding real customers, or use `pg_dump` on a cron schedule to an external bucket as additional backup.
3. Rehearsal: take a manual `pg_dump` of the production database. Spin up a second temporary Supabase project. Run `psql` to restore the dump. Verify one payroll run, one employee record, and one leave request survived. Delete the temp project.
4. Write the result as `docs/ops/RESTORE_RUNBOOK.md` (see Section below for full template).

**Done when:** A restore runbook exists and was proven against a real dump in the last 30 days.

### 0.5 Statutory Constants Verification

**Audit ref:** COMP-1
**Problem:** The PAYE calculator, ETI bands, IRP5 source codes, and EEA occupational categories are tested against themselves, not against official SARS/DoL publications. A wrong ETI band or source code produces wrong money or rejected SARS submissions.

**Fix (founder, one focused afternoon, then annually):**
1. Download the current SARS ETI Guide from sars.gov.za. Verify every band in `src/lib/payroll/eti.ts` against it: the R2,500/R7,500 salary threshold, the 60%/50% calculation percentages, the 24-month window logic.
2. Download the SARS PAYE BRS from sars.gov.za. Verify all source codes in `src/lib/compliance/irp5.ts` (3601, 3605, 3606, 3701, 3713, 3699, 4001, 4005, 4102, 4141).
3. Download the DoL EEA forms. Verify occupational level categories in `src/lib/compliance/employment-equity.ts`.
4. Add a comment at the top of each file: `// Constants verified against SARS [document name] on [date] by [name]`.
5. Add this verification to the annual calendar: each March/April after the budget, re-verify PAYE tables; each year, re-verify ETI and source codes.

**Done when:** A human with relevant knowledge has signed off every statutory constant against the current official source. Written record exists in the codebase.

### 0.6 ToS Acceptance Recording

**Audit ref:** COMP-2
**Problem:** The clickwrap ToS acceptance at signup exists in code but `termsAcceptedAt` is not stored in the schema. Only `payrollDisclaimerAcceptedAt` was found. POPIA and basic contract enforceability require a record of who accepted what and when.

**Fix (half a day):**

Schema change in `prisma/schema.prisma` on the `User` model:
```prisma
termsAcceptedAt    DateTime?
termsVersion       String?
```

Apply via idempotent SQL (not `db push`):
```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMPTZ;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;
```

In the signup action (`src/lib/auth/actions.ts` or wherever the user is created post-confirmation), after setting the Supabase user, update the DB record:
```ts
await prisma.user.update({
  where: { id: userId },
  data: {
    termsAcceptedAt: new Date(),
    termsVersion: "2026-07-v1",
  },
});
```

On the clickwrap modal: capture acceptance server-side, not just client-side. Call the update action when the user checks the box and continues.

**Done when:** Every newly signed-up user has `termsAcceptedAt` set. Existing users should accept on next login if `termsAcceptedAt` is null (show a prompt; they cannot proceed until they accept).

---

## PHASE 1: Production Gate (This Week)

These are not emergencies, but they block calling this product "production-ready for paying customers."

### 1.1 Dev/Staging Environment Separation

**Audit ref:** DISC-2, DEVOPS-3
**Problem:** Local development and E2E tests share the production Supabase database. One wrong `prisma migrate reset` or seed run on local erases customer data. Preview deployments also point at production.
**Risk:** Highest-leverage single risk after the CI gate. "One wrong command" category.

**Fix (half a day to a day):**
1. Create a new Supabase project: `novahr-dev` in the same region (eu-west-1).
2. Apply the baseline migration to the dev project: `psql <dev-db-url> -f prisma/migrations/20260709120000_baseline_v1/migration.sql`.
3. Update local `.env`:
   - `DATABASE_URL` to point at `novahr-dev`
   - `NEXT_PUBLIC_SUPABASE_URL` to the dev project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the dev project anon key
   - `SUPABASE_SERVICE_ROLE_KEY` to the dev project service role key
4. In Vercel, under the novahr project settings > Environment Variables, set all Supabase vars for `Preview` environment to point at the dev project.
5. Create dev storage buckets (`payslip-assets`, `employee-documents`, `employee-photos`, `leave-documents`) in the dev Supabase project.
6. Seed the dev DB using `src/seed.ts` (or the existing seed script).
7. The E2E suite should run against the dev project by default (when `NEXT_PUBLIC_APP_ENV !== "production"`).

**Done when:** `echo $DATABASE_URL` on local points to `novahr-dev`, not `epmsbbcedbhtiwwtiyts`. A `prisma migrate reset` on local destroys only dev data.

### 1.2 Route Namespace Convention

**Audit ref:** ARCH-1
**Problem:** Public pages at `src/app/<name>` and authenticated pages at `src/app/(app)/<name>` share the same URL namespace. This already caused AUD3-C1 (the /compliance collision). The next public page added with a name matching an app route will cause the same silent 5-day outage.

**Fix (1 hour):**
1. Move all public/marketing pages under a `/trust` or `/legal` prefix: rename `src/app/compliance/page.tsx` to `src/app/trust/compliance/page.tsx` (or whichever name avoids the app namespace).
2. Update internal links pointing to the old public compliance URL.
3. Add a rule to `AGENTS.md`: "Public pages must live under `/trust/*`, `/legal/*`, or a prefix that cannot collide with `(app)` routes. Never add a public page at the root that shares a name with an existing `(app)` route."
4. In CI or as a pre-commit hook, add a check: `find src/app -maxdepth 1 -name "*.tsx" -not -name "layout.tsx" -not -name "page.tsx"` (check for direct competitors with app route names).

**Done when:** `next build` succeeds from a clean checkout. The public compliance page has a URL that cannot collide with the authenticated compliance page.

### 1.3 Shared-Store Rate Limiting

**Audit ref:** SEC-3
**Problem:** `src/lib/security/rate-limit.ts` is per warm Vercel instance. On Fluid Compute scale-out, an attacker distributing across instances bypasses limits entirely. Supabase-side auth limits are the real backstop for login/signup (correct), but invite/contact/Netcash limits are in-memory only.

**Fix (S to M):**

Option A (simplest, no new service): A Postgres-backed sliding window table.
```sql
CREATE TABLE IF NOT EXISTS "RateLimitEntry" (
  "key" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "count" INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS "rate_limit_key_ts" ON "RateLimitEntry"("key", "timestamp");
```
Implement a `checkRateLimit(key: string, windowMs: number, max: number): Promise<boolean>` that counts recent rows and inserts one per attempt. Run a cleanup cron for old rows.

Option B (recommended for production): Provision Upstash Redis via Vercel Marketplace. Swap `rate-limit.ts` to use `@upstash/ratelimit`. One import change, fully distributed, no new infra to manage.

**Done when:** Two concurrent incognito tabs hammering the contact form from different "instances" are both rate-limited correctly within the window.

### 1.4 Dependabot and Release Tagging

**Audit ref:** GH-2, GH-3
**Problem:** No dependency vulnerability scanning. For payroll software with banking data, an unpatched CVE is a vendor-assessment finding. No release tags makes rollback identification dependent on reading commit messages.

**Fix (15 minutes):**

Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    groups:
      production-dependencies:
        dependency-type: "production"
      development-dependencies:
        dependency-type: "development"
```

Tag the current main as the first release:
```bash
git tag -a v1.0.0-beta -m "Limited beta release"
git push origin v1.0.0-beta
```

Going forward: tag every release. Add to the release process in the ops runbook.

**Done when:** GitHub shows Dependabot PRs each Monday. `git tag -l` shows at least one tag.

---

## PHASE 2: Competitive Feature Gaps (This Month)

These are the features that cause NovaHR to lose deals it should win. Ordered by deal impact.

### 2.1 GL Journal / Accounting Export (PROD-1) - Highest ROI Feature

**Why:** This is the single most requested feature by SA SMEs. Every competing product exports to Xero and/or Sage. Accountants choose the software their clients use, which means accountants are both a blocker and a referral channel. No GL export = no accountant endorsement = slow growth.

**What to build:**

Step 1 - GL journal CSV (S, 2 to 3 days):

Create `src/lib/export/gl-journal.ts`:
```ts
export type GlJournalRow = {
  date: string;           // pay period end date
  account: string;        // GL account code (user-configurable)
  description: string;    // "Payroll - [period] - [department]"
  debit: number;
  credit: number;
  reference: string;      // payroll run reference
  department: string;
  costCentre: string;
};

export function buildGlJournal(run: PayrollRunWithPayslips, settings: GlSettings): GlJournalRow[] {
  // Debit: Gross salaries expense per department
  // Credit: Net pay control (= NETSALARIES payable)
  // Credit: PAYE payable
  // Credit: UIF payable (employer + employee)
  // Credit: SDL payable
  // Debit: ETI receivable (from EMP201 data)
  // Credit: Pension/provident fund payable (if applicable)
}
```

Schema: add `GlSettings` to `PayrollSettings`:
```prisma
glGrossSalaryAccount  String?
glNetPayAccount       String?
glPayeAccount         String?
glUifAccount          String?
glSdlAccount          String?
glPensionAccount      String?
```

Settings UI: a "GL Accounts" card in Settings > Payroll, with one text input per account code line.
Export button on the payroll run detail page, next to the existing "Download ZIP" payslips button.
Output format: CSV compatible with Xero journal import (Date, Description, Reference, Quantity, Unit Price, Account Code, Tax Type, Tracking Name 1).

Step 2 - Xero API integration (L, 1 to 2 weeks, after Step 1 is validated):
- OAuth2 flow with Xero. Store `xeroTenantId` and encrypted refresh token on `TenantIntegration` table.
- Map NovaHR GL rows to Xero Manual Journal API.
- UI: Settings > Integrations > Connect Xero.

Step 3 - Sage Accounting integration (L, after Xero validated):
- Similar OAuth2 flow.
- Sage Accounting API journal endpoint.

**Done when (Step 1):** An HR admin can download a GL journal CSV from any completed payroll run that imports cleanly into Xero (zero manual edits). An accountant testing with a real client account has reconciled one payroll successfully.

### 2.2 MFA (Multi-Factor Authentication) (SEC-2)

**Why:** Every enterprise buyer treats MFA as table stakes for HR/payroll systems. SimplePay, Sage, and PaySpace all offer or require it. NovaHR stores banking details and South African ID numbers; an MFA objection in a procurement review will lose the deal.

**What to build (M, 3 to 5 days):**

Supabase Auth has built-in TOTP MFA. Wire it up:

Step 1 - Enable in Supabase Dashboard: Authentication > Multi-factor authentication > Enable TOTP.

Step 2 - UI: `/account/security` tab with:
- "Enable two-factor authentication" toggle
- QR code display via Supabase `mfa.enroll()` call
- Verification code input to confirm enrollment
- Recovery codes (8 single-use codes, store hashed)
- "Disable MFA" with password confirmation

Step 3 - Challenge flow: after successful email/password login, if the user has MFA enrolled, redirect to `/auth/mfa` for TOTP code entry. Use `supabase.auth.mfa.challengeAndVerify()`.

Step 4 - Tenant policy (optional, Phase 2): HR admin can require MFA for all users in their tenant. Add `requireMfa` boolean to `TenantSettings`. On session check in `requireUser()`, if tenant requires MFA and the user's session is not MFA-verified, redirect to `/auth/mfa`.

Step 5 - Security pack update: update `docs/security.md` to state MFA is available and can be required by tenant policy.

```ts
// src/lib/auth/mfa-actions.ts
"use server";
export async function enrollMfa() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  // returns { id, type, totp: { qr_code, secret, uri } }
  return { data, error };
}

export async function verifyMfaEnrollment(factorId: string, code: string) {
  const supabase = await createClient();
  const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
  return supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
}
```

**Done when:** An HR admin can enable TOTP on their account, and a new login from that account cannot reach the dashboard without entering the correct TOTP code. The security documentation is updated.

### 2.3 Mobile Employee Self-Service (PWA) (PROD-4)

**Why:** Employees request leave and check payslips on their phones. SimplePay has native iOS and Android apps. Until NovaHR has a mobile experience, employees will complain, HR admins will hear about it, and the next SimplePay comparison is hard to win.

**What to build (M, 3 to 5 days for PWA baseline):**

Step 1 - PWA manifest and service worker:

Create `public/manifest.webmanifest`:
```json
{
  "name": "NovaHR",
  "short_name": "NovaHR",
  "description": "Your workplace in your pocket",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#1a1c2e",
  "theme_color": "#1a1c2e",
  "icons": [
    { "src": "/icon-dark-sq.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-dark-sq.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

In `app/layout.tsx`, add:
```tsx
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#1a1c2e" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

Step 2 - Mobile-optimised ESS pages (the employee-facing routes): audit `/payslips`, `/leave`, `/account` on a real Android phone (not just Chrome DevTools). Fix tap target sizes, font sizes, and overflow. The layout is already responsive; this is polish, not a rewrite.

Step 3 - "Install app" prompt: add a component that detects when the app is not installed as a PWA (`window.matchMedia('(display-mode: browser')`) and shows a banner: "Add NovaHR to your home screen for quick access." Only show to employees, not HR admins.

Step 4 - Push notifications (later, Phase 3): when Web Push is wired, employees can receive leave decision notifications and payslip availability alerts on their phones without opening the app.

**Done when:** An employee on a real low-end Android phone can: install NovaHR from the browser prompt, open it from the home screen, view their payslips, and submit a leave request. Performance on a 4G connection is acceptable (under 5 seconds first load).

### 2.4 Migration Kit (Deal Enabler)

**Why:** Switching payroll software is the single biggest perceived risk for any buyer. SimplePay and Sage both have established import paths. NovaHR has POPIA export but no formal migration-in tooling. Building this turns the longest sales objection into a strength.

**What to build (M, 1 week for initial version):**

Create `docs/migration/` with the following assets:

**Employee import template** (`employee-import-template.xlsx`):
Fields: EmployeeNo, FirstName, LastName, EmailAddress, PhoneNumber, IDNumber, TaxNumber, StartDate, Department, JobTitle, GrossMonthlyRate, PaymentMethod (EFT/Cash), BankName, BranchCode, AccountNumber, AccountType, LeaveBalance-Annual, LeaveBalance-Sick.

**Payroll history import** (CSV format for YTD figures):
Fields: EmployeeNo, PeriodYear, PeriodMonth, GrossIncome, PAYE, UIF-Employee, UIF-Employer, SDL, ETIAmount, NetPay.

**In-app bulk import action** (`src/lib/employees/bulk-import.ts`):
- Parse CSV with `papaparse`
- Validate each row with zod schema
- Return a preview (dry run with error list) before committing
- Commit as a transaction: create employees, their departments, their leave balances

**Parallel-run checklist** (Markdown, `docs/migration/PARALLEL_RUN_CHECKLIST.md`):
Week 1: Load current payroll into NovaHR. Run both your current system and NovaHR for the same period.
Week 2: Compare gross and net figures. Identify any variances. Document reasons.
Week 3: If variances are zero or explained: cut over. If not: investigate and re-test.
Week 4: Go live on NovaHR only. Archive the old system for 5 years (SARS record-keeping requirement).

**SimplePay export guide** (`docs/migration/FROM_SIMPLEPAY.md`):
Which SimplePay reports to export. Which columns map to which NovaHR import fields. Common gotchas.

**Sage Payroll export guide** (`docs/migration/FROM_SAGE.md`):
Same format as SimplePay guide.

**Done when:** A business with 20 employees can move from SimplePay to NovaHR in under 2 hours with no manual re-keying of payroll history. Two design partners have completed the parallel-run checklist with zero unexplained variances.

### 2.5 Compliance Deadline Calendar and Evidence Tracker (PROD-5)

**Why:** This turns a reporting feature into an operating tool. Competitors show reports; NovaHR shows what is due, who owns it, and what evidence is attached. No competitor at the SME price point does this well. It is a meaningful differentiator that directly addresses the "SARS penalty" fear.

**What to build (M, 3 to 5 days):**

Schema additions:
```prisma
model ComplianceDeadline {
  id          String   @id @default(cuid())
  tenantId    String
  type        ComplianceDeadlineType
  period      String   // "2026-07" or "2026/27"
  dueDate     DateTime
  status      ComplianceDeadlineStatus @default(UPCOMING)
  ownerId     String?
  evidenceUrl String?
  notes       String?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  tenant      Tenant   @relation(fields:[tenantId], references:[id])
  owner       User?    @relation(fields:[ownerId], references:[id])
}

enum ComplianceDeadlineType {
  EMP201_SUBMISSION
  EMP501_RECONCILIATION
  IRP5_ISSUE
  UIF_DECLARATION
  EEA_SUBMISSION
  COIDA_ROE
  TAX_YEAR_END
}

enum ComplianceDeadlineStatus {
  UPCOMING
  DUE_SOON  // within 7 days
  OVERDUE
  SUBMITTED
  EVIDENCE_ATTACHED
}
```

When a payroll run completes, auto-populate the next EMP201 deadline (7th of the following month) if it does not exist yet.

UI: `/compliance` page gets a "Deadlines" tab (alongside the existing EMP201 and Year-end tabs). Shows:
- A calendar heatmap or table view of upcoming deadlines (next 90 days)
- Status badges: green (submitted), amber (due within 7 days), red (overdue), grey (upcoming)
- Click any deadline to open a detail panel: assign owner, attach evidence (PDF upload to private bucket), add notes, mark submitted
- A count of overdue items appears in the sidebar nav badge for HR admins

Email reminders (PROD-5 extension): 14 days, 7 days, and 1 day before each deadline, send an email to the assigned owner (and HR admin if no owner). Use the existing Resend email module.

**Done when:** On the first day of each month, the HR admin can open the Deadlines tab and see every compliance obligation for the month, its due date, status, and the person responsible. At least one deadline has evidence attached that proves it was submitted.

---

## PHASE 3: Trust and Sales Enablement (Next Month)

### 3.1 Accountant Partner Portal (MKT-3)

**Why:** Accountants manage payroll for dozens of SMEs. Winning one accountant as a partner wins 10 to 30 clients. SimplePay already courts accountants with a simple multi-client view. NovaHR has a structural advantage: the compliance workflow is integrated with payroll, which means an accountant using NovaHR sees more than a payroll tool.

**What to build (L, 1 to 2 weeks for v1):**

New role: `ACCOUNTANT`. An accountant user is not attached to one tenant; they have `AccountantAccess` records linking them to multiple tenants.

Schema:
```prisma
model AccountantAccess {
  id          String   @id @default(cuid())
  userId      String
  tenantId    String
  grantedAt   DateTime @default(now())
  grantedById String
  permissions Json     // { viewPayroll: true, downloadJournal: true, viewCompliance: true }
  user        User     @relation(...)
  tenant      Tenant   @relation(...)
}
```

UI at `/accountant` (new route group `(accountant)`):
- Dashboard: list of client tenants with last payroll run date, next EMP201 due date, any overdue deadlines
- Per-tenant view: jump into any client's payroll runs, GL journal export, compliance deadlines (read-only; accountant cannot run payroll on behalf of the client)
- GL export: same as PHASE 2.1 but accessible from the accountant view

Invite flow: HR admin invites an accountant from Settings > Users with role `ACCOUNTANT`. The accountant accepts and sees their client list.

Marketing: create an "Accountant Pack" document (PDF from existing docs/sales material) explaining what the accountant view looks like, what journal format is provided, and how to refer clients. Offer 3 months free for accountants who refer 3 paying customers.

**Done when:** One real accountant has logged in, connected to 2 client tenants, and downloaded GL journals without calling for help. They can reconcile a payroll in under 15 minutes.

### 3.2 Notification Engine (PROD-5 Extension)

**Audit ref:** PROD-5, UX-4
**Problem:** Notification preferences are stored in localStorage (inconsistent across devices). No compliance reminders, no leave-expiry alerts, no probation-ending notifications.

**What to build (M, 3 to 4 days):**

Step 1 - Fix notification preferences: migrate from localStorage to `User.notificationPreferences` (already in schema as JSON). On the account page (`/account`), save preferences via a server action. On load, read from DB, not localStorage.

Step 2 - Automated notifications to add:
- EMP201 due in 7 days: email to HR admin + assigned owner
- Employee leave return: email to manager the day before leave ends
- Probation period ending (if `Employee.probationEndDate` is set): email to HR admin 14 days before
- Leave balance low: email to employee when sick leave drops below 2 days
- Payslip available: email to employee when payroll run is completed (already exists in `sendPayslipEmail`; ensure it fires)

Step 3 - In-app notification bell: already exists. Add unread count badge and ensure every automated email also creates an `ActivityItem` visible in the notification panel.

**Done when:** An HR admin receives an email reminder 7 days before the EMP201 due date. Notification preferences set on mobile persist when logging in on a desktop.

### 3.3 Employee Self-Service: Performance and Onboarding Documents (PROD-6 - Partial)

**Why:** HRSimplified and Simplify Teams win deals specifically because they have document signing, onboarding workflows, and employee-facing process tools. NovaHR should not build a full ATS or LMS yet, but it can add the most-used document workflows at low cost.

**What to build (M):**

Step 1 - Document acknowledgement: on the Employee Document tab (already built), add a "Request acknowledgement" action for any document. This sends the employee a link to `/employee/documents/<id>/acknowledge`. The employee sees the document (PDF preview) and clicks "I have read and acknowledge this document." Stores `acknowledgedAt` and `acknowledgedByUserId` on `EmployeeDocument`.

Step 2 - Onboarding checklist: when an employee is created, auto-create a checklist of standard onboarding tasks:
- ID document uploaded
- Bank details confirmed
- Employment contract signed and uploaded
- Tax directive received (if applicable)
- Leave policy acknowledged

HR admin sees the checklist on the employee profile under a new "Onboarding" tab. Employees can also see their own checklist.

Step 3 - Probation tracking: add `probationEndDate` to the Employee model. Surface in the Onboarding tab. Fire the reminder notification (from 3.2 above).

**Done when:** An HR admin can send a new employee their contract for digital acknowledgement and track which onboarding documents are complete without using email or a shared folder.

### 3.4 Time and Attendance (Phase 1: Timesheet Import) (PROD-3)

**Why:** Hourly workers are a large portion of the SA SME market (retail, hospitality, clinics). Without time capture, NovaHR cannot serve this segment. SeamlessHR and HRSimplified offer time modules. Do not build biometric clocking first; build timesheet import that feeds payroll calculation.

**What to build (L, 1 to 2 weeks for Phase 1):**

Schema:
```prisma
model Timesheet {
  id          String   @id @default(cuid())
  tenantId    String
  employeeId  String
  periodStart DateTime
  periodEnd   DateTime
  regularHours Decimal @db.Decimal(8,2)
  overtimeHours Decimal @db.Decimal(8,2)
  status      TimesheetStatus @default(DRAFT)
  submittedAt DateTime?
  approvedAt  DateTime?
  approvedById String?
  notes       String?
  employee    Employee @relation(...)
  tenant      Tenant   @relation(...)
}

enum TimesheetStatus { DRAFT SUBMITTED APPROVED REJECTED }
```

Payroll integration: when building a payslip for an hourly employee (`Employee.paymentType === "HOURLY"`), look up the approved `Timesheet` for the payroll period. Calculate gross as `regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5` (BCEA overtime rate). Override the fixed `basicSalary` path.

CSV import: HR admin can upload a CSV of employee timesheets per period. The import validates hours (max 45 regular hours per week per BCEA), warns on overtime exceeding BCEA limits, and creates draft timesheets that must be approved before payroll runs.

Manager approval: managers see pending timesheets for their department in a new tab on the manager dashboard. Approve or reject with a note.

Phase 2 (later): web clock-in/clock-out page for employees. Mobile-first, GPS-optional. Writes to `TimesheetEntry` rows that roll up into `Timesheet` weekly summaries.
Phase 3 (later): integrate a third-party biometric/clocking device API.

**Done when (Phase 1):** A retail company with 15 hourly employees can import a CSV of weekly hours, have a manager approve them, and run a payroll that calculates gross pay and overtime from those hours, not from a fixed monthly salary.

---

## PHASE 4: Engineering Hardening (Parallel with Phase 2 and 3)

These run in parallel with the feature work. They do not require complete phases before starting.

### 4.1 Pagination on All List Queries (PERF-1)

**Audit ref:** PERF-1
**Problem:** 40 `findMany` calls in `src/lib` with only 3 using `take`. At 500 employees, the dashboard, employee list, and payroll history will be slow or unusable.

**Fix (L, spread over sprints):**

Priority order: employees list, payroll runs list, activity log, payslips list, leave requests list.

Pattern to use in all list actions:
```ts
// src/lib/employees/actions.ts
export async function getEmployeesAction(tenantId: string, cursor?: string, pageSize = 50) {
  const employees = await prisma.employee.findMany({
    where: { tenantId },
    take: pageSize + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  });
  const hasMore = employees.length > pageSize;
  return { employees: employees.slice(0, pageSize), nextCursor: hasMore ? employees[pageSize - 1].id : null };
}
```

UI: replace current "load everything" patterns with a `<LoadMore>` button or virtual scroll (`react-virtual` or `tanstack-virtual`).

Also cap the global store hydration in `app-provider.tsx`: only hydrate the first 50 records. Load more on demand.

**Done when:** The employee page for a 500-person tenant loads in under 2 seconds. Payroll run history shows only the last 12 months by default with a "load more" option.

### 4.2 Zod Input Validation on All Mutating Actions (CQ-2)

**Audit ref:** CQ-2
**Problem:** 1 of 32 server-action files uses zod. Ad hoc manual checks mean coverage is uneven, error messages are inconsistent, and no validation is reusable across the API surface that will eventually exist.

**Fix (L, spread over sprints):**

Create `src/lib/schemas/` with one schema file per domain:
- `src/lib/schemas/employee.ts`: zod schema for employee create/update
- `src/lib/schemas/leave.ts`: leave request, balance update
- `src/lib/schemas/payroll.ts`: payroll run create, settings update
- `src/lib/schemas/compliance.ts`: EMP201, IRP5 actions
- `src/lib/schemas/auth.ts`: signup, invite accept

Pattern:
```ts
// src/lib/schemas/employee.ts
import { z } from "zod";
import { saIdSchema, saPhoneSchema } from "./sa";

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  idNumber: saIdSchema.optional(),
  phone: saPhoneSchema.optional(),
  startDate: z.string().datetime(),
  departmentId: z.string().cuid(),
  // ...
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
```

In each action:
```ts
export async function createEmployeeAction(input: unknown) {
  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  // proceed
}
```

Priority: start with the 10 most-used mutating actions (create employee, run payroll, submit leave, invite user, update settings, create deduction, approve leave, complete payroll run, submit Netcash, update compliance record).

**Done when:** Every new action file written from today uses a zod schema. The top 10 existing actions are migrated. Running `grep -r "safeParse\|z.object" src/lib/` shows coverage across all major domain modules.

### 4.3 Error Monitoring and Silent Failure Elimination (CQ-3, DEVOPS-5)

**Audit ref:** CQ-3, DEVOPS-5
**Problem:** `best-effort` catch blocks swallow real failures (observed: EMP201 auto-generation throwing a TypeError silently during the test run). On payroll software, silent failures are the worst category of bug.

**Fix (S, 2 to 3 days):**

Step 1 - Fix the Sentry setup. Remove `sentry.client.config.ts` if `instrumentation-client.ts` exists (double-init risk). Follow the current `@sentry/nextjs` docs for Next.js 15 App Router. Verify `SENTRY_DSN` is set in Vercel production environment variables (check via `vercel env ls`).

Step 2 - Replace every `catch (e) { console.error(e) }` in best-effort paths with:
```ts
catch (e) {
  console.error("[context description]", e);
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(e, { extra: { context: "EMP201 auto-generation", runId } });
  }
}
```

Step 3 - The specific known failure (`TypeError: Cannot read properties of undefined (reading 'upsert')` in `src/lib/compliance/actions.ts:159`): investigate the `undefined` object. The EMP201 auto-generation path calls `upsert` on a potentially undefined result from an earlier query. Add a null check and early return with a Sentry capture before the upsert, not after.

Step 4 - In tests (TEST-4): replace tests that pass despite a stack trace being printed with assertions:
```ts
const consoleSpy = vi.spyOn(console, "error");
await generateEmp201ForPeriodAction(...);
expect(consoleSpy).not.toHaveBeenCalled();
```

**Done when:** Running the test suite shows zero stack traces in passing tests. Any unhandled exception in production appears in Sentry within 60 seconds with enough context to identify the cause.

### 4.4 Component Tests for Critical UI Flows (TEST-2)

**Audit ref:** TEST-2
**Problem:** 151 client components are untested. The four-step onboarding wizard, payroll approval flow, and payslip studio are complex stateful UIs with zero automated coverage.

**Fix (M, spread over sprints):**

Priority 1 - Onboarding wizard validation:
```ts
// src/components/onboarding/__tests__/wizard.test.tsx
it("blocks Step 2 progression when required fields are empty")
it("shows validation error for invalid SA ID number")
it("shows bank details step only when EFT payment method is selected")
it("submits successfully when all required fields are valid")
```

Priority 2 - Payroll approval banner:
```ts
it("shows approve/reject buttons only when run is AWAITING_APPROVAL")
it("calls approvePayrollRun when Approve is clicked")
it("requires approval note when Reject is clicked")
it("hides buttons after approval, shows approved badge")
```

Priority 3 - Leave request form:
```ts
it("blocks submission when end date is before start date")
it("shows working days count when dates are selected")
it("shows insufficient balance error when requesting more than available")
it("submits and shows pending status after successful request")
```

Use React Testing Library with `msw` for mocking server actions (or `vi.mock` for the action modules directly).

Enable coverage in `vitest.config.ts`:
```ts
coverage: {
  provider: "v8",
  reporter: ["text", "html"],
  include: ["src/lib/**", "src/components/**"],
  thresholds: { lines: 60 }, // start low, raise quarterly
}
```

**Done when:** `npm test -- --coverage` runs and shows 60%+ line coverage on `src/lib`. The three critical UI flows have component test coverage.

### 4.5 CSP Nonces and Session Management (SEC-4, SEC-5)

**Audit ref:** SEC-4, SEC-5
**Problem:** CSP allows `unsafe-inline` scripts. No configurable session lifetime, no device/session list, no admin-forced logout.

**Fix - CSP nonces (M, 1 to 2 days):**

In `src/middleware.ts`, generate a nonce per request:
```ts
const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
const cspHeader = `default-src 'self'; script-src 'self' 'nonce-${nonce}'; ...`;
const requestHeaders = new Headers(request.headers);
requestHeaders.set("x-nonce", nonce);
requestHeaders.set("Content-Security-Policy", cspHeader);
```

In `app/layout.tsx`, read the nonce and pass it to `<Script nonce={nonce}>`.

Remove `unsafe-inline` from the production CSP once all inline scripts are either eliminated or nonce-tagged.

**Fix - Session management (M, 1 to 2 days):**

Add to the Account Security page (`/account/security`):
- "Active sessions" list: pull from Supabase `listSessions()` if available; otherwise maintain a `UserSession` table (`id`, `userId`, `createdAt`, `lastSeenAt`, `userAgent`, `ipAddress`).
- "Sign out all other devices" button: calls `supabase.auth.signOut({ scope: "others" })`.
- Session duration policy: add `sessionTimeoutMinutes` to `TenantSettings`. In middleware, check `session.created_at` and force re-login if stale beyond the policy limit.

**Done when:** The CSP header on production contains no `unsafe-inline`. An HR admin can see active sessions and sign out all other devices from the account security page.

---

## PHASE 5: Roadmap (Future Versions)

These are not urgent and should not be started until Phases 0 to 3 are solid. Doing them early creates fragility and dilutes focus.

### 5.1 API and Webhook Layer (API-1)

**When to start:** After Phase 1 is complete and the first 5 paying customers are on-boarded.

Endpoint design:
```
GET  /api/v1/employees
POST /api/v1/employees
GET  /api/v1/employees/:id
GET  /api/v1/payroll/runs
GET  /api/v1/payroll/runs/:id/payslips
POST /api/v1/leave/requests
GET  /api/v1/compliance/emp201/:period
```

Webhooks: `payroll.completed`, `leave.approved`, `leave.rejected`, `employee.created`, `employee.terminated`.

Authentication: API keys stored hashed in `TenantApiKey` table. Each key has a scope array and a tenant binding. Rate-limited at the API key level (shared store, see 1.3).

Documentation: OpenAPI spec auto-generated from zod schemas (use `zod-to-openapi`). Host at `/api/docs`.

### 5.2 COIDA / Return of Earnings (COMP-4)

**When to start:** After April 2027 ROE season (next major deadline).

South Africa requires employers to submit a Return of Earnings (W.As.8 / ROE) to the Compensation Commissioner annually. Data needed: total earnings paid per earnings category (per DoL definitions). NovaHR has the payroll data; it needs:
- A `CoiDaCategory` enum mapping salary components to DoL earnings categories
- A `generateRoeReport` function aggregating annual totals per category per employee
- A UI panel on the Compliance page under a new "COIDA" tab with the ROE summary and a CSV export

### 5.3 Performance Reviews and Goal Tracking (PROD-6)

**When to start:** After the accountant channel is established and accountants validate that payroll is the reason they refer clients (not HR features).

Minimal first version:
- `Review` model: `employeeId`, `reviewerId`, `period`, `rating` (1 to 5), `comments`, `goals` (JSON array of `{ text, status }`), `completedAt`
- HR admin creates a review template; manager completes it for each direct report
- Employee can see their own completed reviews
- Link to salary history: HR admin can attach a salary change to a completed review

### 5.4 Recruitment and ATS (PROD-6)

**When to start:** After performance reviews are shipped and validated.

Minimal first version:
- Job posting (title, description, salary band, department, closing date)
- Candidate record (name, email, CV attachment, status: applied/shortlisted/interviewed/offered/hired/rejected)
- Convert a hired candidate into an employee (pre-fill onboarding wizard)
- Email templates for acknowledgement, shortlisting, rejection

Do not build a full career site or LinkedIn integration in v1. Focus on the internal workflow that saves the HR admin the most time.

### 5.5 Org Chart

**When to start:** After the Accountant Portal and Time modules are live.

Use `react-flow` or a simple D3-based tree to visualise the reporting structure. Data already exists (`Employee.managerId`, `Employee.department`). The org chart reads from current employment data; it does not need a new data model.

### 5.6 AI-Powered Payslip Explanation and Compliance Assistant (MKT-4)

**When to start:** After Phase 2 is complete and MFA, GL export, and mobile ESS are live. PaySpace already has an "AI Assist" feature that answers "why did my net pay change?"

First version (deterministic, no LLM):
- Employee clicks "Explain this payslip" on any payslip
- System compares the current payslip to the previous one
- Generates a structured explanation: "Your gross pay increased by R500 because your annual salary was updated on [date]. Your PAYE increased by R142 because your taxable income crossed into the next SARS bracket."
- No open-ended AI; just structured diffs against known data

Second version (LLM-grounded):
- Connect to Claude API via the Nova suite's NovaPilot integration
- Grounded on payslip data and SARS statutory rules only (no open-ended HR/legal advice)
- Compliance Q&A: "What is the EMP201 due date?" "How many days of annual leave am I entitled to under BCEA?"

Third version (Anomaly detection):
- Alert the HR admin when a payroll run shows an unusual PAYE spike or net pay drop for any employee above a configured threshold
- Suggest possible causes (salary change, tax code change, benefit deduction started)

### 5.7 Nova Business OS Integration (ARCH-5, MKT-4)

**When to start:** After NovaPOS, NovaFinance, and NovaHR each have 10+ paying customers and a stable API layer.

The value proposition: one owner sees labour costs in the context of revenue and expenses. A retail business running NovaPOS + NovaFinance + NovaHR can see:
- Payroll cost as a percentage of monthly revenue
- Labour cost per department vs department revenue
- Whether payroll is funded before the payment date (NovaFinance cash flow)

This is defensible and not copyable by any single-product competitor. Do not market it until the data flow actually works end-to-end.

---

## Combined Issue Register

This register reconciles all findings from the Enterprise Audit v3 and the competitor analysis. Status column reflects position as at 11 July 2026.

| ID | Source | Severity | Description | Phase | Status |
|---|---|---|---|---|---|
| AUD3-C1 | Audit v3 Phase 7 | Critical | Route collision broke prod deploys | 0 | RESOLVED (verified 11 Jul) |
| DISC-1 | Audit v3 Phase 0 | High | CI never gates main; main auto-deploys | 0 | OPEN |
| GH-1 | Audit v3 Phase 8 | High | Branch protection needs GitHub Pro | 0 | OPEN |
| DEVOPS-2 | Audit v3 Phase 7 | High | Zero deploy/uptime/error alerting | 0 | OPEN |
| DB-1 | Audit v3 Phase 5 | High | Restore never rehearsed; PITR unknown | 0 | OPEN |
| COMP-1 | Audit v3 Phase 12 | High | Statutory constants not verified vs official sources | 0 | OPEN |
| COMP-2 | Audit v3 Phase 12 | High | ToS acceptance not recorded (termsAcceptedAt missing) | 0 | OPEN |
| DISC-2 | Audit v3 Phase 0 | High | Dev and prod share one Supabase project | 1 | OPEN |
| DEVOPS-3 | Audit v3 Phase 7 | High | Previews hit prod DB (same as DISC-2) | 1 | OPEN |
| SEC-2 | Audit v3 Phase 3 + Competitor | High | No MFA; all direct competitors have it | 2 | OPEN |
| PROD-1 | Audit v3 Phase 13 + Competitor | High | No GL/accounting export; accountants blocked | 2 | OPEN |
| PROD-2 | Audit v3 Phase 13 | High | Billing not live; PayFast blocked on bank account | External | BLOCKED |
| MKT-1 | Audit v3 Phase 14 | High | Bank account / domain / Netcash creds gate GTM | External | BLOCKED |
| SEC-3 | Audit v3 Phase 3 | Medium | Rate limits per-instance; not effective at scale | 1 | OPEN |
| CQ-1 | Audit v3 Phase 2 | Medium | 7 ESLint errors on main | 0 | OPEN |
| ARCH-1 | Audit v3 Phase 1 | Medium | Route namespace collision risk is structural | 1 | OPEN |
| DISC-3 | Audit v3 Phase 0 | Medium | Same as CQ-1 | 0 | OPEN |
| PROD-4 | Audit v3 Phase 13 + Competitor | Medium | No mobile ESS / PWA | 2 | OPEN |
| PROD-5 | Audit v3 Phase 13 + Competitor | Medium | No compliance deadline reminders | 2 | OPEN |
| PERF-1 | Audit v3 Phase 6 | High (at scale) | Unpaginated tenant-wide queries | 4 | OPEN |
| CQ-2 | Audit v3 Phase 2 | Medium | zod in 1 of 32 action files | 4 | OPEN |
| CQ-3 | Audit v3 Phase 2 | Medium | Best-effort catches hide real failures | 4 | OPEN |
| SEC-4 | Audit v3 Phase 3 | Medium | CSP unsafe-inline without nonces | 4 | OPEN |
| SEC-5 | Audit v3 Phase 3 | Medium | No session management controls | 4 | OPEN |
| PROD-3 | Audit v3 Phase 13 + Competitor | Medium | No time and attendance | 3 | OPEN |
| TEST-1 | Audit v3 Phase 9 | Medium | No coverage measurement | 4 | OPEN |
| TEST-2 | Audit v3 Phase 9 | Medium | Zero component tests | 4 | OPEN |
| GH-2 | Audit v3 Phase 8 | Medium | No Dependabot | 1 | OPEN |
| GH-3 | Audit v3 Phase 8 | Medium | No release management | 1 | OPEN |
| DOC-2 | Audit v3 Phase 10 | Medium | No ADRs | Ongoing | OPEN |
| DOC-3 | Audit v3 Phase 10 | Medium | No ops runbook | 1 | OPEN |
| COMP-3 | Audit v3 Phase 12 | Medium | Retention unenforced (policy only) | 4 | OPEN |
| COMP-4 | Audit v3 Phase 12 | Medium | No COIDA/ROE support | 5 | ROADMAP |
| COMP-5 | Audit v3 Phase 12 | Medium | Legal docs pending attorney review | External | BLOCKED |
| MKT-2 | Audit v3 Phase 14 | Medium | No published pricing page | 1 | OPEN |
| MKT-3 | Audit v3 Phase 14 + Competitor | Medium | No accountant/bureau console | 3 | ROADMAP |
| DB-2 | Audit v3 Phase 5 | Medium | Partial unique index invisible to Prisma | 1 | OPEN |
| UX-1 | Audit v3 Phase 11 | Medium | No accessibility audit | 4 | OPEN |
| SEC-1 | Audit v3 Phase 3 | Medium | /account outside middleware protection | 1 | OPEN |
| TEST-3 | Audit v3 Phase 9 | Medium | E2E not in CI (blocked on staging) | 1 | OPEN |
| DEVOPS-4 | Audit v3 Phase 7 | Medium | Rollback runbook missing | 1 | OPEN |
| DEVOPS-5 | Audit v3 Phase 7 | Medium | Sentry double-init risk; DSN unverified | 0 | OPEN |
| API-1 | Audit v3 Phase 4 + Competitor | High (strategic) | No public API or webhooks | 5 | ROADMAP |
| UX-4 | Audit v3 Phase 11 | Enhancement | Notification prefs in localStorage | 3 | OPEN |
| SEC-6 | Audit v3 Phase 3 | Low | No key-rotation procedure for NETCASH_ENCRYPTION_KEY | 4 | OPEN |
| DB-3 | Audit v3 Phase 5 | Medium | PayrollItem completeness not guaranteed | 4 | OPEN |
| MKT-4 | Audit v3 Phase 14 + Competitor | Enhancement | AI differentiation unclaimed | 5 | ROADMAP |
| PROD-6 | Audit v3 Phase 13 + Competitor | Low | No org chart/performance/ATS | 5 | ROADMAP |

**Competitor-only gaps (not in audit, added from competitor analysis):**

| ID | Severity | Description | Phase |
|---|---|---|---|
| COMP-MIGRATION | High | No formal migration kit from SimplePay/Sage/Excel | 2 |
| COMP-ACCOUNTANT | High | No accountant partner workspace | 3 |
| COMP-COIDA | Medium | No COIDA/ROE (audit COMP-4 agrees) | 5 |
| COMP-TIMESHEETS | Medium | No timesheet/hours input feeding payroll (audit PROD-3 agrees) | 3 |
| COMP-PAYSLIP-AI | Enhancement | No payslip explanation or compliance AI assistant | 5 |
| COMP-NOVA-SUITE | Enhancement | No live cross-product data flow between NovaHR/NovaFinance/NovaPOS | 5 |

---

## Ops Runbook Template (Start Here for DOC-3)

Create `docs/ops/RUNBOOK.md` with the following structure:

### Deploy procedure
1. Create a PR from a feature branch. CI must pass (lint + tsc + vitest).
2. Merge to main. Vercel auto-deploys within 2 minutes.
3. Verify the production deploy is READY: `vercel ls` or Vercel dashboard.
4. Click through one representative flow in production (login, leave request, or payslip view).
5. If READY but a regression is found: use Vercel instant rollback (Dashboard > Deployments > previous READY > Promote to Production).

### Rollback procedure
1. Open Vercel dashboard > novahr project > Deployments.
2. Find the last known-good deployment (READY status).
3. Click the three-dot menu > Promote to Production.
4. Verify the health endpoint returns 200: `curl https://novahr-five.vercel.app/api/health`.
5. If the rollback involved a DB migration: do NOT run a down migration. Instead, deploy a forward migration that reverses the change (expand/contract pattern). Write the new migration using the shadow DB procedure.

### Database restore procedure (to be completed after DB-1 rehearsal)
1. Identify the point-in-time to restore to (Supabase PITR window, currently [unknown - verify plan]).
2. Spin up a new Supabase project as the restore target.
3. Use `pg_restore` with the backup: `pg_restore -h [host] -U postgres -d postgres -F c [backup-file]`.
4. Verify: count employees, run a spot-check on the most recent payroll run's PAYE figure.
5. If the restore is for disaster recovery: update Vercel env vars to point at the restored project. Test a login. Promote.
6. Record the incident in `docs/ops/INCIDENT_LOG.md`.

### Incident response
- P0 (payroll data exposed or corrupted): Immediately disable the Netcash integration (set `NETCASH_DISABLED=true` env var). Notify affected tenants by phone within 1 hour. Do not send email before legal review.
- P1 (production down): rollback per above. Alert all tenant admins via email if downtime exceeds 30 minutes.
- P2 (feature broken, payroll unaffected): deploy a fix. No customer notification required unless the broken feature was their only reason for logging in that day.

---

## The Positioning Statement to Win With

Category: South African HR and payroll workspace for growing teams.

Win on: compliance completeness, flat pricing, unified workflow, and the accountant referral channel.

Lose gracefully to: PaySpace for multi-entity and enterprise. Deel for cross-border employment. Workday/SAP for 250+ employee enterprises.

The short pitch that will close 80% of deals in the target segment:

> "NovaHR runs compliant South African payroll, manages leave, and keeps all your people records in one place. It generates your EMP201, prepares your IRP5s, and pays staff through Netcash. For R999 a month you run a compliant payroll for up to 30 people without hiring a payroll specialist or paying an accountant to do it for you."

---

*This document is a living plan. Update it when issues are resolved, when new competitor information arrives, or when the product roadmap shifts. Do not edit the audit-referenced findings in ENTERPRISE_AUDIT_V3.md; update their status here and in the Combined Issue Register above.*
