# NovaHR Pre-Launch UAT Checklist

Complete every item below before launch. Tick each box as you go. Any item that fails gets a bug report and a fix before you re-test it.

**Rule:** After every data-changing action, refresh the page and confirm the change persisted. This catches silent failures and optimistic-update bugs.

---

## Test credentials (live app: novahr-five.vercel.app)

| Persona | Role | Email | Password |
|---|---|---|---|
| Lerato Dlamini | HR Admin | lerato.dlamini@novatech.co.za | hr123 |
| Thabo Nkosi | Manager | thabo.nkosi@novatech.co.za | manager123 |
| Aisha Patel | Employee | aisha.patel@novatech.co.za | employee123 |
| Michael van der Berg | Executive | michael.vandenberg@novagroup.co.za | exco123 |

Open DevTools (F12) Console tab while testing. Any red error that was not there before your action is a bug.

---

## Section 1: Authentication and Access Control

### 1.1 Login

- [ ] Navigate to the app URL while logged out. Confirm you land on `/login`, not the dashboard.
- [ ] Click the "Lerato Dlamini" persona card on the login page. Confirm it pre-fills the email field.
- [ ] Submit with the correct password. Confirm redirect to `/dashboard` and the HR dashboard loads.
- [ ] Log out. Try logging in with the correct email but a wrong password. Expect: error message, no redirect.
- [ ] Try submitting the login form with a blank email. Expect: validation error, form does not submit.
- [ ] Try submitting with a blank password. Expect: validation error, form does not submit.
- [ ] Try submitting with a malformed email (`notanemail`). Expect: validation error.
- [ ] Log in as Thabo (Manager). Confirm the manager dashboard loads, not the HR dashboard.
- [ ] Log in as Aisha (Employee). Confirm the employee dashboard loads with limited nav.
- [ ] Log in as Michael (Exco). Confirm the tenants/exco dashboard loads.

### 1.2 Session persistence

- [ ] Log in as Lerato. Refresh the page. Confirm you remain logged in and on the dashboard.
- [ ] Log in as Lerato. Close the browser tab. Reopen the app URL. Confirm you are still logged in.
- [ ] Open a private/incognito window and navigate to the app URL. Confirm you see the login page, not the dashboard.
- [ ] Log in on two different browsers simultaneously. Confirm both sessions work independently.

### 1.3 Logout

- [ ] Click "Sign out" in the sidebar or profile menu. Confirm redirect to `/login`.
- [ ] After logout, press the browser Back button. Confirm you do NOT return to the dashboard (stays on login or redirects back to login).
- [ ] After logout, manually type `/dashboard` in the address bar. Confirm redirect to `/login`.

### 1.4 Forgot password

- [ ] Navigate to `/forgot-password`. Enter a registered email (lerato.dlamini@novatech.co.za). Submit. Expect: success message (do not confirm whether email was found -- security).
- [ ] Enter an unregistered email. Submit. Expect: same success message (do not reveal non-existence).
- [ ] Submit with blank email. Expect: validation error, form does not submit.
- [ ] Submit with malformed email. Expect: validation error.

### 1.5 Password reset

- [ ] Follow a real password reset link from email. Confirm the reset form loads at `/reset-password`.
- [ ] Enter a new password, confirm it, and submit. Expect: success message and redirect to `/login`.
- [ ] Enter mismatched passwords. Expect: validation error before submission.
- [ ] Submit a password under minimum length (if enforced). Expect: validation error.
- [ ] Try using an expired or already-used reset link. Expect: error message, not a crash.

### 1.6 Signup (new company)

- [ ] Navigate to `/signup`. Fill in company name, email, password. Submit. Confirm account is created and you reach `/dashboard`.
- [ ] After signup, confirm the getting-started welcome modal appears (first-time only).
- [ ] Confirm the new company name appears in the sidebar and header.
- [ ] Sign up with an email that is already registered. Expect: error message ("email already in use"), no crash.
- [ ] Sign up with mismatched passwords. Expect: validation error before submission.
- [ ] Sign up with a very short password (under 6 characters). Expect: validation error.
- [ ] Leave company name blank. Expect: validation error.
- [ ] Sign up successfully. Log out. Log back in with the same credentials. Confirm the dashboard loads.

### 1.7 Role-based access control

- [ ] Logged in as **Aisha (Employee)**:
  - [ ] Navigate to `/payroll`. Confirm redirect or "access denied", not the payroll page.
  - [ ] Navigate to `/employees`. Confirm you cannot see other employees' profiles.
  - [ ] Navigate to `/compliance`. Confirm redirect or access denied.
  - [ ] Navigate to `/reports`. Confirm redirect or access denied.
  - [ ] Navigate to `/settings`. Confirm redirect or access denied.
  - [ ] Navigate to `/tenants`. Confirm redirect or access denied.
- [ ] Logged in as **Thabo (Manager)**:
  - [ ] Navigate to `/payroll`. Confirm access denied.
  - [ ] Navigate to `/employees`. Confirm only direct reports and self are visible (not all 14 employees).
  - [ ] The "Add employee" button is NOT visible.
  - [ ] Navigate to `/tenants`. Confirm redirect or access denied.
- [ ] Logged in as **Michael (Exco)**:
  - [ ] Navigate to `/employees`. Confirm access limited to read-only or redirected.
  - [ ] Navigate to `/payroll`. Confirm read-only or redirected (Exco does not run payroll).
- [ ] Logged in as **Lerato (HR)**:
  - [ ] Confirm full navigation is visible: Employees, Leave, Payroll, Compliance, Reports, Settings.
  - [ ] Confirm all action buttons (Add employee, Run payroll, Approve leave) are visible and functional.

---

## Section 2: Getting Started and Onboarding

### 2.1 First-time welcome modal

