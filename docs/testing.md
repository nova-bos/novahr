# Testing

This documents the Vitest test suite added alongside the Phase 1 + Phase 2 work: how to
run it, what it covers, and the patterns used so a new test follows the same conventions.

```bash
npm test
```

This runs `vitest run` (see `package.json`'s `test` script), a single non-watch pass over
every `*.test.ts` file under `src/`. As of the MVP polish pass that's **21 files / 163 tests**,
all pure unit tests (no real database, no Supabase, no browser):

```
 Test Files  21 passed (21)
      Tests  163 passed (163)
```

Use `npx vitest` (no `run`) for watch mode while developing, or
`npx vitest run path/to/file.test.ts` to run a single file.

## E2E golden journeys (Playwright)

```bash
npm run test:e2e
```

Runs `e2e/golden-journeys.spec.ts`: the five golden journeys from
`docs/TESTING_ROADMAP.md` as one serial chain (signup and company setup,
departments and first employee, manager invite and acceptance, leave lifecycle
including unpaid leave, payroll run with bank export, security probes).

Operational notes:

- Expects a dev server on localhost:3000 (Playwright starts one if absent).
- The suite talks to the SAME Supabase project as production. It creates one
  disposable tenant (`E2E Test Co <runId>`) through the real UI and global
  teardown cascade-deletes the tenant and its `mtshwenewesley+e2e-*@gmail.com`
  auth users, including leftovers from crashed runs.
- Each run sends one Supabase confirmation email to the +e2e- address; add a
  Gmail filter on `+e2e-` to archive them.
- Artifacts (traces, screenshots, report) go to `/tmp/novahr-e2e`, deliberately
  outside the repo: files written into the project tree trigger the Next.js
  dev watcher, which Fast-Refresh-reloads the pages mid-test.
- Repeated runs within an hour can trip the in-memory signup/login rate
  limiters; restarting the dev server resets them.

## `vitest.config.ts`

```ts
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".claude"],
  },
});
```

Two things matter here for anyone adding new tests:

- **`resolve.alias`** mirrors the `@/*` path alias from `tsconfig.json`, so test files can
  `import { prisma } from "@/lib/prisma"` (or mock that path with `vi.mock`) exactly like
  application code does.
- **`oxc.jsx.runtime: "automatic"`** is required because some test files (e.g.
  `src/lib/store/app-provider.test.ts`) import from `.tsx` modules
  (`src/lib/store/app-provider.tsx`) for their non-component exports (`reducer`,
  `initialState`, types). Vitest's oxc-based transform needs to know how to parse the JSX
  in those files even though the tests never render anything. **This must be the object
  form** (`{ jsx: { runtime: "automatic" } }`), passing a bare string here fails to parse
  `.tsx` files.
- **`environment: "node"`**, there's no DOM/jsdom setup, because nothing here renders
  React components. Every test either calls a plain function, a Server Action (with Prisma
  mocked), or the `reducer` function directly.

## Test inventory

| File | Tests | What it covers |
| --- | --- | --- |
| `src/demo/activity.test.ts` | 3 | `getActivityByTenant`, ordering/filtering of the static activity feed |
| `src/demo/departments.test.ts` | 2 | `getDepartmentsByTenant` |
| `src/demo/employees.test.ts` | 8 | `defaultLeaveBalances`, `onboardingPlan`, `getEmployeesByTenant`, `getEmployee` |
| `src/demo/leave.test.ts` | 4 | `getLeaveRequestsByTenant`, `getLeaveRequestsByEmployee` |
| `src/demo/notifications.test.ts` | 2 | `getNotificationsByTenant` |
| `src/demo/payroll.test.ts` | 9 | payroll run/payslip generation helpers in `src/demo/payroll.ts` |
| `src/demo/tenants.test.ts` | 2 | static tenant lookup helpers |
| `src/lib/config/payroll.test.ts` | 2 | `getPayrollConfig`, known tenant config and fallback defaults |
| `src/lib/employees/actions.test.ts` | 8 | `createEmployeeRecord`, `updateEmployeeRecord`, `toggleOnboardingStepRecord` (Server Actions, mocked Prisma) |
| `src/lib/employees/factory.test.ts` | 11 | `createEmployee`, `newOnboardingPlan` |
| `src/lib/format.test.ts` | 29 | every formatter in `src/lib/format.ts` (currency, dates, labels, relative time, ordinals, masking) |
| `src/lib/leave/actions.test.ts` | 5 | `createLeaveRequestRecord`, `decideLeaveRequestRecord` (Server Actions, mocked Prisma) |
| `src/lib/marketing/pricing.test.ts` | 12 | `getMonthlyPrice`, `getAnnualPrice`, `tierFitsEmployeeCount`, `suggestTier` in `src/lib/marketing/pricing.ts` |
| `src/lib/tenant/actions.test.ts` | 6 | `updateTenantProfile`, `updateTenantPayrollSettings` (Server Actions, mocked Prisma) |
| `src/lib/notifications/actions.test.ts` | 2 | `markNotificationReadRecord`, `markAllNotificationsReadRecord` (Server Actions, mocked Prisma) |
| `src/lib/payroll/actions.test.ts` | 3 | `startPayrollRunRecord`, `completePayrollRunRecord` (Server Actions, mocked Prisma) |
| `src/lib/payroll/calculator.test.ts` | 8 | `calculateMonthlyPayroll`, `buildPayslip`, `incrementPeriod` (PAYE/UIF math) |
| `src/lib/payroll/print.test.ts` | 11 | `buildPayslipHtml`: HTML output contains correct employee data, currency values, and DOCTYPE |
| `src/lib/store/app-provider.test.ts` | 16 | the `reducer` function, every `AppState` action type |
| `src/lib/workspace/actions.test.ts` | 2 | `getTenantWorkspace` (Server Action, mocked Prisma) |
| `src/lib/workspace/mappers.test.ts` | 18 | every Prisma-row → app-type mapper in `src/lib/workspace/mappers.ts`, plus the date helpers |

These fall into four patterns, described below. New tests should follow whichever pattern
matches the code being tested.

## Pattern 1, static data validation (`src/demo/*.test.ts`)

These test the static demo-data modules under `src/demo/` (used for the seeded demo dataset
and for cross-tenant views, see
[`data-layer.md`](./data-layer.md#cross-tenant-views-exco-dashboard--tenants-page)). No
mocking is needed, they import the real arrays and helper functions and assert on shape,
filtering, and ordering. Example, from `src/demo/employees.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getEmployee, getEmployeesByTenant } from "@/demo/employees";

describe("getEmployeesByTenant", () => {
  it("returns an empty array for an unknown tenant", () => {
    expect(getEmployeesByTenant("does-not-exist")).toEqual([]);
  });
});
```

## Pattern 2, pure functions (mappers, factories, formatters, payroll math)

`src/lib/workspace/mappers.test.ts`, `src/lib/employees/factory.test.ts`,
`src/lib/format.test.ts`, `src/lib/payroll/calculator.test.ts`,
`src/lib/payroll/print.test.ts`, and `src/lib/marketing/pricing.test.ts` test plain
functions with
literal input objects and no mocking. `format.test.ts` additionally uses
`vi.useFakeTimers()` / `vi.setSystemTime()` to pin "now" for `formatRelativeTime`:

```ts
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});
```

`mappers.test.ts` is the most relevant one for Phase 2 handover, it exercises
`toDateOnly`, `toTimestamp`, `parseTimestamp`, and all 8 row→app-type mappers
(`mapTenant`, `mapEmployee`, `mapDepartment`, `mapLeaveRequest`, `mapPayslip`,
`mapPayrollRun`, `mapActivityItem`, `mapNotificationItem`) described in
[`data-layer.md`](./data-layer.md), using hand-written Prisma-row-shaped literals as input.

## Pattern 3, the `AppProvider` reducer (`src/lib/store/app-provider.test.ts`)

`app-provider.tsx` is a `.tsx` file (it exports a React context provider), but its
`reducer` and `initialState` exports are plain, framework-free, `reducer(state, action)`
in, `AppState` out. The test imports those directly and never renders anything.

Because `app-provider.tsx` transitively imports the Server Action files (which import
`@/lib/prisma`), the test mocks Prisma at the top so importing the module doesn't try to
construct a real Prisma client:

```ts
vi.mock("@/lib/prisma", () => ({ prisma: {}, default: {} }));

import { initialState, reducer, type AppState } from "./app-provider";
```

The mock is never *called*, `reducer` doesn't touch Prisma, it just needs to exist so the
module graph resolves. The file then has its own small set of local fixture builders
(`makeTenant`, `makeEmployee`, `makeActivity`, etc., separate from
`src/lib/workspace/test-fixtures.ts`, which builds Prisma-row shapes, not app-state shapes)
and one `describe` block per action type: `SET_TENANT`, `SET_WORKSPACE`,
`EMPLOYEE_ADDED`, `EMPLOYEE_UPDATED`, `ONBOARDING_STEP_TOGGLED`, `LEAVE_REQUEST_ADDED`,
`LEAVE_REQUEST_DECIDED`, `PAYROLL_RUN_STARTED`, `PAYROLL_RUN_COMPLETED`,
`NOTIFICATION_READ`, `ALL_NOTIFICATIONS_READ`, i.e. every case in the reducer documented
in [`data-layer.md`](./data-layer.md).

## Pattern 4: Server Actions with mocked Prisma

This is the pattern for the 5 action files under `src/lib/{workspace,employees,leave,payroll,notifications}/actions.test.ts`
(20 tests total). Each follows the same shape:

1. **`vi.hoisted()`** builds the mock Prisma client *before* any imports run (Vitest hoists
   `vi.mock` calls to the top of the file, so the factory passed to `vi.mock` can only
   reference values created via `vi.hoisted`).
2. **`vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }))`** replaces the real Prisma
   client everywhere `@/lib/prisma` is imported, including inside the action file under
   test.
3. The action file is imported *after* the mock is registered.
4. **The shared-`tx`-reference pattern**: for actions that use `prisma.$transaction(cb)`,
   the mock's `$transaction` is `vi.fn((cb) => cb(tx))` where `tx` is the *same object*
   referenced by the top-level mock's model methods. This means
   `mockPrisma.employee.create.mockResolvedValue(...)` (set up in the test) and
   `tx.employee.create(...)` (called by the action inside `$transaction`) are the exact
   same mock function, no separate transaction-client mock to keep in sync.

Full example, from `src/lib/notifications/actions.test.ts` (the simplest case, no
transaction at all):

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  notificationItem: { update: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { markAllNotificationsReadRecord, markNotificationReadRecord } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markNotificationReadRecord", () => {
  it("marks the given notification as read", async () => {
    mockPrisma.notificationItem.update.mockResolvedValue({});

    await markNotificationReadRecord("notif-1");

    expect(mockPrisma.notificationItem.update).toHaveBeenCalledWith({
      where: { id: "notif-1" },
      data: { read: true },
    });
  });
});
```

The shared-`tx`-reference version, from `src/lib/employees/actions.test.ts`:

```ts
const mockPrisma = vi.hoisted(() => {
  const tx = {
    employee: { create: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
    activityItem: { create: vi.fn() },
    notificationItem: { create: vi.fn() },
  };
  return { ...tx, $transaction: vi.fn((cb: (t: typeof tx) => unknown) => cb(tx)) };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { createEmployeeRecord, toggleOnboardingStepRecord, updateEmployeeRecord } from "./actions";
```

`src/lib/payroll/actions.test.ts` and `src/lib/leave/actions.test.ts` extend this further:
the mock's top-level model methods include *both* the transactional methods (shared with
`tx`) and read-only methods used outside the transaction (e.g. `payrollRun.findUniqueOrThrow`,
`tenant.findUniqueOrThrow`, `employee.findMany`), since those actions read data before
opening the transaction.

Every action test file calls `vi.clearAllMocks()` in `beforeEach` so mock call counts and
return values don't leak between tests.

### `src/lib/workspace/test-fixtures.ts`

Shared fixture builders, imported by `employees/actions.test.ts`, `payroll/actions.test.ts`,
and `workspace/actions.test.ts`:

- **`makeEmployeeRow(overrides?)`**, a full `EmployeeWithBalances` (Prisma `Employee` row +
  `leaveBalances`), with all flattened `salary*`/`bank*`/`emergencyContact*` columns and 4
  default leave balances (annual/sick/unpaid/family). Use this wherever a test needs
  "what Prisma returns" for an employee.
- **`makeTenantRow(overrides?)`**, a full Prisma `Tenant` row (NovaTech Solutions by
  default).
- **`makeEmployee(overrides?)`**, the app-shape `Employee` (nested `salary`/`bankDetails`/
  `emergencyContact`/`leaveBalances`), for tests that need "what the client passes in" (e.g.
  the input to `createEmployeeRecord`).

Tests for new Server Actions on `Employee`/`Tenant` rows should reuse these builders with
`overrides` rather than writing new literals, keeps row shapes consistent with the schema
in [`database.md`](./database.md) as it evolves.

Action-test files that need row shapes *not* covered by `test-fixtures.ts` (e.g.
`Department`, `LeaveRequest`, `PayrollRun`, `Payslip`, `ActivityItem`, `NotificationItem`
rows) define their own small local `makeXRow(overrides?)` helpers at the top of the file,
following the same `{ ...defaults, ...overrides }` shape, see
`src/lib/workspace/actions.test.ts`, `src/lib/leave/actions.test.ts`, and
`src/lib/payroll/actions.test.ts` for examples.

## Adding new tests

- **New demo-data helper** → Pattern 1 (`src/demo/*.test.ts`).
- **New pure function/mapper/pricing utility** → Pattern 2, no mocking.
- **New reducer action** → Pattern 3; add a `describe` block to `app-provider.test.ts` with
  a fixture builder if one doesn't already exist for that record type.
- **New Server Action that touches Prisma** → Pattern 4. Put the test next to the action
  file as `actions.test.ts`, reuse `src/lib/workspace/test-fixtures.ts` for `Employee`/
  `Tenant` rows, and use the shared-`tx`-reference pattern if the action uses
  `$transaction`.

No test currently touches a real database, Supabase, or the network, everything in this
suite is fast (the whole run takes ~1 second) and safe to run without any `.env` setup.
