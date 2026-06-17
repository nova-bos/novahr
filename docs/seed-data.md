# Seed data — full demo dataset & personas

`npx prisma db seed` (configured in `prisma.config.ts`, runs `tsx prisma/seed.ts`)
populates a fresh database with the **full demo dataset for all 3 tenants** — every
employee, department, leave request, payroll run/payslip, activity item, and notification
from `src/lib/data/*` — plus the 4 demo accounts used by the `/login` persona picker. It's
**idempotent** — every write is an `upsert` (or an "already exists, skip" check for
Supabase Auth users), so running it again after the schema or data changes is safe and
won't create duplicates.

## What gets seeded

```
Seeding tenants...
  -> 3 tenants ready
Seeding employees...
  -> 40 employees ready
Seeding departments...
  -> 22 departments ready
Seeding leave requests...
  -> 19 leave requests ready
Seeding payroll runs...
  -> 18 payroll runs ready
Seeding payslips...
  -> 186 payslips ready
Seeding activity feed...
  -> 24 activity items ready
Seeding notifications...
  -> 15 notifications ready
Seeding demo accounts...
  -> 4 demo accounts ready
```

### 1. Tenants — `tenants` from `src/lib/data/tenants.ts`

```ts
for (const tenant of tenants) {
  await prisma.tenant.upsert({
    where: { id: tenant.id },
    update: {},
    create: { ...tenant },
  });
}
```

The 3 demo companies (`novatech` / NovaTech Solutions, `apex` / Apex Financial Group,
`horizon` / Horizon Logistics) become real `Tenant` rows with the same `id`s and details
they've always had in the static array — `update: {}` means re-running the seed won't
clobber any manual edits made later via Settings.

### 2. Employees — `getEmployeesByTenant()` from `src/lib/data/employees.ts`

```ts
for (const tenant of tenants) {
  for (const employee of getEmployeesByTenant(tenant.id)) {
    await prisma.employee.upsert({
      where: { id: employee.id },
      update: {},
      create: { /* ...flattened fields, see below */ },
    });

    for (const balance of employee.leaveBalances) {
      await prisma.leaveBalance.upsert({
        where: { employeeId_type: { employeeId: employee.id, type: balance.type } },
        update: {},
        create: { employeeId: employee.id, type: balance.type, total: balance.total, used: balance.used },
      });
    }
  }
}
```

