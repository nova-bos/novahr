# NovaHR: Action Plan: Zero to First Paying Client

**Goal:** Turn the current NovaHR demo into a real product and land one paying SME client within 4 weeks (target: week of 11 July 2026).

**The idea (locked):** NovaHR: HR & payroll SaaS for South African SMEs (5-50 employees). Everything else (POS, consulting) is phase 2, once this has a paying customer.

---

## 1. Where we are right now

The demo at `novahr-five.vercel.app` already proves the product concept:

- Role-based dashboards (Employee / Manager / HR / Exco) ✅
- Employee directory, onboarding flow ✅
- Leave management with live balance previews ✅
- Payroll engine + payslips ✅
- Reports ✅
- Multi-tenant company switching ✅

**What's missing before anyone can actually use it as their company's system:**

- All data is hardcoded demo data held in memory, nothing persists, refreshing the page resets it
- "Login" is 4 fake demo accounts, not real accounts for a real company
- No way for a new company to sign up and create their own tenant
- No public landing page (the site goes straight to a login screen)
- No pricing, no legal docs, no domain
- No way to take payment

That's the gap this plan closes.

---

## 2. Tech decisions (optimised for R0 spend)

| Need | Choice | Cost |
|---|---|---|
| Hosting | Vercel (already deployed) | **R0** on Hobby tier for the MVP |
| Database | Supabase (Postgres, free tier, 500MB, plenty for one tenant + pilots) | **R0** |
| ORM | Prisma against the Supabase Postgres connection string (consistent with AquaWash) | **R0** |
| Auth | Supabase Auth (email/password), replaces the demo-user localStorage hack | **R0** |
| Transactional email (invites, password reset) | Supabase's built-in auth email, or Resend free tier (3,000/mo) if needed later | **R0** |
| Payslip PDFs | Browser print stylesheet on the existing payslip dialog (no new library) | **R0** |
| Legal docs (ToS / Privacy / POPIA notice) | Free template (e.g. Termly generator), reviewed and edited by Tony | **R0** |
| Payments (first client) | Manual invoice + EFT, no gateway integration yet | **R0** |
| Domain | `.co.za` or `.com` via any registrar | **~R150-250/year (~R20/month)** |

**Total cost to first client: ~R200 once-off. ~R0/month recurring** until you need to upgrade Vercel/Supabase tiers for scale (not needed for one pilot client).

---

## 3. Week-by-week plan

### Week 1 (13 to 20 June): Real data, real accounts

**Owner: Wandile**

1. Create a free Supabase project. Grab the Postgres connection string and the anon/service keys, add to Vercel env vars.
2. Add Prisma to the project. Design the schema mapped from the existing TypeScript types in `src/lib/types.ts`:
   - `Tenant` (company)
   - `User` (linked to Supabase Auth user id, has `tenantId` + `role`)
   - `Employee`, `LeaveRequest`, `LeaveBalance`, `PayrollRun`, `Payslip`, `ActivityItem`, `Notification`
3. Run `prisma migrate` to create tables in Supabase.
4. Replace `src/lib/auth/auth-provider.tsx` (demo-user/localStorage) with Supabase Auth: real email/password signup + login, session stored in cookies.
5. Build a **"Create your company"** signup flow:
   - New user signs up → creates a `Tenant` row → creates a `User` row with role `hr` (first user is always HR admin) → seeds default leave types/balances for that tenant.
   - This replaces the current 3-hardcoded-tenant switcher for new signups (keep the switcher for your own demo tenants if useful).

**Owner: Tony / Dumo (in parallel, no dependency on the above)**

- Resume the Phase 1 outreach: confirm 5-10 SME contacts who'd be willing to look at a demo. This list is needed for Week 4, start now so it's ready.

**End of week 1 checkpoint:** a brand-new user can sign up, get their own empty company, and log in to a (mostly empty) dashboard backed by a real database.

---

### Week 2 (20 to 27 June): Make the core features real

**Owner: Wandile**

