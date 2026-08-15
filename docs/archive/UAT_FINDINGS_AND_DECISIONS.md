# NovaHR UAT - Findings, Decisions & Open Items

Running log kept during the two-week UAT (started July 2026). Captures bugs found and fixed, product decisions taken, and gaps still to build. The live checklist lives in `docs/uat-checklist.html`.

## Environment

- Production app: https://novahr-five.vercel.app (UAT runs directly against production; no staging).
- Every fix is deployed to production immediately (`vercel --prod`).
- Test emails use Gmail `+alias` addresses that all deliver to the account owner's inbox.
- Rotate the Resend API key after UAT.

## Bugs found and fixed

| Ref | Severity | Issue | Fix | Status |
|-----|----------|-------|-----|--------|
| 0.3 | High | CSP blocked the payslip PDF web worker (`blob:` URL); `worker-src` fell back to `script-src` | Added `worker-src 'self' blob:` in `next.config.ts` | Fixed + deployed |
| Login UX | High | Raw "Failed to fetch (…supabase.co)" shown on wrong login | Added `friendlyAuthError()` mapper across login, signup, forgot/reset password | Fixed + deployed |
| Login UX | Medium | Rate-limit and "check your email" messages shown as alarming red | Added tone-aware `FormAlert` + `authMessageTone()`; warnings are amber, errors red | Fixed + deployed |
| 0.10 | Low | No Open Graph / Twitter meta tags; link previews are bare | Not yet fixed | Open |
| A1.2 | High | Email confirmation link redirected to `http://localhost:3000` | Set `emailRedirectTo` from live domain via `getAppUrl()`; also needs Supabase Site URL fix (dashboard) | Code fixed; dashboard pending |
| A3.1 | High | Invite links used an empty `NEXT_PUBLIC_APP_URL`, producing broken relative URLs | `getAppUrl()` derives the URL from request headers | Fixed + deployed |
| Infra | Critical | Supabase project auto-paused (free tier), whole backend unreachable (NXDOMAIN) | User restored the project | Resolved; see "Must do before launch" |

## Product decisions taken

- **Company sign-up wording:** "Create your company" changed to "Sign your company up" everywhere.
- **No casual abbreviations** in user-facing copy (e.g. "org" -> "organisation"). South African English. Standard acronyms (HR, PAYE, UIF, SDL, EMP201, POPIA, EEA, NetCash) are fine.
- **Live password rules + confirm field** on sign-up and invite acceptance (8+ chars, upper and lower, a number).
- **Google sign-up** keeps the "Continue with Google" button; it routes new users through `/signup/complete` to capture the company name. The Terms/Privacy/DPA agreement is now captured there too (was previously skipped on the Google path).
- **Job title at sign-up:** the first user's title is no longer defaulted to "HR Administrator". Email sign-up asks for an optional job title; Google sign-up leaves it blank to be set later in Settings. Their access role is still HR admin.
- **Bulk onboarding CSV** hardened to capture all 32 onboarding fields (matching the manual wizard), with a proper quoted-field parser, header-based column mapping, SA ID/phone/bank validation, and manager linking by email.
- **Self-service account deletion** added (Settings > Account > Danger zone), HR-only, with a type-the-company-name confirmation. Deletes the tenant (cascade) and the Supabase auth identities. This is the POPIA right-to-deletion path.
- **Readable tenant IDs:** new companies get an id like `nimbus-digital-8x3k9d2a` (slug + random suffix) instead of a raw cuid. Existing tenants keep their ids.
- **Benefits model reworked (all done):** the default is now no company pension and no medical aid (SME that just wants payroll). The old hardcoded 7.5% pension default is gone. Two company toggles (`offersPension`, `offersMedicalAid`, both default off) live at Settings > Payroll > Benefits offered and gate whether those fields appear during onboarding and editing. A per-employee **retirement annuity** field is always available (personal RA processed through payroll) and shares the s11F retirement cap with any pension. The **medical tax credit now applies to private scheme members** (a medical scheme name on the payroll profile counts as membership) even with no payroll contribution. Retirement annuity is recorded on salary-change history. All backward-compatible: 120/120 lib tests pass, existing payroll results unchanged.
  - UAT: Nimbus runs with benefits OFF (the default case); Cornerstone turns both ON. New "Benefits: Pension, Medical Aid & Retirement Annuity" phase (BEN.1 to BEN.14) in the tracker.

## Must do before onboarding a real client (infrastructure / policy)

