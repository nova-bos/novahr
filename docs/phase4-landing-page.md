# Phase 4: Public Marketing Landing Page

## Overview

The root route (`/`) is now a fully public marketing landing page. Authenticated users are redirected to `/dashboard` via a server-side Supabase session check. The `(app)` group's `AuthGuard` in `src/app/(app)/layout.tsx` continues to protect all application routes independently.

---

## Architecture

### Server-side auth check (`src/app/page.tsx`)

`LandingPage` is an `async` Server Component. It calls `createClient()` from `src/lib/supabase/server`, checks `supabase.auth.getUser()`, and redirects authenticated users to `/dashboard` before rendering any HTML. Unauthenticated visitors receive the full landing page.

### Marketing component directory (`src/components/marketing/`)

All marketing-specific UI lives here, separate from app UI under `src/components/`:

| File | Type | Purpose |
|------|------|---------|
| `marketing-nav.tsx` | Client Component | Sticky top nav with scroll-triggered border/shadow |
| `hero.tsx` | Server Component | Above-the-fold hero section |
| `features-section.tsx` | Server Component | 6-feature grid with icons |
| `pricing-section.tsx` | Server Component | Two-tier pricing cards |
| `marketing-footer.tsx` | Server Component | Footer with nav links |

### Pricing data module (`src/lib/marketing/pricing.ts`)

This module is the **single source of truth** for all tier configuration. It has no React or Next.js imports and is fully testable in a Node environment.

```
PRICING_TIERS  →  PricingSection (renders cards)
             →  pricing.test.ts (unit tests)
```

Helper functions exported:

- `getMonthlyPrice(tierId)`, returns `monthlyPrice` for the given tier, throws on unknown id
- `getAnnualPrice(tierId)`, returns `monthlyPrice * 12`
- `tierFitsEmployeeCount(tierId, count)`, true if `count <= tier.maxEmployees`
- `suggestTier(employeeCount)`, returns the first tier id where `maxEmployees >= employeeCount`, or `null` if none fits

---

## Adding or changing pricing

### Change a price

Edit the `monthlyPrice` field on the relevant object in `PRICING_TIERS`. The pricing section renders dynamically, no other files need changing.

### Add a new tier

1. Add `"enterprise"` (or any new literal) to `PricingTier["id"]` union.
2. Add a new object to `PRICING_TIERS`.
3. Add corresponding test cases to `src/lib/marketing/pricing.test.ts`.

### Change feature copy

Edit the `features` array on the tier object in `PRICING_TIERS`. The `PricingSection` renders the list dynamically.

---

## Route protection model

```
/                → public; server-side redirect to /dashboard if session exists
/login           → public (AuthProvider handles unauthenticated state)
/signup          → public
/dashboard       → protected by AuthGuard in src/app/(app)/layout.tsx
/employees/...   → protected by AuthGuard
/payroll/...     → protected by AuthGuard
(all (app) routes) → protected by AuthGuard
```

`src/middleware.ts` passes all routes through without restriction. Route protection is handled exclusively by `AuthGuard` inside the `(app)` group layout.

---

## Tests

New tests: `src/lib/marketing/pricing.test.ts` (12 test cases).

Run all tests:

```bash
npx vitest run
```
