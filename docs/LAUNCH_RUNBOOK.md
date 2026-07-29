# NovaHR Launch Runbook

The definitive step-by-step to finalise domains, billing, and security and reach launch-ready. Legend: **[YOU]** = dashboard action you do, **[ME]** = code change Claude does on request.

Canonical production:
- Vercel: `novahr` project under the **Nova Business OS** team.
- Domain: `novabos.co.za` (landing) + `hr.novabos.co.za` (app), same deployment.
- Supabase: project `epmsbbcedbhtiwwtiyts` (eu-west-1).
- Repo: `github.com/nova-bos/novahr`, auto-deploys `main`.

Already done: billing engine live, production DB has billing columns + `subscribed`/`enterprise` enum, code fallbacks point at `hr.novabos.co.za`.

---

## Phase 1 — Domains

### Step 1 [YOU] Add the DNS record (Hostinger)
Where: Hostinger → Domains → novabos.co.za → DNS / Name Servers.
Do: add a record
```
Type: CNAME   Name: hr   Target: cname.vercel-dns.com   TTL: default
```
Leave the existing `@` and `www` records (they keep the landing page live at the root).

### Step 2 [YOU] Attach the subdomain (Vercel)
Where: Vercel → Nova Business OS → novahr → Settings → Domains.
Do: Add `hr.novabos.co.za`. Wait for "Valid Configuration" and SSL. Do NOT remove `novabos.co.za` or `www` (root must keep serving the landing).
Verify: the domain shows a green check.

### Step 3 [ME] Point landing CTAs at the app subdomain
Claude updates the landing "Login / Get started / Start free trial" buttons to link to `https://hr.novabos.co.za/login` and `/signup`, so auth happens on the app subdomain. Pushed to main, auto-deploys.

### Step 4 [YOU] Set the app URL env var (Vercel)
Where: Vercel → novahr → Settings → Environment Variables → Production.
Do: set `NEXT_PUBLIC_APP_URL = https://hr.novabos.co.za`. Redeploy (Deployments → latest → Redeploy) so it takes effect.
Verify: open `https://hr.novabos.co.za/login`, it loads with a valid padlock.

---

## Phase 2 — Billing

### Step 5 [YOU] Add the billing env vars (Vercel)
Where: Vercel → novahr → Settings → Environment Variables → Production.
Do: add
```
PAYSTACK_SECRET_KEY            = sk_...        (start with test key sk_test_)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = pk_...       (matching test key pk_test_)
CRON_SECRET                    = <openssl rand -hex 32>
```
Redeploy after adding.
Verify: `curl -s -o /dev/null -w "%{http_code}" -X POST https://hr.novabos.co.za/api/cron/billing` returns 401.

### Step 6 [YOU] Update Supabase auth URLs
Where: Supabase → project epmsbbcedbhtiwwtiyts → Authentication → URL Configuration.
Do:
- Site URL: `https://hr.novabos.co.za`
- Redirect URLs: add `https://hr.novabos.co.za/**`
This is what makes Google sign-in and password-reset / invite email links work on the new domain. Google Cloud OAuth config does not change (it redirects to Supabase, not the app).
Verify: sign in with Google on `hr.novabos.co.za/login` and land on the dashboard.

### Step 7 [YOU] Update the Paystack webhook
Where: Paystack dashboard → Settings → API Keys & Webhooks.
Do: set Webhook URL to `https://hr.novabos.co.za/api/webhooks/paystack`. Keys stay as they are.

### Step 8 [YOU] Test a subscription (test mode)
Where: `https://hr.novabos.co.za/billing` while logged in as an HR user.
Do: click Subscribe now, pay with Paystack test card `4084 0840 8408 4081`, CVV `408`, any future expiry.
Verify: you return to `/billing?success=1`, the page shows the live R349 + members x R30 breakdown, and the tenant row in Supabase has `paystackAuthCode` and `currentPeriodEnd` populated.

### Step 9 [YOU] Test the renewal cron
Where: your terminal.
Do: `curl -X POST https://hr.novabos.co.za/api/cron/billing -H "Authorization: Bearer <your CRON_SECRET>"`
Verify: JSON response lists the tenant as `charged` (or `past_due` if you test a failing card). Confirm `currentPeriodEnd` advanced by a month in Supabase.

### Step 10 [YOU] Go live on Paystack
When testing passes: swap the Vercel env `PAYSTACK_SECRET_KEY` and public key to the live `sk_live_` / `pk_live_` values, redeploy, and do one real low-value subscription to confirm.

---

## Phase 3 — Security hardening

### Step 11 [ME] Server-side paywall enforcement (audit C2)
Claude adds a `requireActiveAccess` guard on the money-making actions (complete payroll run, bank export, add employee) so an expired-trial or cancelled tenant cannot use them by calling the server action directly. Includes a grace window for `past_due`. Ships with tests.

### Step 12 [ME] Route-level error boundary (audit M2)
Claude adds `src/app/(app)/error.tsx` so a crash in one page does not blank the whole app shell.

### Step 13 Tenant isolation backstop (audit C3, the big one)
Today isolation is app-layer only because the DB role has BYPASSRLS. Two options:
- [ME] now: add a CI test that fails if any tenant-scoped Prisma query is missing a `tenantId` filter (cheap safety net).
- [YOU + ME] fast-follow: move the app's Supabase connection to a non-BYPASSRLS role so the row-level security policies actually enforce. This is the real fix and should happen within the first week.

### Step 14 [YOU] Keys and monitoring
- Rotate any key that has ever been pasted into chat or shared (Netcash service key, Paystack). Where: each provider's dashboard, then update the Vercel env var.
- Add `SENTRY_AUTH_TOKEN` in Vercel so production errors get readable stack traces.

---

## Phase 4 — Final pre-launch checks

### Step 15 [YOU] Smoke test the full journey on hr.novabos.co.za
Sign up a fresh company, complete onboarding, add an employee, run a payroll, confirm the payslip email arrives, submit and approve a leave request, then subscribe. Everything on the new domain.

### Step 16 [YOU] Confirm support and legal
Send a test to `support@novabos.co.za` and confirm it is received. Open `/terms`, `/privacy`, `/legal/subscription-terms` on the live domain and confirm the per-member pricing shows.

### Step 17 [YOU] Retire the personal project
Delete the `novahr` project from your personal Vercel team. Do NOT delete the GitHub repo (Nova deploys from it).

### Step 18 [YOU] First customer
Onboard your first real tenant (or a friendly pilot) and watch the first live renewal cron run.

---

## Launch gate (minimum to take real money safely)
Phase 1 complete, Phase 2 steps 5 to 9 verified in test mode, Step 11 (server-side paywall) shipped, and Step 13 decided (CI guard at minimum). Steps 10 and 18 flip you live.