- [ ] Create a brand-new company via `/signup`. On the dashboard, confirm the welcome modal appears.
- [ ] Confirm the modal shows the company name, not a placeholder.
- [ ] Confirm 4 setup steps are listed with links: company profile, add employees, payroll settings, invite team.
- [ ] Click "Let's get started" (or similar CTA). Confirm the modal closes and you are navigated to settings.
- [ ] Sign out. Sign back in. Confirm the welcome modal does NOT appear a second time (stored in localStorage).
- [ ] Click "Skip for now" on the modal. Confirm it closes immediately without navigating away.
- [ ] Clear localStorage for the app domain. Reload. Confirm the welcome modal appears again.

### 2.2 Getting started checklist card (HR dashboard)

- [ ] As a new HR admin with no employees, confirm the getting-started card is visible on the dashboard.
- [ ] Confirm the card shows correct step completion: company profile step is marked complete if legalName is set, else pending.
- [ ] Confirm the departments step shows incomplete for a new account with no departments.
- [ ] Add a department via Settings. Return to dashboard. Confirm the departments step is now marked complete.
- [ ] Add an employee. Return to dashboard. Confirm step 4 (first employee) is now marked complete.
- [ ] Complete a payroll run. Return to dashboard. Confirm step 5 (first payroll) is now marked complete.
- [ ] Complete all 5 steps. Confirm the getting-started card disappears from the dashboard.
- [ ] Confirm a fully set-up account (like the NovaTech demo) shows no getting-started card.

---

## Section 3: Employee Management

### 3.1 Employee directory

- [ ] Log in as Lerato (HR). Navigate to `/employees`. Confirm all 14 NovaTech employees load.
- [ ] Confirm each employee row shows: name, job title, department, status badge, and avatar/initials.
- [ ] Search for "Sarah" by typing in the search box. Confirm the list filters to matching employees.
- [ ] Clear the search. Confirm the full list returns.
- [ ] Filter by department (Engineering, Finance, etc.). Confirm only employees in that department appear.
- [ ] Filter by status (Active, Probation, On Leave, Terminated). Confirm the filter works.
- [ ] Combine a search and a department filter. Confirm both apply simultaneously.
- [ ] Click on any employee row. Confirm the employee profile page opens with correct details.
- [ ] Log in as Thabo (Manager). Navigate to `/employees`. Confirm only his direct reports and himself are listed.
- [ ] Log in as Aisha (Employee). Navigate to `/employees`. Confirm she sees only her own profile or a limited view.

### 3.2 Add employee (manual wizard)

- [ ] As HR (Lerato), click "Add employee". Confirm the multi-step wizard opens.
- [ ] **Step 1 (Personal):** Fill in all required fields and advance. Confirm no error.
- [ ] **Step 1 (Personal):** Leave First Name blank and try to advance. Expect: validation error on that field.
- [ ] **Step 1 (Personal):** Leave Last Name blank and try to advance. Expect: validation error.
- [ ] **Step 1 (Personal):** Enter an invalid email format. Try to advance. Expect: email validation error.
- [ ] **Step 2 (Role):** Select a job title and department. Advance.
- [ ] **Step 2 (Role):** Leave department blank and try to advance. Confirm whether it is required or optional.
- [ ] **Step 3 (Compensation):** Enter annual gross salary. Advance.
- [ ] **Step 3 (Compensation):** Enter 0 or negative salary. Expect: validation error.
- [ ] **Step 3 (Compensation):** Enter a pension contribution percentage above 100. Expect: validation error.
- [ ] **Step 4 (Bank):** Fill in bank details. Advance and submit.
- [ ] After creating the employee, confirm they appear in the directory immediately (no refresh needed).
- [ ] Refresh the page. Confirm the new employee persists in the directory.
- [ ] Confirm an activity item "joined as [title]" appears in the activity feed.
- [ ] Confirm a notification appears in the bell for the new hire.
- [ ] Navigate to the new employee's profile. Confirm their leave balances are pre-seeded (annual, sick, etc.).
- [ ] Navigate back through the wizard steps. Confirm Back button works and preserves previously entered data.

### 3.3 Edit employee

- [ ] As HR, open an employee profile. Click Edit. Change the job title. Save.
- [ ] Confirm the new title shows on the profile immediately.
- [ ] Refresh the page. Confirm the updated title persists.
- [ ] Edit the employee's salary (annual gross). Save and refresh. Confirm the new salary is shown.
- [ ] Add a travel allowance that was previously blank. Save and refresh. Confirm it is stored.
- [ ] Edit the employee's phone number. Save and refresh. Confirm it is updated.
- [ ] Try saving with a required field blanked out. Expect: validation error, no save.
- [ ] Try entering an invalid SA ID number format. Expect: validation error or warning.

### 3.4 CSV bulk import

- [ ] As HR, on the Employees page, confirm the "Import CSV" button is visible.
- [ ] Click "Import CSV". Confirm the import dialog opens.
- [ ] Click "Download template". Confirm a CSV file downloads with correct column headers and one example row.
- [ ] Open the template, fill in 3 employees, save as CSV. Upload it. Confirm the preview shows 3 rows.
- [ ] Click Import. Confirm all 3 employees are imported. Confirm success count shown.
- [ ] Refresh the page. Confirm the 3 new employees appear in the directory.
- [ ] Try uploading a CSV with a missing required field (blank firstName in one row). Expect: that row shows an error, other rows still import.
- [ ] Try uploading a CSV with an invalid email format in one row. Expect: that row errors, others import.
- [ ] Try uploading a CSV with a salary of 0. Expect: validation error on that row.
- [ ] Try uploading an empty CSV (headers only, no data rows). Expect: clear message "no employees to import".
- [ ] Try uploading a file that is not a CSV (e.g., a .txt or .xlsx). Expect: error or graceful rejection.
- [ ] Try uploading a CSV with 50 employees. Confirm all import successfully (no timeout or crash).
- [ ] Try importing an employee with the same email as an existing employee. Expect: that row errors with "email already in use" or similar; other rows still import.
- [ ] Confirm a non-HR user (Manager) does NOT see the "Import CSV" button.

