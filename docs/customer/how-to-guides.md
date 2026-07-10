# NovaHR How-To Guides

**Audience:** HR Administrators (unless noted). Each guide is written to stand alone in the knowledge base.
**Screenshots:** Placeholders marked `[Screenshot: ●]` to be captured from the live app.

---

## 1. Add an Employee

1. Go to **Employees** and click **Add Employee**.
2. **Personal:** full names, SA ID or passport number, date of birth, contact details. The date of birth must be exact: it determines tax rebates.
3. **Employment:** position, department, start date, working pattern (5 or 6 day week).
4. **Pay:** basic salary, allowances (housing, travel with its inclusion rate), pension percentage, medical aid contribution and number of dependants.
5. **Banking:** bank, branch code, account number (verify against a bank letter).
6. **Leave:** opening balances if the employee joined before your NovaHR cut-over.
7. Save. The employee appears in the register and is included in the next payroll run.

`[Screenshot: Add Employee form]`

## 2. Process Payroll

1. Go to **Payroll** and click **New Run**; select the pay period.
2. NovaHR calculates every active employee: gross, PAYE, UIF, deductions, employer costs.
3. Add once-off items for the period: overtime hours, bonuses, unpaid leave days.
4. Review the run summary, then open individual payslips for anything unusual (new starters, terminations, changed salaries).
5. Click **Approve** when satisfied. Approval is recorded in the audit log.
6. Click **Publish** to release payslips to employee self-service and email.
7. Export the run report for your records and EMP201 figures.

**Tip:** never publish an unreviewed run; employees see published payslips immediately.

`[Screenshot: Payroll run review]`

## 3. Approve Leave

*Roles: Manager or HR Admin.*

1. Open **Leave**. Pending requests appear with dates, type, and remaining balance.
2. Click a request to see the detail: balance after approval, overlapping team leave, attached documents (e.g. medical certificate).
3. Click **Approve** or **Reject** (rejection asks for a reason, sent to the employee).
4. Approved leave updates the balance and the team calendar automatically, and paid/unpaid treatment flows to payroll.

`[Screenshot: Leave approvals queue]`

## 4. Generate Payslips

Payslips are generated automatically in each payroll run. To retrieve them:

1. **Bulk:** Payroll, open a run, **Download payslips** for all employees in the run.
2. **Single:** Employees, select the employee, **Payslips** tab, download the period's PDF.
3. **Employee self-service:** employees download their own payslips from their dashboard.
4. Payslips include the BCEA section 33 required particulars and are emailed on publication if enabled.

`[Screenshot: Payslip PDF]`

## 5. Export Reports

1. Go to **Reports**.
2. Choose a report: payroll run summary, employee costs, leave balances, headcount, deductions.
3. Set the period and any filters (department, employee).
4. Click **Export** (CSV for spreadsheets, PDF for filing).
5. Archive monthly payroll exports: SARS requires 5 years of payroll records.

`[Screenshot: Reports page]`

## 6. Add a Department

1. Go to **Departments** and click **Add Department**.
2. Name it and (optionally) assign a manager, who then sees the department's leave requests.
3. Save. Departments are available in employee profiles, filters, and reports.

## 7. Add a Job Title (Position)

1. Go to **Positions** and click **Add Position**.
2. Enter the title, link a department, and save.
3. Assign it on the employee profile. Position history is retained for reporting.

## 8. Back Up (Export) Your Data

NovaHR runs automated daily backups of the platform. For your own statutory records:

1. Monthly: export the payroll run report after each run (Reports);
2. Quarterly: export the employee register and leave balances (CSV);
3. Store exports in your own document system; you are responsible for statutory retention (SARS 5 years, BCEA 3 years);
4. Before cancelling a subscription, export everything during the 30-day export window.

## 9. Invite Users

1. Go to **Settings, Users** and click **Invite**.
2. Enter the person's email and select the role: Employee, Manager, HR Admin, or Executive.
3. The invitee receives an email link, sets their own password, and lands in their role's view.
4. Link the user account to the matching employee record so self-service shows the right payslips.
5. Deactivate users on termination: **Settings, Users, Deactivate** (this preserves history but blocks login).

**Never share one login between people:** approvals and payroll actions are attributed to the logged-in user in the audit log.

## 10. Reset a Password

**Your own:** click **Forgot password** on the login page; a single-use reset link is emailed to you (valid for a limited time).

**For another user (HR Admin):** Settings, Users, select the user, **Send password reset**. NovaHR staff and HR Admins can trigger a reset email but can never view or set a password.

**Locked out entirely** (lost access to the email account): contact hello@novahr.co.za from another verified company address; we will verify identity with your account owner before acting.
