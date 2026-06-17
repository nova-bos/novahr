# Data layer — Server Actions for employees, leave, payroll & notifications

Phase 2 moves employees, departments, leave, payroll runs/payslips, the activity feed, and
notifications off the in-memory `AppProvider` reducer and onto Postgres. This doc covers
the resulting **fetch-once, dispatch-mutation-results** architecture: one aggregate read on
mount/tenant-change, and nine Server Actions — one per mutation — whose results get merged
into local state.

(Phase 1's auth/tenant docs — [`auth.md`](./auth.md), [`tenants.md`](./tenants.md) — cover
how `currentTenant` and the signed-in user are loaded; this doc covers everything else in
`AppState`.)

## The pattern

```
AppProvider mount / tenantId change
  -> getTenantWorkspace(tenantId)        (src/lib/workspace/actions.ts)
  -> dispatch SET_WORKSPACE { currentTenant, employees, departments, leaveRequests,
                              payrollRuns, payslips, activity, notifications }

user action (e.g. submit a leave request)
  -> await createLeaveRequestRecord(input)   (src/lib/leave/actions.ts)
  -> dispatch LEAVE_REQUEST_ADDED { leaveRequest, activity, notification }
  -> reducer merges the already-fully-formed records into
     state.leaveRequests / state.activity / state.notifications
```

Every mutation Server Action does its Postgres write — plus any side-effect rows
(`ActivityItem`, `NotificationItem`, `LeaveBalance` updates, etc.) — inside a
`prisma.$transaction`, computes whatever today's reducer used to compute client-side (ids,
messages, totals, next-period scheduling), and returns the resulting record(s) already
mapped to the app's `src/lib/types.ts` shapes. The reducer's job shrinks to "merge this
result into the right array(s)" — no more `Date.now()`, id generation, or message-string
construction in the browser.

## `src/lib/workspace/mappers.ts` — shared Prisma-row → app-type mappers

A plain module (no `"use server"`), imported by every action file below:

- `toDateOnly(date: Date): string` — `date.toISOString().slice(0, 10)`, for
  date-only fields (`startDate`, `endDate`, `payDate`, `appliedOn`, `decidedOn`).
- `toTimestamp(date: Date): string` — `date.toISOString()`, for full-precision fields
  (`timestamp`, `processedOn`).
- `parseTimestamp(value: string): Date` — pins a naive datetime string (no `Z`/offset, as
  used in `src/lib/data/activity.ts`, `notifications.ts`, and `payroll.ts`'s
  `processedOn`) to UTC by appending `Z` if missing, so a value written by the seed script
  round-trips back through `toTimestamp` to the same string regardless of server timezone.
- `mapTenant`, `mapEmployee`, `mapDepartment`, `mapLeaveRequest`, `mapPayslip`,
  `mapPayrollRun`, `mapActivityItem`, `mapNotificationItem` — one mapper per model,
  reconstructing the nested `src/lib/types.ts` shapes (`salary`, `bankDetails`,
  `emergencyContact`, `leaveBalances`, `onboarding`, `earnings`/`deductions`) from the
  flattened/JSON Prisma columns described in [`database.md`](./database.md). `Prisma`
  model types are imported with a `Prisma`-prefixed alias (e.g. `Tenant as PrismaTenant`)
  to avoid colliding with the identically-named app types.
- `mapPayrollRun(row, payslipIds: string[])` takes `payslipIds` as a second argument — the
  Prisma `PayrollRun` model dropped the old static data's `payslipIds: string[]` array in
  favour of the `Payslip.runId` relation, so callers derive it from a separate
  `Payslip` query/grouping (see `getTenantWorkspace` below).

## `src/lib/workspace/actions.ts` — `getTenantWorkspace`