### 3.5 Employee profile: Overview tab

- [ ] Open any employee's profile. Confirm the overview tab shows: name, job title, department, status, employee number, start date, location, manager.
- [ ] Confirm the emergency contact section shows the contact's name, relationship, and phone.
- [ ] Confirm the onboarding checklist appears for probation-status employees.
- [ ] Tick an incomplete onboarding step. Confirm it shows as ticked immediately.
- [ ] Refresh the page. Confirm the ticked step persists.
- [ ] Tick all remaining onboarding steps for a probation employee. Confirm status changes to Active.

### 3.6 Employee profile: Compensation tab

- [ ] Open an employee's Compensation tab. Confirm the salary breakdown is shown: basic, travel, housing, medical aid, pension.
- [ ] Confirm the salary history section shows previous salary changes (if any exist).
- [ ] Confirm the monthly breakdown (gross, deductions, net) is calculated correctly.
- [ ] Open a profile for an employee with a medical aid amount. Confirm the s6A credit is mentioned or visible.

### 3.7 Employee profile: Documents tab

- [ ] Open an employee's Documents tab as HR. Confirm the upload area is visible.
- [ ] Upload a PDF document (e.g., offer letter). Confirm it appears in the list after upload.
- [ ] Refresh the page. Confirm the uploaded document persists.
- [ ] Click the document to open it. Confirm a signed URL opens the file in a new tab (or downloads it).
- [ ] Confirm the document link expires after a short time if you copy-paste the signed URL into a new incognito window minutes later (Supabase signed URLs are temporary).
- [ ] Log in as Aisha (Employee). Navigate to her own profile. Confirm she can view her own documents.
- [ ] Log in as Aisha. Try navigating to a different employee's profile and their documents. Confirm access is denied or the documents are not visible.
- [ ] As HR, delete an uploaded document. Confirm it disappears from the list.
- [ ] Try uploading a file larger than the allowed size (if there is a limit). Expect: clear error, not a crash.

### 3.8 Employee profile: Deductions tab (loans and garnishees)

- [ ] Open an employee's Deductions tab as HR. If no deductions exist, confirm an empty state message.
- [ ] Click "Add deduction". Create a loan: description "Staff loan", amount R6,000, monthly R1,000.
- [ ] Confirm the loan appears in the list with status "Active", balance R6,000.
- [ ] Refresh the page. Confirm the deduction persists.
- [ ] Create a garnishee deduction. Confirm it shows as type "Garnishee" in the list.
- [ ] Click "Cancel" on an active deduction. Confirm status changes to "Cancelled".
- [ ] Try creating a deduction with a monthly amount greater than the total amount. Expect: validation error.
- [ ] Try creating a deduction with amount 0. Expect: validation error.
- [ ] Try creating a deduction with a blank description. Expect: validation error.
- [ ] Run a payroll after adding a loan. Check the employee's payslip. Confirm the loan instalment appears as a deduction on the payslip.
- [ ] Confirm the loan balance decreases after each payroll run by the instalment amount.
- [ ] Run enough payroll cycles to settle the loan. Confirm the deduction status changes to "Settled".
- [ ] Log in as Aisha (Employee). Open her own deductions tab. Confirm she can view her own deductions but NOT add or cancel them.

### 3.9 Employee profile: Equity tab

- [ ] Open an employee's Equity tab as HR. Confirm fields for equity race, gender, occupational level, foreign national, and disability.
- [ ] Select an equity race and gender. Save. Refresh. Confirm the values persist.
- [ ] Leave equity fields blank. Confirm the profile still saves without errors.
- [ ] After setting equity fields on multiple employees, go to Reports > Employment Equity. Confirm those employees appear in the EEA2/EEA4 report.

### 3.10 Employee profile: Privacy tab (POPIA)

- [ ] Open an employee's Privacy tab as HR. Confirm "Export data" and "Erase personal data" buttons are visible.
- [ ] Click "Export data". Confirm a JSON file downloads containing the employee's information.
- [ ] Confirm the exported JSON contains: personal details, salary, leave history, payslips.
- [ ] Click "Erase personal data". Confirm a confirmation dialog appears before action is taken.
- [ ] Confirm that after erasure, the employee record still exists but PII fields are redacted (name replaced with "Redacted", email blanked, etc.).
- [ ] Confirm payslip financial records are NOT deleted after erasure (retained for tax compliance).
- [ ] Log in as Aisha (Employee). Navigate to her own Privacy tab. Confirm she can export her own data.
- [ ] Confirm Aisha cannot see another employee's Privacy tab.
- [ ] Confirm the erase action is restricted to HR only (not visible to Aisha or Thabo).

### 3.11 Terminate employee

- [ ] As HR, open an employee's profile. Find the Terminate option (danger zone or action button).
- [ ] Click Terminate. Confirm a confirmation dialog appears asking for termination reason and date.
- [ ] Confirm the termination and confirm the employee status changes to "Terminated".
- [ ] Refresh the page. Confirm the status is still "Terminated".
- [ ] Confirm the terminated employee no longer appears in the default employee directory listing.
- [ ] Filter the directory by "Terminated" status. Confirm the employee appears.
- [ ] Confirm terminated employees are excluded from the next payroll run (check employee count on the run).

### 3.12 Bank detail validation

- [ ] Open an employee profile as HR. Navigate to the bank details section.
- [ ] Confirm the bank name, account number, branch code, and account type are displayed.
- [ ] Edit bank details and save. Refresh and confirm they persist.
- [ ] Confirm the "Validated" badge appears only after bank account validation (via Netcash when configured).

