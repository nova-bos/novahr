# NovaHR Pre-Launch Audit v4

Audit date: 2026-07-29.
Auditor lens: senior software engineer, QA lead, and product designer, reviewing against the standard of a payroll product that pays real people real money in South Africa.
Supersedes: ENTERPRISE_AUDIT_V3.md and UI_UX_OVERHAUL_AUDIT.md (both deleted).
Method: direct code and git inspection of the `main` branch as deployed to novahr-five.vercel.app. Every finding cites evidence.

---

## Verdict

**Do not launch to paying customers yet. You are close on the product, but the money path is broken and unenforced.**

The application itself (payroll engine, leave, compliance, tenant isolation, code hygiene) is genuinely strong and ahead of most SA startups at this stage. But the thing a paid launch depends on, taking money and gating access to people who pay, is either not deployed, not built server-side, or both. Two of the three critical blockers below are billing related, and one of them is a case where the work was reported as shipped but never reached production.

**Readiness score: 6.5 / 10 for a paid launch.** The same codebase scores roughly 8.5 / 10 as a product. The gap is entirely commercialisation and revenue enforcement.

---

## The headline problem: the billing engine you approved is not live

This is the single most important finding, and I need to be straight with you because I previously told you it was deployed. It is not.

**Evidence:**
- The "Paystack charge-auth billing engine" (subscribe flow, `chargeAuthorization`, the monthly cron, the auth-code storage on the callback) exists only on the orphaned branch `worktree-agent-aead062846e257349` at commit `5d577e8`. Run `git log --oneline origin/main` and it is not there. The tip of `main` is `15de925` (the FAQ update).
- `src/app/api/cron/billing/route.ts` **does not exist** on main.
- `src/lib/billing/actions.ts` on main has only `createPortalSession`. There is no `createSubscription`.
- The billing page on main still renders the disabled "Billing activation coming soon" button. A trial user physically cannot subscribe.
- `prisma/schema.prisma` on main has no `paystackAuthCode`, `paystackBillingEmail`, `billingMemberCount`, or `billingAmountKobo` columns. The migration never landed.
- There is **no `vercel.json` on main**, so even if the cron route existed, no cron is registered and it would never fire.

**What happened:** the sub-agent worked in a git worktree, committed to its own worktree branch, and its `vercel --prod` deployed that worktree as a one-off preview. The commit was never merged into `main`. My follow-up deploy from `main` (for the FAQ) then became the live production build, without the billing engine. I reported the agent's success message to you at face value. That was my error. The net effect: **you currently have no way to charge anyone.**

This is recoverable in well under a day (the code is written and sitting in the worktree), but it must be merged to main, the migration applied to the production database, `vercel.json` added, `CRON_SECRET` set, and the full flow tested with a live-mode card before you can take a cent.

---

## CRITICAL BLOCKERS (must fix before any paying customer)

### C1. Billing engine not on main and not deployed
**Severity: Critical. Effort: S (code exists, needs integration and testing).**
As above. Merge `5d577e8` into main, apply the migration to the production DB, add `vercel.json` with the cron, set `CRON_SECRET`, and end-to-end test the subscribe and renewal charge in Paystack live mode. Until this is done, NovaHR cannot collect revenue.

### C2. No server-side enforcement of trial expiry or subscription status
**Severity: Critical (revenue). Effort: M. Evidence: `src/components/layout/trial-gate.tsx` is a client component; grep of `src/lib/**/actions.ts` shows no mutating action checks `trialExpired`, `subscriptionStatus`, or `plan`.**
The trial lock screen is cosmetic. `TrialGate` runs in the browser. An expired-trial or past-due user can still run payroll, add employees, and export bank files by invoking the server actions directly, because none of those actions check subscription state. This means that even after C1 is fixed, a customer who cancels or whose card fails keeps full access. For a paid product this is the difference between a subscription and a donation. Add a server-side guard (for example in `requireRole` or a dedicated `requireActiveSubscription`) on the money-making and data-mutating actions, with a grace period for `past_due`.

### C3. Tenant isolation has no database backstop (BYPASSRLS)
**Severity: Critical (data exposure). Effort: M to L. Evidence: `src/lib/db-context.ts` comments confirm the runtime DB role carries `BYPASSRLS`; RLS policies exist but do not enforce. `runAsTenant` sets `app.tenant_id` but it is advisory only.**
Cross-tenant isolation is enforced entirely in application code via `where: { tenantId }` clauses. The discipline is good and consistent in the files I sampled, but there is zero defence in depth: a single query anywhere that forgets the tenant filter leaks one company's employees, salaries, or ID numbers to another. In an HR and payroll product holding SA ID numbers and bank details, one such leak is a POPIA-reportable breach and a business-ending event. This is a known, documented architectural choice, but it is the biggest latent risk in the system. Before or very soon after launch, move the app to a non-BYPASSRLS role so the RLS policies actually enforce, turning every missing filter from a breach into a harmless empty result. If that cannot happen pre-launch, at minimum add an automated test that fails CI if any Prisma query on a tenant-scoped model lacks a tenantId filter.

---

## MEDIUM MUST-HAVES (fix before you market hard)