1. **Supabase plan:** move off the free tier so the project does not auto-pause after inactivity. A quiet weekend currently takes the whole system offline.
2. **Supabase Auth URL configuration:** set Site URL to `https://novahr-five.vercel.app` and add it (with `/**`) to the redirect allow-list, so confirmation and reset links resolve correctly.
3. **Rotate the Resend API key** shared in plain text during setup.

## Product decisions taken during UAT (2026-07-20)

- **Theme toggle removed from app navbar.** Kept on login, signup, and marketing pages. Users who want to change theme do so once via Settings → Appearance. Default is system (already set in next-themes config).
- **Payslip Studio redesign queued (post-UAT build item).** The current 4 templates (Classic, Modern, Corporate, Branded) need to be replaced with 4 genuinely distinct, print-quality designs. Additionally, the studio should offer individual property controls independent of the template: logo alignment (left/centre/right), body font family, header font, font size scale, and column layout — so users can mix and match without being locked into a template's full style. This is a significant build item; defer until after UAT is complete.

## Gaps still to build (account lifecycle & billing)

These are described in the legal pages (Terms, Refund Policy, Subscription Terms) but are NOT implemented in code. Tracked in the UAT app under "Account Lifecycle & Billing".

1. **Tenant status (active / suspended / cancelled).** Requires a schema migration to add a `status` field plus `suspendedAt` / `cancelledAt`. Deferred during UAT to avoid a live-database migration mid-testing.
2. **Suspension enforcement wall.** When a tenant is suspended, block app access with a "reactivate" screen while retaining data (mirrors the TrialGate lock screen, which already exists for trial expiry).
3. **Billing + payment provider.** No payment integration exists yet. Needed before any real dunning can happen.
4. **Automated dunning.** Per the legal policy: interest on overdue amounts, suspend at 14 days overdue (after notice), treat as cancelled at 90 days, then open a data Export Window. All of this needs the payment provider and a scheduled job. Until built, non-payment does nothing automatically.
5. **Data Export Window.** A self-service full-data export for cancelled accounts (also supports POPIA data portability).

### Current answer to "what happens if a customer does not pay for a few months?"

Nothing automatic. They keep full access. The suspension/cancellation policy in the legal pages is not yet enforced by the software. This is a launch blocker for the billing story and should be built before charging customers.

## Scenario C: Multi-role invite and role-based views

Goal: verify that the invite flow works end-to-end and that each role sees exactly the right content, nothing more and nothing less.

### C.0 - Remaining employees to onboard first (Nimbus Digital)

Before testing roles, finish onboarding these employees so they have records to link users to:

| Ref | Name | Role | Employment |
|-----|------|------|------------|
| A2.2 | Dev Pillay | Developer | Full-time |
| A2.3 | Ayanda Zulu | Designer | Full-time |
| A2.4 | Nokuthula Sithole | HR | Full-time |
| A2.5 | Sipho Ndlovu | Sales | Full-time |
| A2.6 | Zanele Mokoena | Manager | Full-time |
| A2.7 | Kagiso Molefe | Executive | Full-time |

### C.1 - Invite setup

Since the Resend API key is not yet active in production, every invite will show a copyable link instead of sending an email. Copy each link and open it in a private/incognito browser window.

Use Gmail + address aliases so all emails land in your inbox:

| Test user | Email alias | System role | Link to employee |
|-----------|-------------|-------------|------------------|
| Employee view | `mtshwenewesley+emp@gmail.com` | Employee | Dev Pillay or Sipho Ndlovu |
| Manager view | `mtshwenewesley+mgr@gmail.com` | Manager | Zanele Mokoena |
| HR view | already exists (Thandi Mthembu) | HR Admin | (Thandi Mthembu) |
| Exco view | `mtshwenewesley+exco@gmail.com` | Executive | Kagiso Molefe |

**Steps:**
1. Sign in as Thandi (HR role).
2. Go to Settings > Users and invitations.
3. Click "Invite user".
4. Fill in name, email alias, role, and link to the matching employee record from the dropdown.
5. The dialog will show a copyable link (no email configured yet). Copy it.
6. Open an incognito window, paste the link, set a password, and complete sign-in.
7. Verify the nav and dashboard for that role (see test cases below).
8. Repeat for each role.

### C.2 - Employee role test cases

Sign in as the employee-role user (e.g., `+emp@gmail.com`). Check each item:

**Navigation**
- [ ] Sidebar shows: Dashboard, My Profile, My Payslips, Leave (4 items only)
- [ ] No Employees directory, no Payroll run list, no Compliance, no Reports, no Settings

**Dashboard**
- [ ] Shows a personal welcome message with the employee's name
- [ ] Shows personal leave balance summary
- [ ] Does not show company-wide payroll totals or headcount

