# NovaHR Pre-Launch Checklist

This document tracks what must be completed before NovaHR can go live to paying customers.
Items are ordered by priority. Blockers must be resolved before soft launch.

---

## BLOCKERS (must fix before any paying customer)

### 1. Department CRUD UI
**Problem:** The `Department` table exists in the schema and the employee onboarding wizard has a department dropdown, but there is no UI to create or manage departments. New signups start with zero departments, making the employee form unusable.
**Fix needed:** A simple settings page or modal to add, rename, and delete departments for the tenant.
**Files:** `prisma/schema.prisma` (Department model exists), `src/app/(app)/settings/page.tsx` (add a Departments tab)

### 2. Multi-user invite flow
**Problem:** The signup action creates exactly one HR admin user per tenant. There is no way to invite a manager, payroll officer, or employee-portal user from inside the app.
**Fix needed:** An invite-by-email flow. User receives email link, sets password, is associated with the tenant. Needs: invite token table, Resend invite email, `/accept-invite/[token]` route, user management UI in Settings.

### 3. Billing and subscription management
**Problem:** All accounts are on `trial` plan with no `trialEndsAt` set, meaning trials never expire. There is no payment gateway, no upgrade flow, and no way to collect revenue.
**Fix needed:** Integrate PayFast (SA-preferred) or Stripe. Add a `trialEndsAt` to the signup action. Enforce plan gating when trial expires. Add a billing/upgrade page.
**Files:** `src/lib/auth/actions.ts` (signup), `src/lib/plan/use-plan.ts` (gating), `src/app/(app)/billing/` (new route needed)

### 4. Terms of Service and Privacy Policy pages
**Problem:** The signup page links to `/terms` and `/privacy` but neither route exists. This is a legal requirement.
**Fix needed:** Create `src/app/terms/page.tsx` and `src/app/privacy/page.tsx` with real content.

### 5. PAYE/UIF/SDL reference numbers per tenant
**Status:** FIXED in this session. Inputs are now editable in Settings > Payroll > Statutory registration. Saved to DB.
**Remaining:** Add validation (PAYE is 10 digits starting with 7, UIF starts with U, SDL starts with L).

---

## HIGH PRIORITY (fix before growth)

### 6. Leave policy settings
**Problem:** All leave policy inputs in Settings > Leave policies are `disabled`. Every tenant is locked to 18 days annual, 10 sick, 5 unpaid, 3 family.
**Fix needed:** Remove `disabled` props, wire inputs to a `updateLeavePolicyAction` server action that updates the `LeaveBalance` defaults for new employees.
**File:** `src/components/settings/leave-policy-settings.tsx`

### 7. Termination workflow
**Problem:** Employee status can be changed to `terminated` via the edit dialog, but there is no dedicated offboarding screen, no final pay calculation, no confirmation step, and no `ActivityType.termination` logged in a structured way.
**Fix needed:** A "Terminate employee" button on the employee profile that opens a dialog asking for: termination date, reason, notice pay, and final leave payout. Logs a structured activity item.

### 8. Payroll approval workflow
**Problem:** `PayrollSettings.requireApproval` and `approvalUserId` exist in schema but are never checked before `completePayrollRunRecord` runs.
**Fix needed:** If `requireApproval` is true, the "Complete payroll run" button should submit for approval instead of completing directly. An approver sees a pending approval and can approve or reject.

### 9. User profile management
**Problem:** Logged-in users cannot change their own display name or password from inside the app. The only password change is via Supabase's forgot-password email flow.
**Fix needed:** A "My profile" page or section in the sidebar footer dropdown where users can update name, title, and trigger a password change email.

### 10. EMP201 and EMP501 screens
**Problem:** `ComplianceType.emp201` and `ComplianceType.emp501` exist in the schema and `ActivityType` references them, but the compliance page at `/compliance` only shows PAYE, UIF, and SDL return cards.
**Fix needed:** Add EMP201 (monthly employer reconciliation) and EMP501 (bi-annual reconciliation) cards to the compliance page with the same mark-as-submitted flow.