### M1. Callback and webhook still assume the old subscription-plan model
**Severity: High. Evidence: `src/app/api/billing/paystack/callback/route.ts` and `src/app/api/webhooks/paystack/route.ts` both key off `paystackSubscriptionCode` and Paystack plan codes.**
Once C1 lands, these two files will be the source of subtle bugs, because the new per-member model does not use Paystack subscription plans at all. The webhook's `charge.success` branch requires `data.plan.plan_code` and will silently ignore your `chargeAuthorization` renewals. Reconcile both files with the card-auth model as part of C1, or you will have charges succeeding at Paystack while your database never records them.

### M2. No route-level error boundary
**Severity: Medium. Evidence: `src/app/global-error.tsx` and `not-found.tsx` exist, but there is no `src/app/(app)/error.tsx`.**
A thrown error in any app page currently escalates to the global error screen and blanks the whole shell. Add a scoped `error.tsx` in the `(app)` segment so a failure in, say, the reports page does not nuke the navigation and leave a customer staring at a full-page crash mid-payroll.

### M3. `NEXT_PUBLIC_APP_URL` fallback points at the wrong domain
**Severity: Medium. Evidence: `src/app/api/billing/paystack/callback/route.ts:10` falls back to `https://novabos.co.za` when the env var is unset.**
If that env var is ever missing in production, successful payments redirect the customer to a domain that is not the live app (`novahr-five.vercel.app`). Confirm `NEXT_PUBLIC_APP_URL` is set in Vercel production and change the fallback to the real app URL so a misconfiguration degrades gracefully instead of dumping paying customers on the wrong site.

### M4. Legal and marketing copy audited but verify the deployed FAQ
**Severity: Medium (resolved, verify). Evidence: `faq-section.tsx` and `subscription-terms/page.tsx` were updated to the per-member model in `15de925` and pushed.**
This was the item you caught earlier. The commit is now on origin. Confirm the live site shows "R349 per month plus R30 per active member" in the FAQ and the subscription-terms table, since the earlier deploy did not include it until the push.

### M5. Past-due handling has no recovery loop
**Severity: Medium. Evidence: the cron (in the worktree) sets `subscriptionStatus = "past_due"` on a failed charge but nothing retries, emails the customer, or escalates.**
A failed card should not be a silent dead end. When C1 lands, add a retry schedule and a "your payment failed" email so a customer with an expired card does not simply lose service without warning.

---

## LOW PRIORITY (nice to have, post-launch)

### L1. Em dashes in code comments and test names
**Severity: Low. Evidence: 5 files contain em dashes (`payslip-studio.tsx`, `format.ts`, `workspace/actions.ts`, `run-reversal.ts`, `eti.test.ts`), all in comments or `describe` strings, none customer-facing.**
Violates the house writing rule but invisible to users. Clean up when convenient.

### L2. Three `any` casts and one TODO
**Severity: Low. Evidence: grep shows 3 `as any` / `: any` and 1 TODO in non-test source.**
Genuinely excellent for a codebase this size. Tighten the `any` casts when you next touch those files. Code hygiene is otherwise clean: zero stray `console.log` in production code.

### L3. Two stale worktree branches
**Severity: Low. Evidence: `git worktree list` shows `agent-a855c2d50884f7fb8` and `agent-aead062846e257349` still checked out.**
Once C1 is merged, prune both worktrees and delete the branches so the billing engine does not live in two places and drift.

### L4. Sentry has no auth token
**Severity: Low. Evidence: every production build logs "No auth token provided. Will not upload source maps."**
Sentry is wired but stack traces will be unmapped and hard to read. Add `SENTRY_AUTH_TOKEN` in Vercel so production errors are legible.

---

## What is genuinely strong (so you know where the floor is)

- **Payroll engine and test coverage.** 42 test files including dedicated PAYE, UIF, SDL, ETI, and reversal suites. This is the hardest part of an HR product and it is the most disciplined part of this codebase.
- **Auth and authorization design.** `requireUser`, `requireRole`, `requireTenant`, and `requireEmployeeScope` are a clean, well-documented authorization layer. Client tenantIds are never trusted. Rate limiting exists and is applied to signup, login, invites, and the contact form.
- **Tenant scoping discipline.** Every server action I sampled wraps work in `runAsTenant` and filters by `tenantId`. The pattern is consistent. The only weakness is the missing DB backstop (C3), not the application logic.
- **Code hygiene.** Zero production `console.log`, one TODO, three `any` casts across 380 source files. That is top-decile for a solo-built product.
- **Compliance surface.** EMP201, EMP501, IRP5/IT3(a), Netcash integration, POPIA-aware legal pages, and a genuine 14-day trial with a lock screen. The breadth here is well beyond MVP.

---

## Launch gate: the minimum to take money safely

1. Merge `5d577e8` to main, apply the migration to the production database, add `vercel.json` with the billing cron, set `CRON_SECRET` and confirm `NEXT_PUBLIC_APP_URL`. (C1, M3)
2. Reconcile the callback and webhook with the card-auth model. (M1)
3. Add server-side subscription enforcement to payroll, employee, and export actions. (C2)
4. End-to-end test: subscribe with a live-mode card, confirm the DB records the auth code and period end, manually fire the cron, confirm a renewal charge and a `past_due` path. (C1, M5)
5. Decide on C3: either move off the BYPASSRLS role now, or ship a CI test that blocks any unfiltered tenant query and schedule the role change for week one.

Items 1 to 4 are roughly one to two focused days given the code already exists. Item 5 is the judgement call that separates "launched" from "launched responsibly with people's salary data."
