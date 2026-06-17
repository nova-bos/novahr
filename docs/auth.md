# Auth — Supabase Auth wiring

NovaHR uses **Supabase Auth** (email/password) with sessions stored in cookies via
`@supabase/ssr`, so the session survives page refreshes and is visible to both the browser
and the server (Server Components, Server Actions, middleware).

## The three Supabase clients

Supabase needs a slightly different client depending on where the code runs. NovaHR has
one helper for each:

### `src/lib/supabase/client.ts` — browser

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

Used in **client components** (`"use client"`) — e.g. `AuthProvider`, `/login`,
`/forgot-password`, `/reset-password`. Reads/writes the session via browser cookies
automatically. Uses the public **anon key**, safe to ship to the browser.

### `src/lib/supabase/server.ts` — server

```ts
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component - middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
```

Used in **Server Actions** and **Server Components** — e.g.
`getCurrentUserProfile()`, `createCompanyAccount`. `cookies()` from `next/headers` is
**async** in Next.js 15, hence `await cookies()` and the `async` function. The `setAll`
`try/catch` exists because Server *Components* (as opposed to Server Actions/Route
Handlers) aren't allowed to set cookies — if `getCurrentUserProfile()` is ever called from
one and Supabase tries to refresh the session, the write is silently dropped there and
picked up by the middleware on the next request instead.

### `src/middleware.ts` — middleware

```ts
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Runs on (almost) every request. `supabase.auth.getUser()` validates the session token and,
if it's expired, transparently refreshes it — writing the new cookies onto both the
incoming request and the outgoing response. Without this, a long-lived browser session
would eventually start failing server-side calls once the access token expires, even though
the browser client would have refreshed it on its own.

The `matcher` excludes static assets (`_next/static`, images, etc.) — no need to run auth
refresh logic for those.

**Route protection itself is not done here** — it's handled client-side by `AuthGuard`
(see [`tenants.md`](./tenants.md)), which redirects to `/login` if there's no `user`.

## `AuthProvider` / `useAuth()` (`src/lib/auth/auth-provider.tsx`)

This is the app-wide source of truth for "who is signed in", wrapping the whole `(app)`
route group. Its public shape (`user`, `isLoading`, `login`, `logout`, `refresh`) is
consumed by ~15 components (`AuthGuard`, `useRoleGuard`, sidebar, topbar, dashboards, etc.)
and was kept stable across the move from the old localStorage demo to real Supabase
sessions, so none of those consumers needed to change.

```ts
interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

### How `user` gets populated

1. On mount, `AuthProvider` subscribes to `supabase.auth.onAuthStateChange`.
2. Supabase's browser client fires this callback immediately with the current session (if
   any exist in cookies), and again on every sign-in/sign-out/token-refresh.
3. If there's **no session**, `user` is set to `null` and `isLoading` becomes `false` —
   `AuthGuard` then redirects to `/login`.
4. If there **is** a session, the callback calls the server action
   `getCurrentUserProfile()` (see below) to load the `User` row from Postgres, and stores
   the result (an `AppUser`, or `null` if the row doesn't exist yet) in `user`.

### `login(email, password)`

```ts
const login = React.useCallback(
  async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;

    const profile = await getCurrentUserProfile();
    setUser(profile);
    return null;
  },
  [supabase],
);
```

Returns **`string | null`**: an error message (e.g. "Invalid login credentials") on
failure, or `null` on success. `/login`'s submit handler awaits this and either shows the
error inline or lets `AuthGuard` redirect to `/dashboard` once `user` is set.

### `logout()`

Calls `supabase.auth.signOut()` and clears `user` locally. `AuthGuard` reacts to `user`
becoming `null` and redirects to `/login` — no extra redirect logic needed here.

### `refresh()`

```ts
const refresh = React.useCallback(async () => {
  const profile = await getCurrentUserProfile();
  setUser(profile);
  setIsLoading(false);
}, []);
```

Re-runs `getCurrentUserProfile()` and updates `user` **without** going through
`onAuthStateChange`. This is needed after a **Server Action** changes the session/profile
out-of-band — e.g. `createCompanyAccount` (used by `/signup`) calls `supabase.auth.signUp()`
*server-side*, which sets session cookies, but doesn't fire the *browser* client's
`onAuthStateChange`. The signup page calls `refresh()` immediately after the server action
resolves so `AuthProvider` picks up the new session without a full page reload. See
[`auth-pages.md`](./auth-pages.md).

## `getCurrentUserProfile()` (`src/lib/auth/actions.ts`)

```ts
"use server";

export async function getCurrentUserProfile(): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const profile = await prisma.user.findUnique({ where: { id: data.user.id } });
  if (!profile) return null;

  return {
    id: profile.id,
    role: profile.role,
    name: profile.name,
    title: profile.title,
    email: profile.email,
    tenantId: profile.tenantId,
    employeeId: profile.employeeId ?? undefined,
    avatarColor: profile.avatarColor,
    initials: profile.initials,
  };
}
```

A Server Action (note the `"use server"` directive) that bridges **Supabase Auth** (which
only knows about `auth.users` — id, email, password) and **NovaHR's domain data** (the
`User` table — name, role, tenant, avatar, etc.):

1. `supabase.auth.getUser()` — validates the session and returns the Supabase
   `auth.users` row (just `id`, `email`, etc.), or an error if there's no session.
2. `prisma.user.findUnique({ where: { id: data.user.id } })` — looks up the matching
   `User` row by id (`User.id` *is* `auth.users.id` — see [`database.md`](./database.md)).
3. Maps the Prisma `User` to the `AppUser` shape the rest of the app expects.

Returns `null` if there's no session **or** no matching `User` row yet — the latter can
briefly happen mid-signup, which `/signup` handles explicitly (see
[`auth-pages.md`](./auth-pages.md)).

## `AppUser` / `ROLE_LABELS` (`src/lib/auth/types.ts`)

```ts
export type UserRole = "employee" | "manager" | "hr" | "exco";

export interface AppUser {
  id: string;
  role: UserRole;
  name: string;
  title: string;
  email: string;
  tenantId: string;
  employeeId?: string;
  avatarColor: string;
  initials: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  employee: "Employee",
  manager: "Manager",
  hr: "HR Administrator",
  exco: "Executive Committee",
};
```

`AppUser` replaces the old demo-only `DemoUser` type (it no longer carries a `password`).
`ROLE_LABELS` is unchanged from before — used by the UI to display a human-readable role
name (e.g. in the sidebar/topbar).