**My Profile**
- [ ] Opens the correct employee record (the one linked at invite time)
- [ ] Shows personal details, compensation, leave tabs
- [ ] Compensation tab shows salary but no "Edit" or "Terminate" button
- [ ] Cannot edit job title, department, or salary fields

**My Payslips**
- [ ] Shows only their own payslips (not other employees')
- [ ] Can download individual payslips as PDF

**Leave**
- [ ] Can submit a new leave request
- [ ] Can see own leave requests and their status
- [ ] Cannot see other employees' leave requests
- [ ] Cannot approve or decline requests

**Access control**
- [ ] Navigating directly to `/employees` redirects to their own profile (not the directory)
- [ ] Navigating directly to `/settings` is blocked
- [ ] Navigating directly to `/payroll` redirects to their payslips view

### C.3 - Manager role test cases

Sign in as the manager-role user (e.g., `+mgr@gmail.com`).

**Navigation**
- [ ] Sidebar shows: Dashboard, My Team, My Payslips, My Profile, Leave (5 items only)
- [ ] No Payroll run list, no Compliance, no Settings, no Reports

**Dashboard**
- [ ] Shows personal welcome message plus a team summary section

**My Team**
- [ ] Shows the employee directory scoped to their direct reports only (not all employees)
- [ ] Cannot see employee salary details in the directory listing
- [ ] Clicking an employee opens their profile (read-only, no edit/terminate buttons)

**My Payslips**
- [ ] Shows only their own payslips

**My Profile**
- [ ] Opens the correct linked employee record
- [ ] Cannot edit role, salary, or status fields

**Leave**
- [ ] Can see all pending leave requests from their direct reports
- [ ] Can approve and decline those requests
- [ ] Cannot see leave requests from employees outside their team
- [ ] Their own requests are visible and they can submit new ones

**Access control**
- [ ] Navigating directly to `/settings` is blocked
- [ ] Navigating directly to `/compliance` is blocked
- [ ] Navigating directly to `/reports` is blocked

### C.4 - HR Administrator role test cases

Sign in as Thandi Mthembu (the original HR user).

**Navigation**
- [ ] Sidebar shows all items: Dashboard, Employees, Payroll, Compliance, Leave, Deductions, Reports, Billing, Settings

**Employees**
- [ ] Shows full directory with all employees from Nimbus Digital
- [ ] Can open any employee profile
- [ ] Edit button is visible on each profile
- [ ] Compensation tab shows salary details
- [ ] Danger zone (Terminate) is visible on active employees

**Payroll**
- [ ] Can see all payroll runs
- [ ] Can initiate a new payroll run
- [ ] Can view and download any employee's payslip

**Settings**
- [ ] Can access all settings tabs: General, Payroll, Benefits, Appearance, Users, Audit log
- [ ] Invite user button is visible
- [ ] Can revoke pending invitations

**Compliance**
- [ ] EMP201 panel shows tax period data
- [ ] Year-end tab shows IRP5/EMP501 section

**Leave**
- [ ] Sees all leave requests across the whole company
- [ ] Can approve and decline requests from any employee
- [ ] Can view the leave calendar

**Reports**
- [ ] Workforce, Payroll, Leave, Equity tabs are all accessible
- [ ] CSV export buttons work

### C.5 - Executive (exco) role test cases

Sign in as the exco-role user (e.g., `+exco@gmail.com`).

**Navigation**
- [ ] Sidebar shows: Dashboard, Reports, Compliance (3 items only)
- [ ] No Employees, no Payroll run list, no Leave management, no Settings

**Dashboard**
- [ ] Shows company-wide executive summary (headcount, payroll total, leave stats)
- [ ] Does not show individual employee records

**Reports**
- [ ] All report tabs are accessible and read-only (Workforce, Payroll, Leave, Equity)
- [ ] CSV exports work
- [ ] Cannot modify any data from the reports view

**Compliance**
- [ ] EMP201 data is visible
- [ ] IRP5/EMP501 year-end data is visible
- [ ] No "generate" or "mark submitted" buttons (those are HR actions)

**Access control**
- [ ] Navigating directly to `/employees` is blocked or shows a "no access" screen
- [ ] Navigating directly to `/settings` is blocked
- [ ] Navigating directly to `/payroll` (run list) is blocked
- [ ] Navigating directly to `/leave` is blocked

## What already works

- **Trial expiry** is enforced: `TrialGate` shows a countdown in the final week and a full lock screen (with a link to billing) once the 14-day trial ends. Data is retained.
