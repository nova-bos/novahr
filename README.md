# NovaHR

HR and payroll SaaS for South African SMEs. Built with Next.js 15, Supabase, and Prisma.

Production: https://novahr-five.vercel.app

## Feature highlights

- **Employees**: directory, profiles, onboarding wizard, photo uploads, salary history
- **Leave**: all 9 SA leave types (BCEA + Van Wyk interim order), working-day counting with
  SA public holidays, approvals with email notifications, supporting documents
- **Payroll**: SARS 2026/27 PAYE/UIF/SDL, medical aid tax credits, pension s11F, payslip
  PDFs, bank export CSV, Netcash NIF
- **Compliance**: PAYE/UIF/SDL return tracking per period (EMP201-ready totals)
- **Teams**: role-based access (HR, manager, employee, exco), email invitations,
  department management
- **Billing**: 14-day trial with in-app expiry lock and upgrade page
- **Security**: server-side route protection, per-action authorization, role-scoped data,
  Postgres row-level security (see `docs/security.md`)

---

## Tech stack

- **Next.js 15** (App Router, React 19, TypeScript strict)
- **Supabase** (Auth + Postgres)
- **Prisma v7** with `@prisma/adapter-pg` (connection passed via adapter, not schema URL)
- **Tailwind CSS v4** + shadcn/ui
- **Vercel** for hosting

---

## Environments

| Environment | Trigger | Supabase project | URL |
|---|---|---|---|
| Local dev | `npm run dev` | novahr-dev | localhost:3000 |
| Staging | Vercel preview (any PR) | novahr-staging | auto-generated preview URL |
| Production | Merge to `main` | novahr-prod | novahr-five.vercel.app |

An in-app banner appears at the top of every page when `NEXT_PUBLIC_APP_ENV` is `development` or `staging`. Production shows no banner.

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/Wandile-Mtshwene/novahr.git
cd novahr
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a project (free tier is fine for development). From **Project Settings**:

- **Database tab**: copy the "Connection pooling" string (port 6543) for `DATABASE_URL` and the "Direct connection" string (port 5432) for `DIRECT_URL`.
- **API tab**: copy the project URL for `NEXT_PUBLIC_SUPABASE_URL`, the `anon` key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the `service_role` key for `SUPABASE_SERVICE_ROLE_KEY`.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with the values from step 2. Keep `NEXT_PUBLIC_APP_ENV=development`.

### 4. Apply the database schema

```bash
npx prisma migrate deploy
```

This runs all existing migrations against your dev Supabase project.

### 5. Seed demo data

```bash
npx prisma db seed
```

Creates three demo tenants and their Supabase Auth users. Login credentials are in `docs/uat-checklist.md`.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Development workflow

All changes go through feature branches and pull requests. Direct pushes to `main` require
bypassing protection (needs GitHub Pro, see `docs/planning/ROADMAP.md` item 1).

```bash
git checkout -b feature/your-feature
# make changes, commit
git push -u origin feature/your-feature
# open a PR; CI must pass before merging
```

CI runs on every push: `eslint`, `tsc --noEmit`, `vitest run`.

---

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run Vitest test suite (233 tests) |
| `npx tsc --noEmit` | Type-check without emitting |
| `npx prisma migrate deploy` | Apply pending migrations |
| `npx prisma db seed` | Seed demo tenants and users |
| `npx prisma studio` | Open Prisma Studio (DB browser) |

---

## Project structure

```
src/
  app/
    (app)/        authenticated app routes
    page.tsx      marketing landing page
    login/
    signup/
  components/
    layout/       sidebar, topbar, env-banner, etc.
    ui/           shadcn components
    dashboard/ employees/ leave/ payroll/
  lib/
    store/        AppProvider (in-memory state; Phase 2 replaces this with DB)
    auth/         Supabase auth provider and server actions
    supabase/     client.ts and server.ts Supabase factories
    prisma.ts     Prisma client singleton
    payroll/      PAYE/UIF/SDL calculator, payslip HTML template
    format.ts     formatCurrency, formatDate, etc.
    types.ts      shared TypeScript types
prisma/
  schema.prisma   full schema
  migrations/     SQL migration files
  seed.ts         demo tenant and user seeding
docs/
  planning/
    ACTION_PLAN.md  business plan to first paying client
    ROADMAP.md      technical roadmap (all upcoming items)
  security.md       auth/authz model and role matrix
  leave.md          SA leave framework, working days, public holidays
  TESTING_ROADMAP.md  release testing plan and statutory review calendar
  uat-checklist.md
  testing.md
  database.md
```

---

## Vercel environment variable configuration

In **Vercel dashboard > Project Settings > Environment Variables**, set each variable
per scope. The staging scope is "Preview" in Vercel's terminology.

| Variable | Production | Preview (staging) |
|---|---|---|
| `DATABASE_URL` | novahr-prod pooled URL | novahr-staging pooled URL |
| `DIRECT_URL` | novahr-prod direct URL | novahr-staging direct URL |
| `NEXT_PUBLIC_SUPABASE_URL` | novahr-prod URL | novahr-staging URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | novahr-prod anon key | novahr-staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | novahr-prod service key | novahr-staging service key |
| `NEXT_PUBLIC_APP_ENV` | `production` | `staging` |

After configuring, pull the Development env vars locally:

```bash
vercel link      # link local repo to the Vercel project (one-time setup)
vercel env pull  # writes .env.local with Development-scoped env vars
```

---

## Setting up the staging Supabase project

1. Create a new Supabase project named `novahr-staging` at [supabase.com](https://supabase.com).
2. Copy its connection strings into the Preview env vars on Vercel (see table above).
3. Apply the schema to staging. Easiest via the Supabase SQL editor: paste the contents
   of each file in `prisma/migrations/` in order. Or point `DIRECT_URL` at staging
   temporarily and run `npx prisma migrate deploy`.