---

## Section 4: Leave Management

### 4.1 Submit a leave request

- [ ] Log in as Aisha (Employee). Navigate to Leave. Click "Request leave".
- [ ] Select "Annual Leave" as the type. Pick a start and end date (e.g., 3 working days). Enter a reason. Submit.
- [ ] Confirm the request appears in the list with status "Pending".
- [ ] Refresh the page. Confirm the request persists.
- [ ] Confirm a notification appears for the HR admin (switch to Lerato and check the bell).
- [ ] Try submitting a leave request with no dates selected. Expect: validation error.
- [ ] Try submitting with an end date before the start date. Expect: validation error.
- [ ] Try submitting with no reason. Confirm whether reason is required.
- [ ] Try requesting leave for a period that overlaps an existing approved leave. Expect: error or warning.
- [ ] Log in as Thabo (Manager). Submit a leave request for himself. Confirm it works the same way.

### 4.2 Approve and reject leave

- [ ] Log in as Lerato (HR). Navigate to Leave. Find Aisha's pending request.
- [ ] Click "Approve". Confirm the status changes to "Approved" immediately.
- [ ] Refresh the page. Confirm status is still "Approved".
- [ ] Log in as Aisha. Check her annual leave balance. Confirm the "Used" count increased by the approved days.
- [ ] Submit another leave request as Aisha. Log back in as Lerato. Click "Reject". Add a decision note.
- [ ] Confirm the request shows "Rejected" status.
- [ ] Log in as Aisha. Confirm the rejected leave balance did NOT decrease.
- [ ] Confirm the decision note is visible on the rejected request.
- [ ] Try approving a leave request for an employee with insufficient leave balance. Expect: warning or error, or confirmation that it will go negative (depends on implementation).
- [ ] As Thabo (Manager), find a leave request from one of his direct reports. Confirm he can approve/reject it.
- [ ] Confirm Thabo CANNOT approve leave for employees outside his team.

### 4.3 Leave balances

- [ ] Log in as Aisha. Navigate to her Leave or Profile page. Confirm leave balances show: Annual, Sick, Family, Study, Unpaid.
- [ ] Confirm the balance displays: Total allocated, Used, and Remaining correctly.
- [ ] Approve a 2-day leave request for Aisha. Confirm her "Used" increases by 2 and "Remaining" decreases by 2.
- [ ] Reject a 3-day request. Confirm the balance does NOT change.

### 4.4 Leave calendar

- [ ] Navigate to the Leave page. Find the calendar view.
- [ ] Confirm the calendar shows the current month by default.
- [ ] Confirm approved leave requests appear as solid chips/blocks on the correct dates.
- [ ] Confirm pending leave requests appear in a visually distinct style (e.g., dashed outline).
- [ ] Click the Previous/Next month navigation. Confirm the calendar switches months.
- [ ] Confirm employee names or initials appear on the leave chips.
- [ ] If multiple employees have overlapping leave, confirm the "+N more" overflow indicator appears.
- [ ] Click an overflow indicator. Confirm it shows all employees on leave that day.
- [ ] Confirm the calendar legend explains what solid vs. dashed chips mean.
- [ ] Log in as Thabo (Manager). Open the leave calendar. Confirm it shows only his team's leave, not all employees.
- [ ] Log in as Aisha (Employee). Confirm she sees leave requests relevant to her (her own requests, possibly team leave depending on implementation).

---

## Section 5: Payroll

### 5.1 Payroll run flow (no approval required)

- [ ] Log in as Lerato (HR). Navigate to `/payroll`.
- [ ] Find a scheduled payroll run. Confirm it shows status "Scheduled" with the correct period and pay date.
- [ ] Click "Start run" (or Process). Confirm status changes to "Processing".
- [ ] Click "Finalize payroll" (or Complete). Confirm status changes to "Completed".
- [ ] Confirm the run shows totals: Total Gross, Total PAYE, Total UIF, Total Net.
- [ ] Refresh the page. Confirm the completed run and its totals persist.
- [ ] Confirm a "Payslips published" notification appears in the bell.
- [ ] Confirm an activity entry "processed payroll for [Month Year]" appears.
- [ ] Confirm a new scheduled run for the following month is automatically created.
- [ ] Click on the completed run. Confirm individual payslips are listed, one per eligible employee.
- [ ] Verify the maths on one payslip: Gross Pay minus Total Deductions must equal Net Pay.
- [ ] Confirm PAYE is calculated and shown (non-zero for employees above the tax threshold).
- [ ] Confirm UIF is shown (0.01 x gross, capped at the UIF ceiling).
- [ ] Confirm SDL is included if the total annual payroll exceeds R500,000.
- [ ] Confirm terminated employees are NOT included in the run.

### 5.2 Payroll approval workflow

- [ ] Navigate to Settings > Payroll. Enable "Require approval before finalising" and set an approver.
- [ ] Process a payroll run. Confirm status changes to "Awaiting Approval" instead of "Completed".
- [ ] Confirm a notification is sent to the designated approver.
- [ ] Log in as the approver. Confirm an "Approve" button is visible on the pending run.
- [ ] Click Approve. Confirm status changes to "Completed" and payslips are published.
- [ ] Confirm the approver's name and timestamp are recorded on the completed run.
- [ ] Process another run. While awaiting approval, click "Reject". Confirm the run is rejected and can be reprocessed.
- [ ] Disable the approval requirement. Process a run. Confirm it completes immediately without approval.

### 5.3 Payslip viewing

