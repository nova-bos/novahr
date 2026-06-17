# Phase 1 + 2 UAT Checklist

Everything below must pass before moving to Phase 3 (landing page, pricing, domain).

Test using the demo personas at **http://localhost:3000/login**:

| Persona | Role | Password |
|---|---|---|
| Lerato Dlamini | HR Admin | `hr123` |
| Thabo Nkosi | Manager | `manager123` |
| Aisha Patel | Employee | `employee123` |
| Michael van der Berg | Exco | `exco123` |

---

## Phase 1 — Auth & Accounts

### Login

- [ ] Clicking "Lerato Dlamini" on the persona picker logs in and redirects to `/dashboard`
- [ ] Clicking "Thabo Nkosi" logs in as a Manager — correct dashboard loads
- [ ] Clicking "Aisha Patel" logs in as an Employee — correct (limited) dashboard loads
- [ ] Clicking "Michael van der Berg" logs in as Exco — cross-tenant dashboard loads
- [ ] Wrong password on the email/password form shows an error message (don't crash)
- [ ] Empty email or password on the form shows a validation message (don't crash)

### Session persistence

- [ ] After signing in, refresh the page — still signed in, dashboard still loads
- [ ] Close the tab and reopen http://localhost:3000 — redirected to dashboard, not login
- [ ] Open a private/incognito window — redirected to `/login` (no leaked session)

### Logout

- [ ] Clicking "Sign out" (sidebar or profile menu) logs out and redirects to `/login`
- [ ] After logout, pressing browser Back does not return to the dashboard

### Forgot password

- [ ] `/forgot-password` — entering a registered email and submitting shows a success message (no crash)
- [ ] Entering a non-existent email still shows the success message (security: don't confirm if email exists)
- [ ] Entering an invalid email format shows a validation error

### Reset password

- [ ] `/reset-password` — entering a new password and confirming it shows success and redirects to login
- [ ] Mismatched passwords show a validation error before submitting

### Signup — new company

- [ ] `/signup` — filling in company name + email + password and submitting creates a new account
- [ ] After signup, landing on `/dashboard` shows an **empty** dashboard (no employees, no leave, no payroll) — this is correct for a brand-new company
- [ ] The new company's name appears correctly in the sidebar/topbar
- [ ] Signing up with an already-registered email shows an error (don't crash)
- [ ] Signing up with mismatched passwords shows a validation error

### Role-based access control

- [ ] Signed in as **Employee (Aisha)** — navigating to `/tenants` redirects away (no access)
- [ ] Signed in as **Manager (Thabo)** — the "Add employee" button is not visible
- [ ] Signed in as **HR (Lerato)** — full navigation is visible (employees, leave, payroll, reports, settings)
- [ ] Signed in as **Exco (Michael)** — the tenants overview page loads with all 3 companies

---

## Phase 2 — Data Layer

### Dashboard loads with real data

- [ ] Sign in as Lerato — employee count on the dashboard matches NovaTech's 14 employees
- [ ] Activity feed shows recent events (not empty)
- [ ] Upcoming payroll card shows a scheduled run

### Employee directory

- [ ] `/employees` — the full list of NovaTech employees loads (14 employees)
- [ ] Search/filter by name works and narrows the list
- [ ] Clicking an employee opens their profile page with correct details
- [ ] Status badges (Active, On Leave, Probation) display correctly
- [ ] Sign in as **Thabo (Manager)** — only his direct reports + himself are visible (scoped view)
- [ ] Sign in as **Aisha (Employee)** — only her own profile is visible

### Add employee

- [ ] HR Admin: click "Add employee" → complete the 4-step wizard → click "Create employee"
- [ ] The new employee appears in the directory immediately (no page refresh needed)
- [ ] **Refresh the page** — the new employee is still there (persisted to database)
- [ ] The activity feed shows a "joined as [title]" entry for the new hire
- [ ] A notification appears in the notifications bell
- [ ] Submitting with required fields missing shows validation errors on the correct step
- [ ] The new employee's leave balances are pre-set (annual: 18, sick: 10, unpaid: 5, family: 3)

### Edit employee

- [ ] HR Admin: open an employee profile → click "Edit" → change job title → save
- [ ] The updated title shows on the profile immediately
- [ ] **Refresh the page** — the updated title persists
- [ ] Changing salary figures updates correctly (test with a pension % change)

### Onboarding

- [ ] Find a probation employee (Sarah Williams or Yusuf Cassim) → view their profile
- [ ] Tick an incomplete onboarding step → progress bar updates
- [ ] **Refresh the page** — the ticked step is still ticked
- [ ] Tick all remaining steps on a probation employee → status changes to "Active" and a graduation activity entry appears

### Leave — submitting a request

- [ ] Sign in as **Aisha (Employee)** → go to Leave → click "Request leave"
- [ ] Fill in dates and reason → submit
- [ ] The request appears in the leave list with status "Pending"
- [ ] **Refresh the page** — the request is still there
- [ ] A notification appears in the bell (awaiting approval)
- [ ] Trying to submit with no dates or 0 days shows a validation error

### Leave — approving / rejecting

- [ ] Sign in as **Lerato (HR)** → go to Leave → find Aisha's pending request
- [ ] Click "Approve" → status changes to "Approved" immediately
- [ ] **Refresh the page** — status is still "Approved"
- [ ] Sign in back as **Aisha** → her annual leave balance "Used" count has increased by the approved days
- [ ] Repeat the test with "Reject" — balance does NOT change when rejected
- [ ] A decision note can be added when rejecting and it saves correctly

### Payroll — run flow

- [ ] Sign in as **Lerato (HR)** → go to Payroll
- [ ] Find the scheduled run (current or next month) → click "Start run" → status changes to "Processing"
- [ ] Click "Finalize payroll" → status changes to "Completed", totals (gross, PAYE, UIF, net) appear
- [ ] The payroll history table now shows the completed run
- [ ] **Refresh the page** — the completed run persists with correct totals
- [ ] A "Payslips published" notification appears in the bell
- [ ] An activity entry "processed payroll for [Month Year]" appears in the feed
- [ ] A new scheduled run for the following month is automatically created

### Payslips

- [ ] After completing a payroll run, click on the run → individual payslips are listed
- [ ] Click a payslip → the payslip dialog opens with employee name, earnings, deductions, net pay
- [ ] Sign in as **Aisha (Employee)** → her payslip appears under "My Payslips"
- [ ] Payslip maths check: gross pay − total deductions = net pay (verify with one payslip)

### Notifications

- [ ] The bell icon shows the unread count badge
- [ ] Clicking a notification marks it as read and the badge count decreases
- [ ] "Mark all as read" clears the badge entirely
- [ ] **Refresh the page** — read notifications stay read (persisted)

### Multi-tenant (Exco view)

- [ ] Sign in as **Michael (Exco)** → the tenants page shows all 3 companies with employee counts
- [ ] Click on "Apex Financial Group" → its employee count and payroll summary are visible
- [ ] Click on "Horizon Logistics" → same

### Data isolation between tenants

- [ ] Sign in as Lerato (NovaTech) → go to Employees — only NovaTech's 14 employees are visible
- [ ] No Apex or Horizon employees appear anywhere in NovaTech's views
- [ ] The activity feed contains only NovaTech events

---

## Edge Cases

- [ ] **Slow connection simulation**: open Chrome DevTools → Network → set throttle to "Slow 3G" → sign in — loading states appear (spinner/skeleton) and the app doesn't crash or show blank screens
- [ ] **Direct URL access while logged out**: navigate to `http://localhost:3000/employees` without being signed in → redirected to `/login`
- [ ] **Direct URL access with wrong role**: sign in as Aisha (Employee) → navigate to `/tenants` directly → redirected away
- [ ] **404 page**: navigate to `http://localhost:3000/does-not-exist` → a not-found page appears (doesn't crash)
- [ ] **New signup isolation**: create a new company via `/signup` → its dashboard is empty and shows none of the seeded demo companies' data

---

## Sign-off

- [ ] All items above checked
- [ ] No console errors on any tested page (open DevTools → Console while testing)
- [ ] No broken/white pages on any route

**Ready for Phase 3** (landing page, pricing, domain) once all boxes are ticked.
