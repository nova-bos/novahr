# Tenants — loading the signed-in user's company

NovaHR is multi-tenant: every signed-in user belongs to exactly one `Tenant` (company), via
`AppUser.tenantId`. The UI needs that `Tenant` record (name, branding color, pay day,
currency, etc.) almost everywhere — sidebar, topbar, dashboards, settings, onboarding.

Before Phase 1, `tenantId` just indexed into a static in-memory array of 3 demo tenants
(`src/lib/data/tenants.ts`). Phase 1 added a DB-backed `currentTenant`, loaded via a
standalone `getTenantById(id)` Server Action. Phase 2 folds that into the broader
`getTenantWorkspace(tenantId)` call — `currentTenant` is now just one of 8 fields that
action returns alongside `employees`, `departments`, `leaveRequests`, `payrollRuns`,
`payslips`, `activity`, and `notifications`, all loaded together in one round trip for
*any* tenant, including brand-new signups that have no employee/leave/payroll data yet. See
[`data-layer.md`](./data-layer.md) for the full read/write architecture.

## `getTenantWorkspace(tenantId)` (`src/lib/workspace/actions.ts`)

```ts
"use server";

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
  // ...8 Promise.all'd Prisma queries scoped to tenantId, mapped via src/lib/workspace/mappers.ts
}
```

`mapTenant` (in `src/lib/workspace/mappers.ts`) does the same field-by-field mapping that
Phase 1's `getTenantById` did. `getTenantWorkspace` returns `null` only if the tenant row
itself doesn't exist (shouldn't happen for a signed-in user, mirrors Phase 1's
null-safety). This **replaced** `src/lib/tenants/actions.ts` (`getTenantById`), which was
deleted — `getTenantWorkspace` is a strict superset and the only caller.

## Wiring into `AppProvider` (`src/lib/store/app-provider.tsx`)

`AppState` carries `currentTenant` alongside the other 7 workspace arrays:

```ts
export interface AppState {
  tenantId: string;
  currentTenant: Tenant | null;
  employees: Employee[];
  departments: Department[];
  leaveRequests: LeaveRequest[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  activity: ActivityItem[];
  notifications: NotificationItem[];
}
```

and a single reducer action loads all of it atomically:

```ts
| { type: "SET_WORKSPACE"; workspace: TenantWorkspace | null }
```

```ts
case "SET_WORKSPACE":
  if (!action.workspace) return { ...state, currentTenant: null };
  return { ...state, ...action.workspace };
```

`AppProvider` fetches the workspace whenever `tenantId` changes:

```ts
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  React.useEffect(() => {
    let active = true;
    getTenantWorkspace(state.tenantId).then((workspace) => {
      if (active) dispatch({ type: "SET_WORKSPACE", workspace });
    });
    return () => {
      active = false;
    };
  }, [state.tenantId]);

  // ...
}
```

- `initialState.tenantId` defaults to `"novatech"`, with `currentTenant: null` and all 7
  data arrays empty — so on first render nothing has loaded yet, while the fetch resolves.
- The `active` flag guards against a race: if `tenantId` changes again (e.g.
  `setTenant("apex")` right after `setTenant("novatech")`) before the first fetch resolves,
  the stale result is dropped instead of overwriting the newer one.
- `SET_TENANT` (changing `tenantId`, e.g. via the exco tenant switcher) resets
  `currentTenant` and all 7 data arrays to empty, so `tenantReady` (below) goes back to
  `false` and the UI doesn't show the previous tenant's data while the new workspace loads.

## `AuthGuard` — gating render on `tenantReady` (`src/components/layout/auth-guard.tsx`)

```tsx
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { state, setTenant } = useApp();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  React.useEffect(() => {
    if (user && state.tenantId !== user.tenantId) {
      setTenant(user.tenantId);
    }
  }, [user, state.tenantId, setTenant]);

  const tenantReady = state.currentTenant?.id === user?.tenantId;

  if (isLoading || !user || !tenantReady) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading NovaHR...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

This component wraps the whole `(app)` route group and does three jobs:

1. **Auth redirect** — once `isLoading` is `false` and there's no `user`, redirect to
   `/login`.
2. **Sync `tenantId` to the signed-in user** — `AppProvider`'s `initialState.tenantId` is
   hardcoded to `"novatech"` (so the demo tenant renders correctly without waiting for
   auth). Once the real `user` is known, this effect calls `setTenant(user.tenantId)` so
   `AppProvider` fetches *that* tenant's workspace instead.
3. **`tenantReady` gate** — `state.currentTenant?.id === user?.tenantId` is only `true`
   once `AppProvider`'s workspace-loading effect (above) has resolved **for the current
   user's tenant** (not e.g. the default `"novatech"` if the user belongs to a different
   tenant). While any of `isLoading`, `!user`, or `!tenantReady` hold, `AuthGuard` shows a
   loading spinner instead of rendering `children`.

This means every component under `AuthGuard` can call `useCurrentTenant()` (below) — and
now also `useEmployees()`, `useLeaveRequests()`, etc. (see
[`data-layer.md`](./data-layer.md)) — and get guaranteed-loaded data: no consumer needs its
own loading/null state.

## `useCurrentTenant()` (`src/lib/store/hooks.ts`)

```ts
export function useCurrentTenant(): Tenant {
  const tenant = useApp().state.currentTenant;
  if (!tenant) throw new Error("currentTenant accessed before it finished loading");
  return tenant;
}
```

Returns `state.currentTenant` as a non-null `Tenant`. The `throw` is a programming-error
guard, not a real runtime path — `AuthGuard`'s `tenantReady` check means `currentTenant` is
always populated by the time any child component renders. This is the hook ~10 components
(settings, tenant profile, dashboard header, topbar, onboarding wizard, leave approvals,
etc.) already used before Phase 1 — its signature didn't change, only where the data comes
from.

### `useTenants()` — still static, on purpose

```ts
export function useTenants(): Tenant[] {
  return tenants; // from src/lib/data/tenants.ts
}
```

This still returns the static 3-tenant array. It's only used by the **exco tenant
switcher** (the "Michael" demo persona can view all 3 demo companies). New signups are
always `role: "hr"` for a single tenant and never call this. Migrating it to a real
"all tenants I have access to" query is out of scope for this phase.

## Why two different "tenant" sources?

| | Source | Used for |
| --- | --- | --- |
| `useCurrentTenant()` | Postgres, via `getTenantWorkspace().currentTenant` | The signed-in user's own company — name, branding, settings, pay config. Works for **any** tenant, including brand-new signups. |
| `useTenants()` | Static array (`src/lib/data/tenants.ts`) | The exco demo persona's 3-company switcher only. |

As of Phase 2, `useEmployees()`, `useDepartments()`, `useLeaveRequests()`,
`usePayrollRuns()`, `useActivity()`, and `useNotifications()` are **also DB-backed** — they
read `state.employees` etc., populated by the same `getTenantWorkspace()` call and already
scoped to the signed-in user's tenant. For a new signup with no seeded data, these return
empty arrays, same as before, so dashboards render empty states rather than crashing. The
**exco dashboard** and the `/tenants` page are the exception: they need *group-wide* data
across all 3 tenants, which `state.*` no longer provides (it's single-tenant), so they read
directly from the static `src/lib/data/*` arrays instead — see
[`data-layer.md`](./data-layer.md#cross-tenant-views-exco-dashboard--tenants-page).

`getPayrollConfig(tenantId)` (used by `usePayrollConfig()`) is the one remaining
"works for any tenant, falls back to a default" exception — see
[`database.md`](./database.md#whats-not-in-the-database-yet) for its fallback behaviour.