---

## MEDIUM PRIORITY (polish before marketing)

### 11. Notification preferences backed by DB
**Problem:** Notification settings (email alerts for payslips, leave decisions, etc.) are stored in `localStorage`. They only persist on one browser and the email-sending code in `src/lib/email.ts` never consults them.
**Fix needed:** Add notification preference columns to the `User` table (or a separate `NotificationPreference` table). Update `sendPayslipEmail`, `sendLeaveRequestEmail`, etc. to check user preferences before sending.

### 12. Payroll items normalized table
**Problem:** `PayrollItem` table exists in schema but `completePayrollRunRecord` never writes rows to it. Earnings and deductions are stored as JSON blobs on `Payslip.earnings` and `Payslip.deductions`. The `PayrollItem` table is always empty.
**Fix needed:** Write one `PayrollItem` row per earnings/deductions line item when a payroll run completes.
**File:** `src/lib/payroll/actions.ts` (completePayrollRunRecord)

### 13. Salary history table
**Problem:** `EmployeeSalaryHistory` table exists but nothing writes to it. Compensation changes via the edit dialog do not create a history row.
**Fix needed:** In `updateEmployeeRecord`, if salary fields change, write a new `EmployeeSalaryHistory` row with the old values and a `changedBy` actor.

### 14. Pricing page vs app plan model mismatch
**Problem:** The marketing landing page shows `starter` / `growth` / `scale` tiers at R499 / R999 / R2499. The app's internal plan model has `trial` / `hr` / `hr_payroll`. These are completely different naming schemes.
**Fix needed:** Align the landing page pricing to match the actual plan names and what they unlock, or update the internal plan model to match the marketing tiers.
**File:** `src/components/marketing/pricing-section.tsx` (or wherever pricing is defined), `src/lib/plan/`

### 15. Contact form has no backend
**Problem:** The "Get in touch" contact section on the landing page shows email/phone/WhatsApp links (now env-var driven) but there is no contact form with a server action. Submissions go nowhere.
**Fix needed:** Either add a form with a `sendContactEnquiryAction` that sends an email via Resend, or keep the current link-based approach and remove the heading that implies a form.

---

## NETCASH (complete before first payroll run)

The integration is built. Before first use:

1. Log into Netcash portal at https://www.netcash.co.za
2. Enable the Salary service under Services
3. Under NetConnector, generate a Service Key (GUID format)
4. Add to Settings > Payroll > Netcash > Salary service key
5. Add your PAYE/UIF/SDL reference numbers in Settings > Payroll > Statutory registration
6. Test with a `DatedSalaries` batch against the Netcash sandbox before going live
7. Sandbox details: http://api.netcash.co.za/testing/

**Timing rules:**
- `DatedSalaries`: load by 12:59 the business day before the pay date
- `PaySalaries` (same-day): load by 12:59 on the pay date
- `RTCSalaries` (real-time): 08:30 to 15:30 only

---

## DEPLOYMENT CHECKLIST

Before going live, confirm these env vars are set in Vercel:

```
DATABASE_URL=                        # Supabase pooled connection string
DIRECT_URL=                          # Supabase direct connection string
NEXT_PUBLIC_SUPABASE_URL=            # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=           # Supabase service role key (server only)
BETTER_AUTH_SECRET=                  # Not used (Supabase auth) - can skip
RESEND_API_KEY=                      # For payslip and leave emails
NEXT_PUBLIC_APP_URL=                 # Production URL (for email links)
NEXT_PUBLIC_SUPPORT_WHATSAPP=        # e.g. 27812345678
NEXT_PUBLIC_SUPPORT_EMAIL=           # e.g. support@novahr.co.za
NEXT_PUBLIC_SUPPORT_PHONE=           # e.g. +27111234567
```

Run migration before first deploy:
```bash
npx prisma migrate deploy
```
