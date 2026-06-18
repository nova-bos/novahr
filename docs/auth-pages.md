# Auth pages, signup, login, forgot/reset password

Four standalone pages (outside the `(app)` route group, so they're **not** wrapped by
`AuthGuard`) handle account creation and credential recovery. `/login` and `/signup` build
on the persona-picker UI that already existed; `/forgot-password` and `/reset-password` are
new.

| Page | Purpose |
| --- | --- |
| `src/app/login/page.tsx` | Sign in (persona picker or any real account) |
| `src/app/signup/page.tsx` + `actions.ts` | "Create your company", new tenant + first HR user |
| `src/app/forgot-password/page.tsx` | Request a password-reset email |
| `src/app/reset-password/page.tsx` | Set a new password from the reset-email link |
| `src/components/auth/auth-shell.tsx` | Shared two-panel layout for signup/forgot/reset |

## `AuthShell` (`src/components/auth/auth-shell.tsx`)

```tsx
export function AuthShell({
  heading,
  description,
  children,
}: {
  heading: string;
  description: string;
  children: React.ReactNode;
}) {
  // ...
}
```

A shared two-panel layout: a branding panel on the left (with `heading`/`description`,
collapsing to a top banner on mobile) and `children` rendered in a centered card on the
right. `/signup`, `/forgot-password`, and `/reset-password` all use this. `/login` keeps
its own richer version of the same visual structure because it also needs the persona-picker
grid and feature list, duplicating the layout there was simpler than parameterizing
`AuthShell` further for a single caller.

## `/login` (`src/app/login/page.tsx`)

Two things happen on this page: the **persona picker** (unchanged from the original demo,
still reads `demoUsers` from `src/lib/auth/demo-users.ts` for display data) and the
**sign-in form**, which now calls real Supabase Auth via `useAuth()`.

```tsx
const { user, isLoading, login } = useAuth();

React.useEffect(() => {
  if (!isLoading && user) {
    router.replace("/dashboard");
  }
}, [isLoading, user, router]);

async function handleSubmit(event: React.FormEvent) {
  event.preventDefault();
  setError("");
  setSubmitting(true);

  const message = await login(email, password);
  if (message) {
    setError(message);
    setSubmitting(false);
    return;
  }

  router.push("/dashboard");
}

if (isLoading || user) {
  return null;
}
```

- **"Already signed in" guard**: while `isLoading` is `true`, or once `user` is set, the
  page renders `null` and a `useEffect` redirects to `/dashboard`. This prevents a flash of
  the login form for someone who's already authenticated (e.g. they hit the browser "back"
  button).
- **`selectPersona(id)`** pre-fills the email/password inputs from `demoUsers` when a
  persona card is clicked, purely a UX convenience; it doesn't sign anyone in by itself.
- **`handleSubmit`** calls `login(email, password)` from `AuthProvider` (see
  [`auth.md`](./auth.md)), which returns an error message or `null`. On success, `user`
  becomes non-null (set inside `login` itself) and the redirect effect above fires.
- Added in Phase 1: a **"Forgot password?"** link next to the password label (→
  `/forgot-password`), and a **"New to NovaHR? Create your company"** link (→ `/signup`)
  below the form. The submit button shows "Signing in..." and is disabled while
  `submitting`.

## `/signup` (`src/app/signup/page.tsx` + `actions.ts`)

### The form (`page.tsx`)

Collects `companyName`, `yourName`, `email`, `password` (with show/hide toggle, 8-char
minimum) and calls the `createCompanyAccount` Server Action on submit:

```tsx
const result = await createCompanyAccount({ companyName, yourName, email, password });

if (result.status === "error") {
  setError(result.message);
  setSubmitting(false);
  return;
}

if (result.status === "check-email") {
  setCheckEmail(true);
  setSubmitting(false);
  return;
}

await refresh();
router.push("/dashboard");
```

Three branches on `result.status`:

- **`"error"`**, shown inline above the submit button (e.g. validation failure, or "an
  account with this email already exists").
- **`"check-email"`**: Supabase has email confirmation enabled, so there's no session yet.
  The page swaps to a "Check your email" view (still inside `AuthShell`) with a link to
  `/login`.
- **default (success)**, a session *was* created server-side. The page calls
  `await refresh()` (from `useAuth()`) so `AuthProvider` picks up the new session, see
  ["why `refresh()`?"](./auth.md#refresh), then `router.push("/dashboard")`.

Same "already authenticated" guard pattern as `/login` (`if (isLoading || user) return
null`, redirect via `useEffect`).

### `createCompanyAccount` (`actions.ts`)

```ts
const signupSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  yourName: z.string().min(2, "Your name is required"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateCompanyResult =
  | { status: "success" }
  | { status: "check-email" }
  | { status: "error"; message: string };

export async function createCompanyAccount(input: SignupInput): Promise<CreateCompanyResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { companyName, yourName, email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { status: "error", message: error.message };
  }
  if (!data.user) {
    return { status: "error", message: "Couldn't create your account. Please try again." };
  }
  if (data.user.identities && data.user.identities.length === 0) {
    return {
      status: "error",
      message: "An account with this email already exists. Try signing in instead.",
    };
  }

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        legalName: companyName,
        initials: deriveInitials(companyName),
        industry: "General",
        color: "#4C6FFF",
        founded: String(new Date().getFullYear()),
        registrationNumber: "",
        vatNumber: "",
        address: "",
        city: "",
        bankName: "",
        primaryContact: yourName,
      },
    });

    await tx.user.create({
      data: {
        id: data.user!.id,
        tenantId: tenant.id,
        email,
        name: yourName,
        title: "HR Administrator",
        role: "hr",
        avatarColor: "#4C6FFF",
        initials: deriveInitials(yourName),
      },
    });
  });

  return data.session ? { status: "success" } : { status: "check-email" };
}
```

Step by step:

1. **Validate** with Zod. `z.email(...)` is the Zod v4 top-level email validator.
2. **`supabase.auth.signUp({ email, password })`**, creates the Supabase `auth.users` row.
   If `error`, return it as-is (e.g. "Password should be at least 6 characters" from
   Supabase's own rules, weak-password checks, etc.).
3. **Existing-account check**: Supabase deliberately returns *success* with
   `data.user.identities: []` (not an error) when the email already belongs to an account -
   this prevents account enumeration via error messages. The code detects this case
   explicitly and turns it into a friendly error, **before** creating any `Tenant`/`User`
   rows.
4. **`prisma.$transaction`**, creates the `Tenant` and the first `User` atomically. If
   either insert fails, neither is committed (no orphaned tenant with no admin user, or vice
   versa).
   - `Tenant` fields not collected at signup (`registrationNumber`, `vatNumber`, `address`,
     `city`, `bankName`, etc.) get empty-string placeholders, editable later from
     **Settings → Company**. `industry: "General"`, `color: "#4C6FFF"`,
     `founded: <current year>` are reasonable defaults; `currency`/`payFrequency`/`payDay`
     use the schema defaults (`ZAR`/`monthly`/`25`).
   - `User.id = data.user.id`, this is the critical link to Supabase Auth (see
     [`auth.md`](./auth.md#getcurrentuserprofile-srclibauthactionsts)). `role: "hr"`, the
     person who signs up is always the first admin.
   - `deriveInitials("Acme Co")` → `"AC"`, `deriveInitials("Jane")` → `"JA"`, used for
     avatar fallbacks.
5. **Return value**: if `data.session` exists (email confirmation is **off**, the
   recommended setting for this pilot, see [`README.md`](./README.md)), signup is
   immediately "logged in" → `{ status: "success" }`. If email confirmation is **on**,
   `signUp` returns no session → `{ status: "check-email" }`, and the user must click the
   confirmation link before `/login` will work for them.

## `/forgot-password` (`src/app/forgot-password/page.tsx`)

```tsx
const supabase = createClient();
const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});
```

Single email field. Calls `resetPasswordForEmail` directly from the **browser** Supabase
client (no server action needed, this doesn't touch Prisma at all). On success (or even on
"no such account": Supabase doesn't reveal which, again to avoid enumeration), shows a
"Check your email" panel with a link back to `/login`. The `redirectTo` must be in
Supabase's **Authentication → URL Configuration** allow-list (see
[`README.md`](./README.md#1-create-a-supabase-project)) or the email link will fail.

## `/reset-password` (`src/app/reset-password/page.tsx`)

```tsx
const supabase = createClient();
const { error: updateError } = await supabase.auth.updateUser({ password });
```

New-password + confirm-password fields (client-side "passwords don't match" check before
calling Supabase). Calls `updateUser({ password })` directly on page load's client -
**no separate "verify recovery token" step is needed** because:

- The reset-email link is `https://.../reset-password#access_token=...&type=recovery&...`.
- `createBrowserClient` (used by `src/lib/supabase/client.ts`) defaults to
  `detectSessionInUrl: true` and `flowType: "pkce"`, when the page loads, the Supabase JS
  client automatically detects and exchanges the recovery token in the URL, establishing a
  temporary **recovery session**.
- Every `supabase.auth.*` method (including `updateUser`) internally awaits an
  `initializePromise` that resolves only after this auto-exchange completes, so by the
  time `handleSubmit` runs (after the user types a password and clicks submit), the
  recovery session is guaranteed to be ready. No manual "wait for session" code is needed.

On success, shows an "All set" panel linking to `/login`.