- [ ] From a completed payroll run, click on an individual payslip.
- [ ] Confirm the payslip shows: employee name, ID/tax number, period, pay date, earnings breakdown, deductions breakdown, totals.
- [ ] Confirm Basic Salary is listed as an earning.
- [ ] Confirm travel/housing/medical aid allowances appear if the employee has them.
- [ ] Confirm PAYE, UIF appear in deductions.
- [ ] If the employee has an active loan, confirm the loan instalment appears in deductions.
- [ ] Log in as Aisha (Employee). Navigate to "My Payslips" (dashboard or leave page). Confirm her payslips appear.
- [ ] Confirm Aisha can view her own payslips but NOT another employee's.
- [ ] Log in as Thabo (Manager). Confirm he can see payslips for his direct reports if the feature allows, or confirm payslip access is HR/employee only.

### 5.4 Payslip PDF download

- [ ] Open a payslip dialog. Click "Download payslip".
- [ ] Confirm a PDF opens or downloads -- not a blank page or error.
- [ ] Confirm the PDF shows the company name, employee details, pay period, all line items, and net pay.
- [ ] Confirm the PDF uses the correct payslip template (check Settings > Payslip Studio for current setting).
- [ ] Download a payslip for a different employee. Confirm the correct employee's details appear (not a cached version).
- [ ] Log in as Aisha. Download her own payslip. Confirm it is her correct payslip.

### 5.5 Payslip templates (4 templates)

- [ ] Go to Settings > Payslip Studio. Switch to "Modern" template. Save.
- [ ] Download a payslip. Confirm it uses the modern template visually.
- [ ] Switch to "Corporate" template. Save. Download a payslip. Confirm it reflects the new template.
- [ ] Switch to "Branded" template. Upload a company logo. Set an accent colour. Save.
- [ ] Download a payslip. Confirm the logo and accent colour appear on the PDF.
- [ ] Switch back to "Classic". Download a payslip. Confirm it is the standard classic layout.
- [ ] Confirm the company name on the payslip matches what is set in Settings > Company.
- [ ] Toggle "Show banking details" on/off. Download a payslip. Confirm the bank section appears/disappears accordingly.
- [ ] Toggle "Show year-to-date totals" on/off. Download a payslip. Confirm YTD column appears/disappears.

### 5.6 ETI (Employment Tax Incentive)

- [ ] Confirm that an employee aged 18-29 with a qualifying salary shows an ETI amount on the EMP201 (not zero).
- [ ] Confirm that an employee over 30 does NOT have ETI applied.
- [ ] Confirm the ETI carry-forward: if ETI exceeds the PAYE liability for the month, the excess is carried to the next month (visible on EMP201 as carry-forward).
- [ ] After 24 payroll months for an ETI-qualifying employee, confirm the ETI stops being claimed (24-month limit).

---

## Section 6: Compliance

### 6.1 EMP201

- [ ] Navigate to `/compliance`. Confirm the EMP201 tab/panel is visible.
- [ ] Confirm a period selector is available. Select the most recently completed payroll period.
- [ ] Confirm the EMP201 shows: PAYE total, ETI amount, NET PAYE (PAYE minus ETI), SDL total, UIF total, and Total Payable.
- [ ] Verify: Total Payable = (PAYE - ETI + ETI carry-forward) + SDL + UIF.
- [ ] Confirm the EMP201 matches the totals from the payroll run for that period.
- [ ] If ETI carry-forward is greater than zero, confirm it appears as a line item.
- [ ] Click "Export CSV" on the EMP201. Confirm a CSV file downloads with the correct values.
- [ ] Click "UIF Declaration". Confirm a CSV/file downloads with per-employee UIF contributions.
- [ ] Switch to a different period using the selector. Confirm the EMP201 updates for that period.
- [ ] Select a period with no completed payroll run. Confirm a clear empty state or "no data" message.
- [ ] Click "Generate" or "Refresh" to regenerate the EMP201 from the latest payroll data. Confirm it does not crash.

### 6.2 IRP5 / IT3(a) certificates

- [ ] Navigate to the IRP5/EMP501 panel in Compliance.
- [ ] Select a tax year (e.g., 2025/26: March 2025 to February 2026).
- [ ] Confirm a list of IRP5/IT3(a) certificates appears, one per employee who had payslips in that year.
- [ ] Confirm that employees with PAYE > 0 for the year receive an IRP5, and employees with no PAYE receive an IT3(a).
- [ ] Click on a certificate. Confirm it shows: employee name, tax number, income source codes (3601 basic salary, etc.), PAYE withheld, UIF, total income.
- [ ] Confirm the income on the certificate matches the sum of payslips for that employee for the tax year.
- [ ] Export the certificates as CSV. Confirm the file downloads correctly.

### 6.3 EMP501 reconciliation

- [ ] On the EMP501 panel, select a tax year.
- [ ] Confirm the reconciliation shows: total PAYE declared on EMP201s vs. total PAYE on IRP5 certificates.
- [ ] If the two figures match, confirm no difference is flagged.
- [ ] If there is a difference (e.g., a missing payroll run), confirm the difference is highlighted clearly.
- [ ] Export the reconciliation as CSV. Confirm the file downloads.

### 6.4 Employment Equity Report (EEA2 / EEA4)

- [ ] Navigate to Reports > Employment Equity (or Compliance > Equity).
- [ ] Confirm the EEA2 table shows employees grouped by occupational level with male/female/foreign/disability counts.
- [ ] Confirm the EEA4 table shows employees grouped by race group with headcount and average pay.
- [ ] Confirm employees without equity data show a "completeness" warning or are flagged.
- [ ] Confirm the report respects the active tenant (NovaTech's data, not Apex's).
- [ ] Export the EEA2/EEA4 as CSV. Confirm the file downloads.
- [ ] Add equity data to an employee (race, gender, occupational level). Return to the report. Confirm that employee now appears in the correct category.

### 6.5 UIF declaration