Every employee across all 3 tenants (40 total) is seeded — not just the 3 NovaTech
employees referenced by demo personas, as in Phase 1. The `create` payload maps the nested
`Employee` shape (`salary`, `bankDetails`, `emergencyContact`, etc., from `src/lib/types.ts`)
onto the flattened `Employee` columns described in
[`database.md`](./database.md#employee) — e.g. `employee.salary.annualGross` →
`salaryAnnualGross`, `employee.bankDetails.accountNumber` → `bankAccountNumber`.
`employee.onboarding` is cast as `Prisma.InputJsonValue | undefined` (Prisma's `Json?`
columns need this cast to satisfy TypeScript when the source type doesn't already have an
index signature).

Each employee's `leaveBalances` (e.g. `{ type: "annual", total: 18, used: 4 }`) become
`LeaveBalance` rows, upserted on the `[employeeId, type]` unique constraint.

### 3. Departments — `departments` from `src/lib/data/departments.ts`

```ts
for (const department of departments) {
  await prisma.department.upsert({
    where: { id: department.id },
    update: {},
    create: {
      id: department.id,
      tenantId: department.tenantId,
      name: department.name,
      description: department.description,
      headId: department.headId,
      color: department.color,
      budget: department.budget,
    },
  });
}
```

22 departments across the 3 tenants (8 NovaTech, 7 Apex, 7 Horizon), upserted by `id`.
`headId` references an `Employee.id` seeded in step 2 — not a hard foreign key (see
[`database.md`](./database.md#department)), so seed order between departments and
employees doesn't matter for referential integrity, though employees are seeded first for
clarity.

### 4. Leave requests — `leaveRequests` from `src/lib/data/leave.ts`

```ts
for (const request of leaveRequests) {
  await prisma.leaveRequest.upsert({
    where: { id: request.id },
    update: {},
    create: {
      id: request.id,
      tenantId: request.tenantId,
      employeeId: request.employeeId,
      type: request.type,
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      days: request.days,
      reason: request.reason,
      status: request.status,
      appliedOn: new Date(request.appliedOn),
      decisionNote: request.decisionNote,
      decidedBy: request.decidedBy,
      decidedOn: request.decidedOn ? new Date(request.decidedOn) : undefined,
    },
  });
}
```

19 leave requests across the 3 tenants (7 NovaTech, 6 Apex, 6 Horizon), in a mix of
`pending`/`approved`/`rejected` statuses, upserted by `id`. Date-only fields (`startDate`,
`endDate`, `appliedOn`, `decidedOn`) are plain `new Date(str)` since the static data already
uses `YYYY-MM-DD` strings.

### 5. Payroll runs & payslips — `payrollRuns` and `payslips` from `src/lib/data/payroll.ts`

```ts
for (const run of payrollRuns) {
  await prisma.payrollRun.upsert({
    where: { id: run.id },
    update: {},
    create: {
      id: run.id,
      tenantId: run.tenantId,
      period: run.period,
      label: run.label,
      payDate: new Date(run.payDate),
      status: run.status,
      totalGross: run.totalGross,
      totalDeductions: run.totalDeductions,
      totalNet: run.totalNet,
      totalPaye: run.totalPaye,
      totalUif: run.totalUif,
      employeeCount: run.employeeCount,
      processedOn: run.processedOn ? parseTimestamp(run.processedOn) : undefined,
    },
  });
}

for (const payslip of payslips) {
  await prisma.payslip.upsert({
    where: { id: payslip.id },
    update: {},
    create: {
      // ...scalar fields, plus:
      earnings: payslip.earnings as unknown as Prisma.InputJsonValue,
      deductions: payslip.deductions as unknown as Prisma.InputJsonValue,
    },
  });
}
```

`src/lib/data/payroll.ts` generates **5 completed runs** (`2026-01` … `2026-05`) plus **1
scheduled run** (`2026-06`) per tenant — 18 runs total — using the existing, unmodified
`buildPayslip` from `src/lib/payroll-calc.ts`. The 5 completed runs produce 186 payslips
across the 3 tenants (one per eligible employee per run — eligibility depends on each
employee's `startDate` relative to that run's `payDate`, so headcount varies slightly run
to run). Runs are seeded before payslips since `Payslip.runId` is a foreign key.
`processedOn` (a naive `"2026-0X-25T09:14:00"` string with no timezone) goes through
`parseTimestamp` (from `src/lib/workspace/mappers.ts`) so it round-trips to the same value
regardless of server timezone — see that file's doc comment. `earnings`/`deductions` are
point-in-time JSON snapshots, cast `as unknown as Prisma.InputJsonValue` for the same
structural-typing reason as `onboarding` in step 2.

### 6. Activity feed — `activityFeed` from `src/lib/data/activity.ts`

```ts
for (const item of activityFeed) {
  await prisma.activityItem.upsert({
    where: { id: item.id },
    update: {},
    create: {
      id: item.id,
      tenantId: item.tenantId,
      type: item.type,
      message: item.message,
      actor: item.actor,
      employeeId: item.employeeId,
      timestamp: parseTimestamp(item.timestamp),
    },
  });
}
```

24 activity items (8 per tenant), upserted by `id`. `timestamp` is a naive datetime string
(e.g. `"2026-06-11T08:10:00"`) and goes through `parseTimestamp` for the same UTC-pinning
reason as `processedOn` above.

### 7. Notifications — `notifications` from `src/lib/data/notifications.ts`

```ts
for (const item of notifications) {
  await prisma.notificationItem.upsert({
    where: { id: item.id },
    update: {},
    create: {
      id: item.id,
      tenantId: item.tenantId,
      title: item.title,
      description: item.description,
      timestamp: parseTimestamp(item.timestamp),
      read: item.read,
      type: item.type,
    },
  });
}
```

15 notifications (5 per tenant), upserted by `id`, `timestamp` via `parseTimestamp` as
above.

### 8. Demo accounts — `demoUsers` from `src/lib/auth/demo-users.ts`

```ts
export interface DemoPersona {
  id: string;
  role: UserRole;
  name: string;
  title: string;
  email: string;
  password: string;
  tenantId: string;
  employeeId?: string;
  avatarColor: string;
  initials: string;
}

export const demoUsers: DemoPersona[] = [
  { id: "user-employee", role: "employee", name: "Aisha Patel", title: "Senior Software Engineer", email: "aisha.patel@novatech.co.za", password: "employee123", tenantId: "novatech", employeeId: "novatech-emp-003", avatarColor: "#A855F7", initials: "AP" },
  { id: "user-manager",  role: "manager",  name: "Thabo Nkosi",  title: "VP of Engineering",        email: "thabo.nkosi@novatech.co.za",  password: "manager123",  tenantId: "novatech", employeeId: "novatech-emp-002", avatarColor: "#0F9D8C", initials: "TN" },
  { id: "user-hr",       role: "hr",       name: "Lerato Dlamini", title: "Chief People Officer",    email: "lerato.dlamini@novatech.co.za", password: "hr123",      tenantId: "novatech", employeeId: "novatech-emp-001", avatarColor: "#4C6FFF", initials: "LD" },
  { id: "user-exco",     role: "exco",     name: "Michael van der Berg", title: "Group Chief Executive", email: "michael.vandenberg@novagroup.co.za", password: "exco123", tenantId: "novatech", avatarColor: "#E08A3C", initials: "MV" },
];
```

This file is **display + seed data only** — it's read by `/login` (to render the persona
cards and pre-fill the form, see [`auth-pages.md`](./auth-pages.md#login-srcapploginpagetsx))
and by `prisma/seed.ts` (to create the actual accounts). It is **not** read by any
authentication logic at runtime — real auth always goes through Supabase
(`supabase.auth.signInWithPassword`).

For each persona, the seed script:

```ts
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureAuthUser(email: string, password: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!error) return data.user.id;

  if (error.code === "email_exists") {
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    const existing = list.users.find((u) => u.email === email);
    if (existing) return existing.id;
  }

  throw error;
}

for (const persona of demoUsers) {
  const authUserId = await ensureAuthUser(persona.email, persona.password);

  await prisma.user.upsert({
    where: { email: persona.email },
    update: {},
    create: {
      id: authUserId,
      tenantId: persona.tenantId,
      email: persona.email,
      name: persona.name,
      title: persona.title,
      role: persona.role,
      employeeId: persona.employeeId,
      avatarColor: persona.avatarColor,
      initials: persona.initials,
    },
  });
}
```

1. **`supabaseAdmin`** — a Supabase client created with the **service role key**
   (`SUPABASE_SERVICE_ROLE_KEY`), which can call the Admin API (`auth.admin.*`). This key is
   server-only and must never be exposed to the browser — it's only used here, in the seed
   script.
2. **`ensureAuthUser`** — tries to create the Supabase Auth user with
   `email_confirm: true` (so the seeded persona can log in immediately, without clicking a
   confirmation email). If the user already exists (`error.code === "email_exists"` — true
   on every re-run after the first), it looks the existing user up by email via
   `listUsers()` and returns *its* id instead. This is what makes the script idempotent for
   the auth-user step. (This function is defined as a closure inside `main()`, not a
   top-level function — keeping it there avoids a TypeScript generic-mismatch on the
   Supabase client type when passed as a parameter.)
3. **`prisma.user.upsert({ where: { email } })`** — creates the matching `User` row with
   `id = authUserId` (the Supabase `auth.users.id` from step 2). `employeeId` links
   Lerato/Thabo/Aisha to their `Employee` rows seeded in step 2; Michael (exco) has no
   `employeeId`.

## Logging in as a seeded persona

After seeding, any of these work on `/login` (either click the persona card to pre-fill, or
type manually):

| Persona | Role | Email | Password |
| --- | --- | --- | --- |
| Aisha Patel | Employee | `aisha.patel@novatech.co.za` | `employee123` |
| Thabo Nkosi | Manager | `thabo.nkosi@novatech.co.za` | `manager123` |
| Lerato Dlamini | HR | `lerato.dlamini@novatech.co.za` | `hr123` |
| Michael van der Berg | Exco | `michael.vandenberg@novagroup.co.za` | `exco123` |

These are **demo credentials for a development/sales database only** — don't seed them
into a production database with real customer data without changing the passwords.

## Re-running the seed

```bash
npx prisma db seed
```

Safe to run repeatedly: every table is upserted by its `id` (or `[employeeId, type]` for
`LeaveBalance`, or `email` for `User`) with `update: {}`, so re-running is a no-op for
anything that already exists, and demo accounts reuse the existing Supabase Auth user if
`email_exists` is returned. Nothing is deleted or overwritten on a re-run.