```ts
export interface TenantWorkspace {
  currentTenant: Tenant;
  employees: Employee[];
  departments: Department[];
  leaveRequests: LeaveRequest[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  activity: ActivityItem[];
  notifications: NotificationItem[];
}

export async function getTenantWorkspace(tenantId: string): Promise<TenantWorkspace | null> {
  const [tenant, employeeRows, departmentRows, leaveRequestRows, payrollRunRows, payslipRows, activityRows, notificationRows] =
    await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.employee.findMany({ where: { tenantId }, include: { leaveBalances: true } }),
      prisma.department.findMany({ where: { tenantId } }),
      prisma.leaveRequest.findMany({ where: { tenantId } }),
      prisma.payrollRun.findMany({ where: { tenantId } }),
      prisma.payslip.findMany({ where: { tenantId } }),
      prisma.activityItem.findMany({ where: { tenantId } }),
      prisma.notificationItem.findMany({ where: { tenantId } }),
    ]);

  if (!tenant) return null;

  const payslipIdsByRun = new Map<string, string[]>();
  for (const row of payslipRows) {
    const ids = payslipIdsByRun.get(row.runId) ?? [];
    ids.push(row.id);
    payslipIdsByRun.set(row.runId, ids);
  }

  return {
    currentTenant: mapTenant(tenant),
    employees: employeeRows.map(mapEmployee),
    departments: departmentRows.map(mapDepartment),
    leaveRequests: leaveRequestRows.map(mapLeaveRequest),
    payrollRuns: payrollRunRows.map((run) => mapPayrollRun(run, payslipIdsByRun.get(run.id) ?? [])),
    payslips: payslipRows.map(mapPayslip),
    activity: activityRows.map(mapActivityItem),
    notifications: notificationRows.map(mapNotificationItem),
  };
}
```

8 queries, run in parallel, all scoped to `tenantId`. Returns `null` only if the tenant row
itself doesn't exist (shouldn't happen for a signed-in user — same null-safety Phase 1's
`getTenantById` had). This **replaced** `src/lib/tenants/actions.ts`, which is deleted.

## `src/lib/employees/actions.ts`

