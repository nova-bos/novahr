# NovaHR

NovaHR is a multi-tenant HR and payroll SaaS built specifically for South African small and medium businesses. Each company gets an isolated workspace where HR admins, managers, employees, and executives manage the full employment lifecycle: onboarding, leave, statutory payroll, compliance reporting, and pay delivery via Netcash. It is live in production at https://novahr-five.vercel.app and is part of the Nova Business OS suite alongside NovaPOS, NovaFinance, and NovaPilot.

---

## Features

### Employee management
- Employee directory with search, filters, and status badges (active, on leave, probation, terminated)
- Four-step onboarding wizard with SA-aware validation (ID number Luhn check, phone, bank account)
- Rich profiles: personal details, job info, compensation, bank details, tax and SA ID numbers, emergency contacts, equity data (race and gender for EEA2/EEA4), onboarding checklist, and payslip history
- Auto-generated employee numbers (configurable format per company)
- Salary history tracking
- Profile photo upload
- Document vault: per-employee file storage with signed URLs

### Leave management
- All nine South African leave types with legally correct BCEA entitlements (annual, sick, family responsibility, maternity, parental, adoption, commissioning parental, study, unpaid)
- Working-day counting: weekends and SA public holidays excluded automatically (2026-2028 calendar built in, including Sunday observance rule)
- Leave calendar view
- Request flow with supporting document upload (medical certificate, etc.)
- Approval workflow: HR decides any request; managers decide their direct reports' requests only
- Email notifications to HR, managers, and employees at each stage
- Live balance display per employee

### Payroll
- Monthly payroll runs (biweekly and weekly capable)
- SARS 2026/27 compliant tax calculations:
  - All seven PAYE brackets (18% to 45%)
  - Age-based rebates (primary R17,820, secondary R9,765, tertiary R3,249) derived from SA ID number
  - Medical aid tax credits (s6A): R376 main member, R376 first dependant, R254 each additional
  - Retirement contribution deduction (s11F): lesser of 27.5% of remuneration or R430,000/year
  - Travel allowance: 80% taxable inclusion (20% with logbook)
  - UIF: 1% employee + 1% employer, capped at R177.12/month
  - SDL: 1% employer levy gated on R500,000 annual payroll threshold
  - Unpaid leave reduces pay pro rata
- Payslips: four templates (classic, modern, corporate, branded), PDF download, and email delivery
- Bank payment export: standard EFT CSV and Netcash NIF batch file
- Approval workflow: optional maker-checker before payslip emails are sent
- Loans and garnishees: post-tax deductions with 25% of gross garnishee cap
- ETI (Employment Tax Incentive): 24-month ledger with carry-forward

### SA Compliance
- EMP201: PAYE/UIF/SDL return records per period with statutory due dates and submission tracking
- IRP5/IT3(a) and EMP501 reconciliation
- Employment Equity Report (EEA2/EEA4) driven by employee equity data
- UIF declaration

### POPIA compliance
- Data export (JSON) per employee
- PII erasure with audit trail

### Security
- CSP headers, HSTS, rate limiting on public and sensitive surfaces
- Cross-tenant isolation enforced in application code with explicit tenantId predicates on every query
- Sentry error monitoring

### Billing
- 14-day full-feature trial
- Three pricing tiers displayed in-app (Starter R499/month, Growth R999, Scale R2,499)
- Manual EFT billing; plan changes applied by operator

### Team and settings
- Four roles: HR Admin, Manager, Employee, Executive (read-only)
- Email invitations with single-use SHA-256-hashed tokens; copy-link fallback when email is unconfigured
- Department management, payroll configuration, payslip branding, statutory reference numbers, Netcash service key

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router, React 19, TypeScript strict) |
| Auth + database | Supabase (Auth + Postgres) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Styling | Tailwind CSS v4 + shadcn/ui |
| PDF | `@react-pdf/renderer` (server-side, dynamically imported) |
| Email | Resend |
| Error monitoring | Sentry (`@sentry/nextjs` v10) |
| Tests | Vitest (254 tests across 27 files) |
| Hosting | Vercel |

---

## Local development setup

### 1. Clone and install

```bash
git clone https://github.com/Wandile-Mtshwene/novahr.git
cd novahr
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with values from your Supabase project. See the environment variables section below.

### 3. Apply the database schema

```bash
npx prisma migrate deploy
```

This runs all existing migrations against your local Supabase project.

### 4. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000.

---

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase pooled connection string (port 6543, pgbouncer), used by Prisma at runtime |
| `DIRECT_URL` | Supabase direct connection string (port 5432), used by Prisma Migrate |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (safe to expose to the browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose to the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, used for invite user creation) |
| `NEXT_PUBLIC_APP_ENV` | Environment identifier: `development`, `staging`, or `production`. Controls the in-app banner |
| `RESEND_API_KEY` | Resend API key for transactional email. Leave blank to disable email; invite copy-link fallback activates automatically |
| `EMAIL_FROM` | Verified sender address for outgoing emails, e.g. `NovaHR <noreply@yourcompany.co.za>` |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL included in email links, e.g. `https://novahr-five.vercel.app` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error monitoring (safe to expose to the browser) |
| `SENTRY_ORG` | Sentry org slug for source map uploads (optional, Vercel only) |
| `SENTRY_PROJECT` | Sentry project slug for source map uploads (optional, Vercel only) |
| `NETCASH_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM encryption of per-tenant Netcash service keys. Required when Netcash integration is used |

---

## Deployment

NovaHR deploys to Vercel. Merges to `main` trigger a production deployment automatically.

Database migrations are applied manually via the Supabase SQL editor: paste the contents of each new file in `prisma/migrations/` in order against the production database. Do not run `prisma migrate deploy` directly against production; use the SQL editor so you retain full control over timing.

### Vercel environment variables

Set each variable per scope in **Vercel dashboard > Project Settings > Environment Variables**:

| Variable | Production | Preview (staging) |
|---|---|---|
| `DATABASE_URL` | Production pooled URL | Staging pooled URL |
| `DIRECT_URL` | Production direct URL | Staging direct URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Production project URL | Staging project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key | Staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service key | Staging service key |
| `NEXT_PUBLIC_APP_ENV` | `production` | `staging` |
| `NETCASH_ENCRYPTION_KEY` | Production encryption key | Staging encryption key |
| `RESEND_API_KEY` | Production Resend key | Staging Resend key |
| `NEXT_PUBLIC_SENTRY_DSN` | Production Sentry DSN | Staging Sentry DSN |

---

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run Vitest test suite (254 tests) |
| `npx tsc --noEmit` | Type-check without emitting |
| `npx prisma migrate deploy` | Apply pending migrations (local and staging only) |
| `npx prisma db seed` | Seed demo tenants and users |
| `npx prisma studio` | Open Prisma Studio (DB browser) |

---

## Links

- Live app: https://novahr-five.vercel.app
- App overview: docs/APP_OVERVIEW.md
- Security model: docs/security.md
- Release readiness audit: docs/RELEASE_READINESS_AUDIT_V2.md
- Testing roadmap: docs/TESTING_ROADMAP.md
