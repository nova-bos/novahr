# Phase 4: Public Marketing Landing Page

Phase complete. See docs/APP_OVERVIEW.md for the current state of the product.

The root route (`/`) is a fully public marketing landing page. Authenticated users are redirected to `/dashboard` via a server-side session check. All marketing components live under `src/components/marketing/`. Pricing data is the single source of truth in `src/lib/marketing/pricing.ts`. The `(app)` group's auth guard in `src/app/(app)/layout.tsx` continues to protect all application routes independently.
