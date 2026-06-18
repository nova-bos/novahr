# Database: Prisma schema & data model

NovaHR uses **Prisma 7** against a **Supabase Postgres** database, connected via the
`@prisma/adapter-pg` driver adapter.

## Files involved

| File | Purpose |
| --- | --- |
| `prisma/schema.prisma` | The data model: enums + tables. |
| `prisma.config.ts` | Tells the Prisma CLI where the schema/seed are and which connection string to use for migrations. |
| `src/lib/prisma.ts` | The `PrismaClient` singleton used by the app (Server Actions/Components). |
| `prisma/seed.ts` | Populates demo data, see [`seed-data.md`](./seed-data.md). |

## Why connection strings live in `prisma.config.ts`, not `schema.prisma`

In Prisma 7, the `datasource` block in `schema.prisma` **no longer accepts `url` /
`directUrl`** (using them throws a `P1012` validation error). So `schema.prisma` only
declares the *provider*:

```prisma
datasource db {
  provider = "postgresql"
}
```

The actual connection string used by `prisma migrate` / `prisma db seed` comes from
`prisma.config.ts`:

```ts
import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional for commands that don't need a datasource (e.g. `generate`).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
```

Two things to note:

1. **`process.loadEnvFile(".env")`**, unlike Next.js, the Prisma CLI does **not** load
   `.env` automatically when a `prisma.config.ts` is present. This call (Node's built-in
   env-file loader, available on Node 20.12+/21.7+) makes `DIRECT_URL` etc. available to
   `process.env` before `defineConfig` reads them. It's wrapped in `try/catch` because some
   commands (e.g. `prisma generate`) don't need a datasource at all and shouldn't fail just
   because `.env` doesn't exist yet.
2. **Migrations use `DIRECT_URL`, not `DATABASE_URL`**: Supabase's pooled connection
   (`DATABASE_URL`, port 6543, pgbouncer) doesn't support the session-level features Prisma
   Migrate needs, so migrations run over the **direct** connection (port 5432). The running
   app still uses the pooled `DATABASE_URL` (see below).

## The app's Prisma Client (`src/lib/prisma.ts`)

```ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

- **`PrismaPg` adapter**: Prisma 7's recommended way to connect to Postgres, it wraps a
  `pg` connection pool and is required because `schema.prisma` no longer carries a
  connection URL itself.
- **Uses `DATABASE_URL`** (the pooled connection), appropriate for a serverless app with
  many short-lived connections.
- **`globalForPrisma` singleton**: in development, Next.js hot-reloads modules on every
  edit, which would otherwise create a new `PrismaClient` (and a new connection pool) on
  every save. Stashing the instance on `globalThis` survives the reload. In production,
  each serverless invocation gets its own instance (the `if` is skipped), which is correct
  for that environment.

Import it as `import { prisma } from "@/lib/prisma"` anywhere on the server (Server
Actions, Route Handlers, Server Components).

## The schema

### Enums

These mirror the union types already used throughout the UI in `src/lib/types.ts`, so
Prisma's generated types line up with the existing `Employee`, `LeaveRequest`, etc.
TypeScript interfaces:

| Enum | Values |
| --- | --- |
| `UserRole` | `employee`, `manager`, `hr`, `exco` |
| `EmploymentStatus` | `active`, `on_leave`, `probation`, `terminated` |
| `EmploymentType` | `full_time`, `part_time`, `contract` |
| `PayFrequency` | `monthly`, `biweekly`, `weekly` |
| `LeaveType` | `annual`, `sick`, `unpaid`, `family` |
| `LeaveStatus` | `pending`, `approved`, `rejected` |
| `PayrollRunStatus` | `scheduled`, `processing`, `completed` |
| `ActivityType` | `hire`, `leave_request`, `leave_approved`, `leave_rejected`, `payroll_run`, `promotion`, `document`, `termination`, `onboarding` |
| `NotificationType` | `info`, `success`, `warning` |

### Models

#### `Tenant`

A company/organisation using NovaHR. Every other table (except `LeaveBalance`, which hangs
off `Employee`) has a `tenantId` foreign key, this is the multi-tenancy boundary. Fields
map 1:1 to the existing `Tenant` type in `src/lib/types.ts` (legal name, registration/VAT
numbers, address, bank, pay day, etc.), with sensible defaults (`currency: "ZAR"`,
`payFrequency: monthly`, `payDay: 25`) so a new signup can create one without supplying
every field.

#### `User`

An **app account**, distinct from `Employee` (a person on the payroll). Key points:

- **`id` is the Supabase `auth.users.id`** (a UUID), not a Prisma-generated `cuid()`. There's
  no database-level foreign key into Supabase's `auth` schema (different schema, managed by
  Supabase), the link is just "same id", established when the row is created (see
  [`auth-pages.md`](./auth-pages.md) and [`seed-data.md`](./seed-data.md)).
- `role: UserRole` drives what the user can see (`AuthGuard` / `useRoleGuard`, see
  [`auth.md`](./auth.md)).
- `employeeId` is an **optional 1:1 link** to an `Employee` row, e.g. the HR admin who is
  also an employee on the payroll. New signups don't have one yet (no employees exist for
  their tenant).
- `@@index([tenantId])`, every tenant-scoped query filters on this.

#### `Employee`

A person on the company's payroll. This is the largest model because several nested objects
from `src/lib/types.ts` are **flattened into prefixed scalar columns**:

- `salary*` ← `SalaryInfo` (`salaryAnnualGross`, `salaryCurrency`, `salaryPayFrequency`,
  `salaryTravelAllowance`, `salaryHousingAllowance`, `salaryPensionContributionPct`,
  `salaryMedicalAid`)
- `bank*` ← `BankDetails` (`bankName`, `bankAccountNumber`, `bankBranchCode`,
  `bankAccountType`)
- `emergencyContact*` ← `EmergencyContact` (`emergencyContactName`,
  `emergencyContactRelationship`, `emergencyContactPhone`)

Flattening (rather than nested JSON or separate tables) means payroll calculations (Phase 2)
can filter/aggregate on e.g. `salaryAnnualGross` directly in SQL.

`onboarding: Json?` stays as JSON, it's UI wizard-progress state (which steps are done,
free-text notes), not data that needs to be queried/aggregated.

Relations: `leaveBalances[]`, `leaveRequests[]`, `payslips[]`, and an optional reverse
1:1 `user` (the `User.employeeId` link from the other side).

#### `LeaveBalance`

One row per `(employee, leave type)`, e.g. an employee's `annual` balance has `total: 18,
used: 4`. `@@unique([employeeId, type])` lets the seed script (and future code) `upsert` by
that pair. Promoted from a nested array (in the old static data) to its own table so
balances can be updated independently of the employee record.

#### `LeaveRequest`

A leave application: `type`, date range, `days`, `reason`, `status`
(`pending`/`approved`/`rejected`), and decision metadata (`decisionNote`, `decidedBy`,
`decidedOn`). Indexed on both `tenantId` and `employeeId` since it's queried both ways
(an employee's own requests, and a manager/HR's tenant-wide approval queue).

#### `Department`

A team within the tenant, `name`, `description`, `headId` (an `Employee.id`, not a hard FK,
since a department might temporarily have no head), `color` (for UI), `budget`.

#### `PayrollRun`

One payroll cycle (e.g. "June 2026"). Aggregates (`totalGross`, `totalDeductions`,
`totalNet`, `totalPaye`, `totalUif`, `employeeCount`) are stored on the run itself rather
than computed on read, since a completed run's figures shouldn't change even if an
employee's salary changes later. `payslips[]` is the reverse relation from `Payslip.runId` -
note the old static-data shape had a `payslipIds: string[]` array on the run; that's
**dropped** here in favour of the relation (Prisma can already do `run.payslips`).

#### `Payslip`

One employee's payslip for one `PayrollRun`. `earnings` and `deductions` are `Json` -
point-in-time snapshots of the line items that made up that payslip (so editing an
employee's salary later doesn't retroactively change a historical payslip). The scalar
totals (`grossPay`, `totalDeductions`, `netPay`, `paye`, `uif`) are duplicated out of that
JSON for easy querying/reporting.

#### `ActivityItem`

An entry in the tenant's activity feed (e.g. "Lerato approved Aisha's leave request").
`type: ActivityType` drives the icon/label in the UI; `employeeId` is optional (some
activity, like a payroll run, isn't about one specific employee).

#### `NotificationItem`

An in-app notification for the tenant (e.g. "Payroll run completed"). `read: Boolean` tracks
dismissal; `type: NotificationType` (`info`/`success`/`warning`) drives styling.

## What's *not* in the database yet

- **`LeavePolicy`** and **`PayrollConfig`** (`src/lib/data/settings.ts`) remain global
  static config, not per-tenant DB rows. `getPayrollConfig(tenantId)` falls back to a
  default config (empty reference numbers, `uifEnabled`/`sdlEnabled: true`,
  `defaultPensionPct: 7.5`, current tax year) for tenants without a configured entry, e.g.
  any brand-new signup, so `usePayrollConfig()` (Settings → Payroll, tenant profile page)
  doesn't throw. Making these tenant-configurable is a later phase.

As of Phase 2, everything else is fully DB-backed for all 3 demo tenants (and for any new
signup): `Employee`, `LeaveBalance`, `LeaveRequest`, `Department`, `PayrollRun`, `Payslip`,
`ActivityItem`, and `NotificationItem`. `AppProvider` loads all of it for the signed-in
user's tenant in one round trip via `getTenantWorkspace()`, and every mutation (add/update
employee, leave requests, payroll runs, notifications) is a Server Action that writes
straight to Postgres, see [`data-layer.md`](./data-layer.md). The seed script populates
the full static dataset from `src/lib/data/*` into these tables for all 3 demo tenants; see
[`seed-data.md`](./seed-data.md).

## Running migrations

```bash
npx prisma migrate dev --name <description>
```

Creates/updates tables in Postgres from `prisma/schema.prisma` and regenerates the Prisma
Client (`@prisma/client`). Requires `DIRECT_URL` to be set in `.env` (see
[`README.md`](./README.md#2-configure-environment-variables)).

To regenerate the client without touching the database (e.g. after pulling schema changes
someone else made):

```bash
npx prisma generate
```