1. Replace the in-memory reducer in `src/lib/store/app-provider.tsx` with real reads/writes against the database (via server actions or API routes):
   - Add/edit employee → persists
   - Submit leave request → persists; manager/HR approval → persists
   - Run payroll → generates and persists payslips
2. Add payslip PDF export: a `@media print` stylesheet on the existing payslip dialog, triggered by a "Download payslip" button that calls `window.print()`. Zero new dependencies.
3. On employee creation, auto-seed `LeaveBalance` rows using `DEFAULT_LEAVE_TOTALS`.

**Owner: Tony**

1. Audit `src/lib/payroll-calc.ts` against the current SARS PAYE tax tables, UIF (1%, capped), and SDL rules.
2. Audit leave entitlements against BCEA minimums (21 days annual leave accrual, sick leave cycle, 3 days family responsibility leave).
3. Hand corrections to Wandile as a simple list, this is the single most important accuracy pass in the whole plan. A wrong payslip on day one kills trust with the first client permanently.

**End of week 2 checkpoint:** a real company can add real employees, run a real payroll, and get a payslip that's numerically correct under SA law.

---

### Week 3 (27 June to 4 July): Make it sellable

**Owner: Wandile**

1. Build a public landing page at `/` (currently this likely redirects straight to login):
   - Hero section + one-line pitch ("Modern HR & payroll for growing SA businesses")
   - Reuse the feature list already written for the login page (`FEATURES` in `src/app/login/page.tsx`) as the feature highlights section
   - Pricing section (see below)
   - "Get started" CTA → signup flow built in Week 1
2. Add a simple pricing page with two tiers:
   - **Starter: R499/month**, up to 10 employees
   - **Growth: R999/month**, up to 30 employees
   - (These are starting numbers to get a first deal done, revisit after pilot feedback, don't over-think pricing before you have one customer.)
3. Buy a domain (~R200/year) and connect it to the Vercel project.

**Owner: Tony**

1. Generate a Terms of Service + Privacy Policy from a free template, then edit for:
   - POPIA-compliant data handling language (you're holding employee ID numbers, bank details, salaries)
   - A simple liability/disclaimer clause appropriate for a v1 product
2. Draft a one-page service agreement / order form for the first client (company details, tier, monthly fee, start date, payment terms: EFT, 7 days).

**Owner: Dumo**

1. Start booking demo calls with the contacts confirmed in Week 1, using the live (now-real) product as the demo. Aim for 2-3 booked for Week 4.

**End of week 3 checkpoint:** a stranger can land on the homepage, understand the product, see pricing, and sign up, and you have the legal paperwork ready for a real client.

---

### Week 4 (4 to 11 July): Land the first client

**Owner: All**

1. Run the booked demos. Pick the most ready prospect.
2. Onboard them as a real tenant: HR admin signs up, Wandile/Tony help them add their actual employee list and set up their first payroll run (white-glove, don't expect a brand-new client to self-serve on day one).
3. Run their first real payroll, generate real payslips.
4. Tony issues the service agreement + first invoice (EFT, due in 7 days).
5. Fix any bugs that surface during this first real use, this is your highest-signal QA pass.

**Definition of "sold":** signed service agreement + first invoice issued for a real company using NovaHR with their real employees and real payroll.

---

## 4. Guardrails

- **Don't build phase 2 (POS, consulting tier) until this client is paying and using the product without daily hand-holding.**
- **Don't add a payment gateway (PayFast/Yoco) until client 2**, manual EFT is fine for one client and saves a week of integration work.
- **Don't change pricing publicly until after the first client's first month**, get real usage data first.
- If Week 1-2 (the database/auth migration) overruns, **protect Week 4**, a late landing page is recoverable, a missed first demo is not.

---

## 5. Cost summary

| When | Cost |
|---|---|
| One-off (domain) | ~R200 |
| Monthly, weeks 1-4 | R0 |
| Monthly, after first paying client (R499+/mo revenue) | Still R0 infra cost: Supabase/Vercel free tiers comfortably cover one tenant |

First client's monthly fee (R499) covers the domain cost for the next two years on its own. Everything else is sweat equity.