- [ ] On the EMP201 panel, find the "UIF Declaration" export.
- [ ] Click it. Confirm a file downloads with per-employee UIF contributions for the selected period.
- [ ] Confirm the file includes: employee name/ID, UIF employee contribution, UIF employer contribution.
- [ ] Confirm the UIF figures match the payslip totals for that period.

---

## Section 7: Reports

- [ ] Navigate to `/reports`. Confirm all report sections load without errors.
- [ ] **Headcount report:** Confirm it shows total employees, active, terminated, on leave, by department breakdown.
- [ ] **Payroll summary report:** Confirm it shows total gross, PAYE, UIF, SDL, net by period.
- [ ] Confirm the payroll summary figures match the completed payroll runs.
- [ ] **Leave summary report:** Confirm it shows leave taken by type, by employee, across periods.
- [ ] **Bank export (NIF format):** Click "Generate bank export" for a completed payroll run.
- [ ] Confirm a NIF file downloads with one line per employee containing account details and net pay.
- [ ] Open the NIF file. Confirm amounts match the payslip net pay values.
- [ ] Confirm the NIF file includes the correct company bank details (from Settings > Company).
- [ ] Confirm that a payroll run with no payslips does not generate an empty/corrupt NIF file.
- [ ] Confirm all report pages load correctly when there is NO data yet (new account, empty state).

---

## Section 8: Settings

### 8.1 Company settings

- [ ] Go to Settings > Company. Confirm current company details are pre-filled.
- [ ] Change the company legal name. Click Save. Refresh. Confirm the change persists.
- [ ] Change the company address. Save. Refresh. Confirm it persists.
- [ ] Change the registration number. Save. Refresh. Confirm it persists.
- [ ] Change the company colour/theme. Save. Confirm the UI accent colour updates.
- [ ] Try saving with the company name blank. Expect: validation error.
- [ ] Confirm the save button shows a loading state while saving and returns to normal on completion.
- [ ] Confirm a success toast appears after saving.

### 8.2 Payroll settings

- [ ] Go to Settings > Payroll. Confirm UIF rate, UIF employer rate, UIF ceiling, SDL rate, SDL enabled toggle are shown.
- [ ] Change the UIF ceiling. Save. Confirm the next payroll run uses the new ceiling.
- [ ] Toggle SDL off. Save. Confirm SDL = R0 on the next payroll run.
- [ ] Toggle SDL back on. Save. Confirm SDL is restored on the next payroll run.
- [ ] Enter statutory reference numbers (PAYE ref, UIF ref, SDL ref). Save. Refresh. Confirm they persist.
- [ ] Confirm the pay day setting (e.g., 25th of month) is editable. Change it. Save. Confirm the next scheduled run uses the new pay date.

### 8.3 Leave policy settings

- [ ] Go to Settings > Leave policies. Confirm annual, sick, family, study, unpaid leave totals are displayed.
- [ ] Confirm whether these are editable. If read-only, confirm there is an informational message.
- [ ] If editable, change the annual leave total from 18 to 20. Save. Add a new employee. Confirm their annual leave balance is set to 20.

### 8.4 Payslip studio

- [ ] Go to Settings > Payslip Studio. Confirm template selector shows: Classic, Modern, Corporate, Branded.
- [ ] Switch templates and confirm the preview updates.
- [ ] Upload a company logo. Confirm it appears in the preview.
- [ ] Change the accent colour. Confirm the preview reflects the new colour.
- [ ] Add a footer note. Save. Download a payslip. Confirm the footer note appears.
- [ ] Toggle "Show banking details" on a payslip. Download. Confirm banking section shows.
- [ ] Toggle "Show YTD totals". Download. Confirm YTD column shows or hides.
- [ ] Remove the logo. Save. Download a payslip. Confirm no logo appears.

### 8.5 Netcash settings

- [ ] Go to Settings > Netcash (or Integrations). Confirm the salary key and account services key fields exist.
- [ ] Enter a dummy/invalid key. Click "Test key". Expect: clear error message ("invalid key"), not a crash.
- [ ] Leave the key blank and try to test. Expect: validation error before the API call.
- [ ] Confirm the key is stored masked (not shown in plain text after saving).
- [ ] Toggle between Production and UAT environments. Confirm the toggle saves and persists.

### 8.6 Payroll approval

- [ ] Go to Settings > Payroll. Find the "Require approval" toggle.
- [ ] Enable it. Set an approver from the dropdown. Save.
- [ ] Refresh. Confirm the setting persists with the correct approver selected.
- [ ] Disable it. Save. Refresh. Confirm it is disabled.

### 8.7 User management (team members)

- [ ] Go to Settings > Team (or Users). Confirm the current user list shows all active users for the tenant.
- [ ] Confirm each user shows their name, email, role badge, and last login (if tracked).
- [ ] Click "Invite user". Enter an email and select role "Manager". Send the invite.
- [ ] Confirm the invite appears in the pending invites list.
- [ ] Refresh. Confirm the pending invite persists.
- [ ] Click "Copy invite link". Confirm a link is copied to clipboard.
- [ ] Open the invite link in an incognito window. Confirm the accept-invite page loads showing the correct email and role.
- [ ] Set a password and complete the invite. Confirm the new user can log in with their credentials.
- [ ] Return to Settings > Team. Confirm the new user now appears in the active users list and is removed from pending invites.
- [ ] Send an invite to an email that already has an account. Confirm appropriate handling (error or the invite is valid).
- [ ] Click "Revoke" on a pending invite. Confirm it disappears from the pending list.
- [ ] Refresh. Confirm the revoked invite is gone.
- [ ] Try using a revoked invite link. Expect: error message "this invite is no longer valid".
- [ ] Confirm only HR admins can access the Team settings page (Manager, Employee cannot).

### 8.8 Notification settings