- **`createEmployeeRecord(employee: Employee)`** — `$transaction`: `employee.create` with
  the same flattened-column mapping as the seed script (see
  [`seed-data.md`](./seed-data.md#2-employees--getemployeesbytenant-from-srclibdataemployeests)),
  plus a nested `leaveBalances: { create: [...] }` write, plus `activityItem.create` and
  `notificationItem.create`. The activity/notification messages depend on whether
  `employee.status === "probation"`:

  | Status | Activity message | Notification title |
  | --- | --- | --- |
  | `probation` | `"started onboarding as <jobTitle>"` (type `onboarding`) | "New team member onboarding" |
  | anything else | `"joined as <jobTitle>"` (type `hire`) | "New employee added" |

  The client's placeholder `id` is ignored — Prisma assigns the real `cuid()`. Returns
  `{ employee, activity, notification }`, all mapped via `mappers.ts`.

- **`updateEmployeeRecord(id: string, updates: Partial<Employee>)`** — destructures
  `salary`, `bankDetails`, `emergencyContact`, `leaveBalances`, `onboarding`, `startDate`
  out of `updates`; the first three are spread onto their flattened columns field-by-field
  (only the keys present in `updates` are written, mirroring the old reducer's shallow
  merge), `startDate` becomes `new Date(startDate)`, and the rest of `updates` is passed
  through as-is. `leaveBalances`/`onboarding` are destructured out but intentionally
  unused here — they're mutated via the dedicated leave/onboarding actions below, not
  through this general-purpose update. `prisma.employee.update(...)`, re-`include`
  `leaveBalances`, map back to `Employee`.

- **`toggleOnboardingStepRecord(employeeId: string, stepId: string)`** — `$transaction`:
  loads the employee, flips the matching step in the `onboarding` JSON (cast via
  `Onboarding` from `src/lib/types.ts`), recomputes `progress` as
  `round(completeCount / steps.length * 100)`. If `progress === 100` and the employee
  wasn't already `active`, sets `status: "active"` (graduation) and additionally creates an
  `ActivityItem` (`type: "onboarding"`, message `"completed onboarding and is now fully
  active"`). Returns `{ employee, activity? }` — `activity` is only present on the
  graduating call.

## `src/lib/leave/actions.ts`

- **`createLeaveRequestRecord(input: CreateLeaveRequestInput)`** — `input` is
  `{ tenantId, employeeId, type, startDate, endDate, days, reason }`; `id`, `status`
  (defaults to `pending`), and `appliedOn` (defaults to `now()`) are DB-assigned, not
  client-supplied. Looks up the employee for `actor`, then `$transaction`:
  `leaveRequest.create` + `activityItem.create` (`"requested N day(s) of <type label>"`,
  type `leave_request`) + `notificationItem.create` (title "Leave request awaiting
  approval", same wording pattern). `leaveTypeLabel` (from `src/lib/format.ts`) renders the
  human-readable leave type, lowercased, in both messages.

- **`decideLeaveRequestRecord(id, status, decidedBy, decisionNote?)`** — `status` is
  narrowed to `"approved" | "rejected"`. `$transaction`: `leaveRequest.update` (`status`,
  `decidedBy`, `decidedOn: now()`, `decisionNote`); if `status === "approved"`, also
  `leaveBalance.update({ where: { employeeId_type: {...} }, data: { used: { increment: target.days } } })`;
  plus `activityItem.create` (`"<type label> request was <approved|rejected>"`, type
  `leave_approved`/`leave_rejected`). Returns
  `{ leaveRequest, leaveBalance?: { employeeId, type, used }, activity }` — the updated
  balance (only present when approved) lets `AppProvider` patch the matching employee's
  `leaveBalances` in place without refetching the whole employee.

## `src/lib/payroll/actions.ts`

- **`startPayrollRunRecord(runId: string)`** — `payrollRun.update({ status: "processing" })`,
  plus a `payslip.findMany({ where: { runId } })` to rebuild `payslipIds` for
  `mapPayrollRun`. No side-effect rows — matches the old reducer's `START_PAYROLL_RUN`,
  which was a pure status flip.

- **`completePayrollRunRecord(runId: string)`** — the most involved action:
  1. Loads the run, its tenant, and all of the tenant's employees (mapped via
     `mapEmployee`).
  2. Filters to eligible employees (`status !== "terminated" && startDate <= payDate`,
     same condition `src/lib/data/payroll.ts` uses to generate the seed data) and builds a
     payslip per employee via the **existing, unmodified** `buildPayslip` from
     `src/lib/payroll-calc.ts` — no payroll-math duplication.
  3. Sums `totalGross`/`totalDeductions`/`totalNet`/`totalPaye`/`totalUif` with small local
     `sum`/`round2` helpers (the same ones the old reducer used, now living here).
  4. Computes the next period via `incrementPeriod` (also from `payroll-calc.ts`) and
     checks whether a `PayrollRun` for `${tenantId}-run-${nextPeriod}` already exists.
  5. In one `$transaction`: `payslip.createMany` (JSON-cast `earnings`/`deductions`),
     `payrollRun.update` (totals + `status: "completed"` + `processedOn: now()`),
     `activityItem.create` (`"processed payroll for <Month Year>"`, type `payroll_run`,
     actor from the `PAYROLL_OWNER` map — moved into this file from the old reducer:
     `{ novatech: "Werner Botha", apex: "Thandiwe Mokoena", horizon: "Annelie Joubert" }`),
     `notificationItem.create` (title "Payslips published"). If the next-period run
     doesn't exist yet, also creates it as `scheduled` with that period's eligible
     employee count — identical to today's "auto-create next scheduled run" behaviour.

  Returns `{ payrollRun, payslips, nextRun?, activity, notification }`. `formatMonthYear`
  (from `src/lib/format.ts`) replaces the old reducer's local `formatPeriodLabel` — same
  output, one fewer duplicated helper.

## `src/lib/notifications/actions.ts`

- **`markNotificationReadRecord(id: string)`** — `notificationItem.update({ where: { id }, data: { read: true } })`.
- **`markAllNotificationsReadRecord(tenantId: string)`** — `notificationItem.updateMany({ where: { tenantId, read: false }, data: { read: true } })`.

Both return `void`; the reducer flips the corresponding `read` flag(s) locally on success.

## `AppProvider` (`src/lib/store/app-provider.tsx`)

`AppState` gained `departments: Department[]`. `initialState` is all-empty
(`currentTenant: null`, every array `[]`) — there's no more synchronous seed from
`src/lib/data/*`. The reducer's 11 actions:

| Action | Effect |
| --- | --- |
| `SET_TENANT` | Sets `tenantId`, resets `currentTenant` and all 7 data arrays to empty/`null` (so a tenant switch doesn't show stale data while the new workspace loads). |
| `SET_WORKSPACE` | Spreads all 8 `TenantWorkspace` fields into state (field names match `AppState` 1:1 by design), or just clears `currentTenant` if `workspace` is `null`. |
| `EMPLOYEE_ADDED` | Appends to `employees`, prepends to `activity` and `notifications`. |
| `EMPLOYEE_UPDATED` | Replaces the matching `employees` entry by `id`. |
| `ONBOARDING_STEP_TOGGLED` | Replaces the matching `employees` entry; prepends to `activity` only if an `activity` item was returned (graduation). |
| `LEAVE_REQUEST_ADDED` | Prepends to `leaveRequests`, `activity`, and `notifications`. |
| `LEAVE_REQUEST_DECIDED` | Replaces the matching `leaveRequests` entry; if `leaveBalance` is present, patches that employee's matching `leaveBalances` entry; prepends to `activity`. |
| `PAYROLL_RUN_STARTED` | Replaces the matching `payrollRuns` entry. |
| `PAYROLL_RUN_COMPLETED` | Replaces the matching `payrollRuns` entry, appends `nextRun` if present, appends `payslips`, prepends to `activity` and `notifications`. |
| `NOTIFICATION_READ` | Sets `read: true` on the matching `notifications` entry. |
| `ALL_NOTIFICATIONS_READ` | Sets `read: true` on every `notifications` entry for `tenantId`. |

All 9 mutators on `AppContextValue` are now `async`, each `await`-ing its Server Action and
dispatching the result:

```ts
addEmployee: async (employee) => {
  const result = await createEmployeeRecord(employee);
  dispatch({ type: "EMPLOYEE_ADDED", employee: result.employee, activity: result.activity, notification: result.notification });
  return result.employee; // real DB id, used by the onboarding wizard's router.push
},
```

`addLeaveRequest`'s parameter type narrowed from `LeaveRequest` to `CreateLeaveRequestInput`
(`{ tenantId, employeeId, type, startDate, endDate, days, reason }`) — `id`, `status`, and
`appliedOn` are server-assigned now, so callers no longer construct them. The other 8
mutators keep their previous signatures (`updateEmployee`, `toggleOnboardingStep`,
`decideLeaveRequest`, `startPayrollRun`, `completePayrollRun`, `markNotificationRead`,
`markAllNotificationsRead` all return `Promise<void>`).

The now-unused client-side helpers `sum`, `round2`, `employeeName`, `leaveTypeLabel`'s old
duplicate, `formatPeriodLabel`, and the `PAYROLL_OWNER` map were removed from
`app-provider.tsx` — they all moved server-side as described above (`leaveTypeLabel` and
`formatMonthYear` are imported from `src/lib/format.ts` rather than duplicated).

## `src/lib/store/hooks.ts` simplifications

Now that `state.*` arrays come pre-scoped to `state.tenantId` from `getTenantWorkspace`,
the redundant `.filter((x) => x.tenantId === state.tenantId)` calls are gone:

- `useDepartments()` → `return useApp().state.departments;` (no `getDepartmentsByTenant`
  import).
- `useEmployees()` → `return useApp().state.employees;` (no `React.useMemo`/filter).
- `useLeaveRequests()`, `usePayrollRuns()`, `useActivity()`, `useNotifications()` — still
  `React.useMemo`'d for their `.sort()`/`.slice()`, now starting from `[...state.X]`
  instead of a filtered copy.
- `useEmployee`, `usePayrollRun`, `usePayslipsByRun`, `usePayslip`, `usePayslipsByEmployee`,
  `useUnreadNotificationCount` — unchanged (already id/employeeId-scoped, not
  tenant-scoped).

## Call-site changes (9 mutation call sites)

Every call site wraps its existing dispatcher call in `await` inside a `try/catch`, keeps
the existing success `toast`, and adds a `toast.error("Couldn't ...")` on failure. Handler
functions become `async`.

| File | Call(s) | Notes |
| --- | --- | --- |
| `src/components/leave/new-leave-request-dialog.tsx` | `addLeaveRequest({...})` | Object literal drops `id`/`status`/`appliedOn` (server-assigned now). |
| `src/components/dashboard/manager-dashboard.tsx` | `decideLeaveRequest(...)` | `handleDecision` → `async`. |
| `src/components/leave/leave-requests-table.tsx` | `decideLeaveRequest(...)` | `handleDecision` → `async`. |
| `src/components/payroll/current-run-card.tsx` | `startPayrollRun(...)`, `completePayrollRun(...)` | `handleStart`/`handleFinalize` → `async`. |
| `src/components/layout/notifications-menu.tsx` | `markNotificationRead(...)`, `markAllNotificationsRead(...)` | Inline `onClick={() => void markNotificationRead(...)}` — no error toast (low-stakes UI toggle). |
| `src/components/employees/profile-onboarding.tsx` | `toggleOnboardingStep(...)` | Inline `onClick` with `.catch()` → `toast.error` on failure. |
| `src/components/employees/onboarding/onboarding-wizard.tsx` | `addEmployee(employee)` | `handleCreate` → `async`; uses the **returned** employee's real `id` for `router.push` and the success toast. |
| `src/components/employees/edit-employee-dialog.tsx` | `updateEmployee(...)` | `handleSubmit` → `async`. |

`src/components/layout/tenant-switcher.tsx` and tenant-switching elsewhere call
`setTenant(...)`, which stays synchronous — it just updates `tenantId` and lets the
`SET_WORKSPACE` effect handle the rest.

## Cross-tenant views: exco dashboard & `/tenants` page

`state.employees`/`state.leaveRequests`/etc. are now scoped to the **signed-in user's
tenant only** (via `getTenantWorkspace(state.tenantId)`). Two views need *group-wide* data
across all 3 demo tenants instead:

- **`ExcoDashboard`** (`src/components/dashboard/exco-dashboard.tsx`) — group headcount,
  group payroll, pending approvals, and per-tenant summaries for the "Michael" exco
  persona.
- **`TenantCard`** (`src/components/tenants/tenant-card.tsx`) — each company's employee
  count, department count, and monthly payroll on the `/tenants` page, including
  tenants the signed-in user *isn't* currently viewing.

Both components read directly from the static `src/lib/data/*` exports (`employees`,
`leaveRequests`, `getDepartmentsByTenant`, `getEmployeesByTenant`) for this cross-tenant
aggregation, rather than `state.*`. This preserves their exact Phase 1 behaviour — Phase
1's `initialState` was itself seeded from these same static arrays, so the data is
identical — without requiring new cross-tenant Server Actions. A real "all tenants I have
access to" query (and a DB-backed exco rollup) is out of scope for this phase, same as
`useTenants()` (see [`tenants.md`](./tenants.md#usetenants--still-static-on-purpose)).
