# NovaHR UI/UX Overhaul Audit

Date: 2026-07-28
Scope: Landing page + full app (HR / manager / employee / exco), light + dark, desktop + mobile.
Method: Static sweep of all marketing + shell + primitive components, plus a live Playwright
capture pass against `localhost:3000` (landing, login, dashboard, employees, leave, payroll,
reports, compliance, settings) in light and dark at 1440px and 390px.

## Verdict

The foundations are strong and should be kept. NovaHR uses a proper semantic design-token
system (oklch tokens, real `--success` / `--warning` / `--info` / `--destructive`), well-built
shadcn primitives (the `Button`, `Dialog`, `Sidebar` are high quality), real store data on every
dashboard, and a genuinely excellent dark mode. This is **not** a heavily AI-slopped app and does
**not** need a rebuild.

What it needs is **targeted cleanup** in four areas:

1. Authenticity on the landing page (fake dashboard numbers, one overstated claim).
2. Decorative gradient/glow "blobs" on the marketing + auth surfaces.
3. A handful of off-token colours (one genuinely broken in dark mode).
4. A few functional polish items (full-screen loading gate, minor a11y, demo-cred hygiene).

Everything below is grouped by priority. Nothing here changes the data model, routing, or business
logic.

---

## A. Landing page authenticity (highest priority: "must look ready to launch")

### A1. Fake company dashboard in the hero  [must fix]
`src/components/marketing/hero.tsx` renders a mock "NovaTech Solutions" product card with invented
numbers: **14 employees, R 2.4M monthly payroll, next pay Jul 25**, plus a `MOCK_ACTIVITY` feed
("Lerato approved 5 days annual leave", "Payroll processed for June 2026").

This is exactly the demo/fake-metric content to remove. Options, in order of preference:
- Replace with a **real, cropped screenshot** of the actual product (we already capture these to
  `marketing/shots-dark/`), shown in a browser/frame. Authentic and sells the product better.
- Or keep a schematic card but strip all numbers and label it clearly as illustrative (weaker).
- Delete the `MOCK_ACTIVITY` const and the whole mock panel either way.

### A2. Overstated product claim  [must fix]
`src/components/marketing/features-section.tsx`, "Multi-Company" card:
> "Manage multiple subsidiaries from a single Exco login with **consolidated reporting**."

Per the current build, the Exco view is an honest single-tenant read-only view; there is a tenant
**switcher**, but there is no cross-tenant **consolidated reporting**. Reword to what is true, e.g.
"Switch between companies from one executive login" and drop "consolidated reporting" until it
exists.

### A3. Copy consistency  [minor]
Hero trust row says "Free to start"; pricing footer says "14-day free trial. No credit card
required." Pick one message. Also "POPIA ready" / "SA payroll compliant" are fine claims but should
stay as capability statements, not certifications.

### A4. No fabricated social proof  [good, keep it that way]
Confirmed: there are currently **no** fake reviews, testimonials, partner logos, customer counts,
or "+2B processed" style metrics anywhere. Do not add any. This is the one thing already right.

---

## B. AI-slop visual decoration (gradient / glow "blobs")

The app body is clean. The slop is concentrated on marketing + auth. The rule the user gave:
gradients are fine only when they serve a purpose.

### B1. Hero background glows  [fix]
`hero.tsx` lines 16-20: three stacked `blur-[120px]/[80px]/[100px]` primary-tinted circles. Remove,
or reduce to a single very subtle top glow. Purely decorative.

### B2. Auth branding panel  [tone down]
`src/components/auth/auth-shell.tsx`: multiple `radial-gradient(...)` layers (opacity 0.45-0.5),
two `blur-3xl` circles on the form panel, plus two decorative SVG "wave" paths. In dark mode this
reads as subtle depth (acceptable); in light mode it is more obviously AI-decorative. Recommend:
keep a single flat sidebar-coloured panel with the logo + value props, drop the SVG waves and one of
the gradient layers. Lower the blur count.

### B3. Login branding panel  [tone down]
`src/app/login/page.tsx` lines 108-111: two `blur-[100px]/[80px]` blobs. Same treatment: remove or
reduce to one faint glow.

### B4. Signup blobs  [fix]
`src/app/signup/page.tsx` and `src/app/signup/complete/page.tsx` carry the same blur-blob pattern.
Sweep together with B2/B3 so all auth screens match.

### B5. Dead utility  [cleanup]
`.glass-panel` in `globals.css` (lines 161-163) is defined but used **nowhere**. Delete it so the
glassmorphism pattern cannot creep back in.

---

## C. Colour-token consistency (light/dark parity)

The token system is right; a few components bypass it. Full grep list captured; the material ones:

### C1. Broken in dark mode  [must fix]
`src/components/marketing/contact-section.tsx` line 95: the success message uses
`bg-green-50 border-green-200 text-green-800` with **no dark variant**, so on the dark landing page
it renders as near-white on a dark card. Replace with the existing success token:
`bg-success/10 border-success/20 text-success` (matches the pattern already used elsewhere).

### C2. Off-token but functional  [consistency pass]
~14 files use raw `amber-*/emerald-*/sky-*/teal-*` with `dark:` variants. They render acceptably in
both modes but sidestep the `warning`/`success`/`info` tokens, so status colours drift between
screens. Consolidate onto tokens:
- `components/ui/form-alert.tsx` (red/amber/emerald -> destructive/warning/success)
- `components/payroll/payroll-run-detail.tsx` (amber sign-off banner + `bg-amber-600` button)
- `components/leave/leave-day-picker.tsx` and `leave-calendar.tsx` (amber/emerald/sky legend dots)
- `components/employees/import-employees-dialog.tsx`, `profile-compensation.tsx`
- `components/settings/netcash-settings.tsx`, `components/payroll/netcash-panel.tsx`
- `components/auth/password-checklist.tsx`, `app/signup/page.tsx`, `app/accept-invite/[token]/page.tsx`
Note: `env-banner.tsx` and `uat-panel.tsx` are dev-only chrome; lower priority, but tokenise for
tidiness.

### C3. Payslip preview canvas  [optional]
`components/settings/payslip-studio.tsx` uses `bg-neutral-100` to simulate white payslip paper.
This is arguably intentional (a payslip is printed on white), but swap to a dedicated token/value so
it is deliberate rather than a stray Tailwind colour.

---

## D. Functional / UX polish

### D1. Full-screen loading gate  [review]
On app load (and on any full page load) the whole app is blocked behind a centred
"Loading NovaHR..." spinner while the client store/auth hydrates. It is clean but heavy; every hard
navigation flashes it. Consider a lightweight skeleton of the shell (sidebar + topbar visible,
content skeleton) instead of a blank full-screen gate, so the product feels instant. Confirm
client-side `Link` navigation does **not** remount the store (my capture used hard `goto`, which
does).

### D2. Demo credentials in the production client bundle  [security-slop, fix]
`src/lib/auth/demo-users.ts` exports `demoUsers` with **plaintext passwords** (`hr123`,
`employee123`, ...). `login/page.tsx` imports it unconditionally and references `demoUsers[0]` in
initial state, so even though the picker is hidden in prod (`SHOW_DEMO_ACCOUNTS`), the array is not
tree-shaken and ships in the production JS bundle. These are seed accounts on the shared Supabase, so
it is low severity, but it is exactly the kind of thing an audit flags. Fix: guard the import/usage
so nothing from `demo-users` is referenced when `NEXT_PUBLIC_APP_ENV === "production"` (e.g. lazy
`import()` inside the dev-only branch, or move the picker into a separate dev-only component).

### D3. `target="_blank"` without `rel="noopener"`  [minor a11y/security]
2 occurrences. Add `rel="noopener noreferrer"` (reverse-tabnabbing hygiene).

### D4. Dev/marketing chrome gating  [verify]
`WhatsAppButton`, `uat-panel.tsx`, `env-banner.tsx` are visible in this build. Confirm the UAT panel
and env banner are gated to non-production, and decide whether the floating WhatsApp button belongs
on the launched marketing site (fine to keep, just a deliberate choice).

---

## E. What is already good (do not touch)

- Design tokens, radius scale, and dark mode: excellent, keep.
- `Button`, `Dialog`, `Sidebar`, `Card` primitives: high quality, consistent sizing (`h-9` default,
  `size-4` icons). No emoji, no decorative animations, no over-rounding, no random heavy shadows in
  the app body (shadows are confined to chart tooltips + the hero mock).
- Dashboards (HR/manager/employee/exco) render **real store data**, not fabricated metrics.
- Employees table, Leave page, and Compliance are clean, dense, and professional in both themes.
- Spacing and hierarchy via `PageHeader` + `flex-col gap-6` is consistent across pages.

---

## Suggested implementation order

1. **Landing authenticity** (A1 fake dashboard, A2 claim, A3 copy) - the launch-blocker.
2. **Auth + hero de-slop** (B1-B5) - one focused pass across hero + all auth screens.
3. **Dark-mode break + token pass** (C1 first, then C2/C3).
4. **Polish** (D1 loading, D2 demo creds, D3 rel, D4 gating).

Each group is independent and can ship as its own commit. No migrations, no business-logic changes.