- [ ] Go to Settings > Notifications. Confirm preference toggles exist (e.g., leave request notifications, payroll complete).
- [ ] Toggle a preference off. Save. Refresh. Confirm it persists as off.

---

## Section 9: Billing

- [ ] Navigate to `/billing`. Confirm the pricing tiers are displayed (Starter, Growth, Enterprise or similar).
- [ ] Confirm the current plan and trial status is shown in the header.
- [ ] If on a trial, confirm the days remaining and end date are shown accurately.
- [ ] Confirm each pricing tier shows the correct features list and price.
- [ ] If you have more active employees than a tier allows, confirm that tier shows a warning ("exceeds plan limit").
- [ ] Click "Choose [Tier]" on any plan. Confirm it opens a pre-filled email to the billing address (mailto link).
- [ ] Confirm "card payments coming soon" is NOT present anywhere on this page.
- [ ] Confirm the billing page is only accessible to HR role (not Employee, Manager, or Exco).

---

## Section 10: Notifications

- [ ] Trigger a notification (e.g., submit a leave request, complete a payroll run).
- [ ] Confirm the bell icon shows an unread badge with the count.
- [ ] Click the bell. Confirm the notification dropdown/panel opens.
- [ ] Click a notification. Confirm it is marked as read and the badge count decreases.
- [ ] Click "Mark all as read". Confirm the badge disappears.
- [ ] Refresh the page. Confirm read notifications stay read.
- [ ] Confirm notification text is clear and actionable ("Aisha Patel submitted a 3-day leave request").
- [ ] Confirm clicking the notification navigates to the relevant page (e.g., the leave request).

---

## Section 11: Support Hub

- [ ] Find the support hub button (bottom of sidebar or floating button).
- [ ] Click it. Confirm the support panel opens.
- [ ] Confirm "Contact support" shows a working mailto link (not "coming soon").
- [ ] Confirm any quick guides or help articles load correctly.
- [ ] Click an in-app guide topic. Confirm useful content appears.
- [ ] Close the support panel. Confirm it closes cleanly.

---

## Section 12: Multi-Tenant Isolation (Critical Security Tests)

- [ ] Log in as Lerato (NovaTech HR). Confirm only NovaTech's 14 employees appear in the directory.
- [ ] Confirm no Apex Financial Group or Horizon Logistics employees appear anywhere.
- [ ] Confirm the activity feed shows only NovaTech events.
- [ ] Confirm payroll runs shown are only NovaTech's runs.
- [ ] Confirm compliance data (EMP201 totals) match only NovaTech's payroll figures.
- [ ] Log in as Michael (Exco). Confirm he can switch between all 3 companies and each shows the correct data.
- [ ] Create a new test company via `/signup`. Log in. Confirm the dashboard is completely empty and contains no data from NovaTech, Apex, or Horizon.
- [ ] As the new test company HR, add an employee. Confirm this employee does NOT appear when you log in as Lerato (NovaTech).
- [ ] Attempt to directly access a NovaTech employee's profile URL while logged in as the test company's HR. Expect: 404 or access denied -- the employee must not load.
- [ ] Submit a leave request as a NovaTech employee. Confirm it does not appear in the test company's leave list.

---

## Section 13: Mobile and Responsive Layout

> Test all of these using Chrome DevTools (F12) > Toggle device toolbar, set to iPhone 14 (390 x 844).

### 13.1 Navigation on mobile

- [ ] Open the app on mobile viewport. Confirm the sidebar collapses and a bottom nav or hamburger appears.
- [ ] Confirm ALL navigation sections are reachable on mobile (Dashboard, Employees, Leave, Payroll, Compliance, Reports, Settings). If not all fit in the bottom bar, confirm a "More" button opens the remaining items.
- [ ] Tap each nav item on mobile. Confirm each page loads correctly without layout overflow.
- [ ] As Aisha (Employee), confirm the mobile nav shows only the items available to her role.
- [ ] Confirm the user avatar/profile menu is accessible on mobile.
- [ ] Confirm the notifications bell is accessible on mobile.
- [ ] Confirm the support hub is accessible on mobile.

### 13.2 Key pages on mobile

- [ ] **Dashboard:** Confirm stat cards stack vertically on mobile, no horizontal overflow.
- [ ] **Employee directory:** Confirm the table or card list is readable. Confirm the "Add employee" and "Import CSV" buttons are visible and tappable.
- [ ] **Add employee wizard:** Confirm all 4 steps are usable on a 390px screen. Inputs are not cut off. The Next/Back buttons are reachable.
- [ ] **Leave page:** Confirm the calendar is readable on mobile. Confirm the request list is scrollable.
- [ ] **Payroll page:** Confirm run cards stack vertically. The "Process" button is reachable.
- [ ] **Payslip dialog:** Confirm the payslip dialog is readable and scrollable on mobile. The download button is reachable.
- [ ] **Compliance page:** Confirm the EMP201 figures are readable. CSV export button is reachable.
- [ ] **Settings:** Confirm all settings tabs are accessible. Confirm form inputs fill the full width correctly.
- [ ] **Billing:** Confirm pricing cards stack vertically on mobile.

### 13.3 Tablet viewport (768px width)

- [ ] Resize to 768px. Confirm the layout is a reasonable hybrid (not the full desktop sidebar but not purely mobile either).
- [ ] Confirm no content is cropped or overlapping at 768px.
- [ ] Confirm tables that are too wide on mobile have horizontal scroll rather than overflowing.

---

## Section 14: Edge Cases and Resilience

### 14.1 Network simulation

- [ ] Open DevTools > Network > Throttle to "Slow 3G". Log in. Confirm loading skeletons or spinners appear while data loads. Confirm no crash or blank screen.
- [ ] Throttle to Offline. Try to save a company setting. Expect: error toast ("could not save, check your connection"), not a silent failure.
- [ ] Throttle to Offline. Try to complete a payroll run. Expect: clear error, payroll is not partially processed.

### 14.2 Direct URL access without auth

- [ ] While logged out, navigate to `/employees`. Expect: redirect to `/login`.
- [ ] While logged out, navigate to `/payroll`. Expect: redirect to `/login`.
- [ ] While logged out, navigate to `/compliance`. Expect: redirect to `/login`.
- [ ] While logged out, navigate to `/settings`. Expect: redirect to `/login`.
- [ ] While logged out, navigate to `/reports`. Expect: redirect to `/login`.

### 14.3 Cross-role URL access

- [ ] Logged in as Aisha (Employee), navigate directly to `/payroll`. Expect: redirect or access denied.
- [ ] Logged in as Thabo (Manager), navigate to `/compliance`. Expect: redirect or access denied.
- [ ] Logged in as Thabo, navigate to `/settings`. Expect: redirect or access denied.
- [ ] Logged in as Aisha, navigate to `/employees/[some-other-employee-id]`. Expect: access denied or redirect to own profile.

### 14.4 Double-click / rapid action prevention

- [ ] On the "Complete payroll run" button, click it twice rapidly. Confirm the payroll is processed only once, not twice.
- [ ] On "Approve leave", click twice rapidly. Confirm the action fires once.
- [ ] On "Save" in settings, click multiple times. Confirm only one save request is sent.

### 14.5 Page refresh persistence (data should survive a refresh)

- [ ] After every action in these tests, refresh the page. Data must persist. Note any that do not.
- [ ] Specifically: new employee added, leave approved, payroll completed, settings changed, document uploaded, deduction created.

### 14.6 Empty states

- [ ] Create a new company. Confirm every page shows a sensible empty state (not an error or blank white area): Employees, Leave, Payroll, Compliance, Reports.
- [ ] Confirm empty states include a call-to-action (e.g., "Add your first employee" button on the empty employees page).

### 14.7 Long inputs and special characters

- [ ] In the employee name field, enter a very long name (100+ characters). Save. Confirm it displays correctly without breaking the layout.
- [ ] In the company name, enter special characters: `O'Brien & Co. (Pty) Ltd`. Save. Confirm it stores and displays correctly.
- [ ] In a leave reason field, enter a very long reason (500+ characters). Submit. Confirm it stores and displays without truncation or error.
- [ ] In the payslip footer note (Settings > Payslip Studio), enter text with an apostrophe: `Company's year-end bonus`. Save. Download a payslip. Confirm the apostrophe renders correctly and there is no broken entity like `&apos;`.

### 14.8 404 and error pages

- [ ] Navigate to `/does-not-exist`. Confirm a proper 404 page appears (not a crash or a blank screen).
- [ ] Navigate to `/employees/nonexistent-id`. Confirm a 404 or "not found" page, not a crash.
- [ ] Confirm the 404 page has a link back to the dashboard.

### 14.9 Console errors

- [ ] Open DevTools Console (F12). Navigate through every page of the app while logged in as each role. Confirm NO red errors appear that are not explained by the current action.
- [ ] Specifically check: Dashboard, Employees list, an Employee profile, Leave, Payroll run list, a completed run, a payslip, Compliance, Reports, Settings (each tab), Billing.

---

## Section 15: Payroll Calculation Accuracy

These are manual spot-checks of the maths. Use a fresh test employee for clean numbers.

- [ ] **Basic PAYE check:** Create an employee with annual gross salary of R240,000 (R20,000/month). Process a payroll run. Confirm monthly PAYE is approximately R1,040 (2025/26 bracket: R1,173.72/year tax on R18-R237,100 band, 18% rate).
- [ ] **UIF check:** Confirm UIF employee contribution = 1% of gross, capped at R177.12/month (based on R17,712 ceiling).
- [ ] **UIF employer contribution:** Confirm it also equals 1% of gross (or the ceiling), visible on the EMP201.
- [ ] **SDL check:** For a tenant with total annual payroll above R500,000, confirm SDL = 1% of gross on each payslip.
- [ ] **Medical aid tax credit:** Create an employee with a medical aid contribution. Confirm the s6A credit (R364/month for the principal member, 2025/26) reduces the PAYE accordingly.
- [ ] **Travel allowance taxation:** Create an employee with a travel allowance. Confirm 80% of the travel allowance is included in taxable income (SARS default).
- [ ] **Pension deduction:** Create an employee with a 7.5% pension contribution. Confirm the pension amount is deducted from gross pay on the payslip.
- [ ] **Payslip totals:** Gross Pay = Basic + All Allowances. Net Pay = Gross Pay - All Deductions. Verify this holds for 3 different employees.

---

## Section 16: Final Launch Readiness

- [ ] No page in the app shows "coming soon", "TODO", "placeholder", or "mock" in any user-visible text.
- [ ] Every form has validation on required fields.
- [ ] Every save/submit action shows a loading state while in progress.
- [ ] Every save/submit action shows success or error feedback (toast, message, or state change).
- [ ] The app does not crash on any action tested above.
- [ ] No console errors remain that are not explained.
- [ ] The privacy policy at `/privacy` is readable and up to date.
- [ ] The terms of service at `/terms` is readable and up to date.
- [ ] The public landing page (`/`) loads, shows pricing, and both CTA buttons work.
- [ ] Signed-in users visiting `/` are redirected to `/dashboard`.
- [ ] The app is fully navigable on a 390px mobile screen.
- [ ] All data entered during testing in the live app is cleaned up or noted as demo data before first client onboarding.

---

## Sign-off

| Tester | Date | Passed | Notes |
|---|---|---|---|
| | | | |

**All items above must be ticked before onboarding the first paying client.**
