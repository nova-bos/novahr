# NovaHR Access Control Policy

**Version:** 1.0
**Effective Date:** [●]
**Owner:** Engineering / Information Officer
**Review cycle:** Annual, with quarterly access reviews

Defines who may access what, on what basis, and how access is granted, reviewed, and revoked. Supports POPIA section 19.

---

## 1. Principles

- **Least privilege:** every identity gets the minimum access required for its role.
- **Need to know:** access to personal information requires a documented business need.
- **Segregation:** production and non-production environments use separate credentials and, where possible, separate projects.
- **Accountability:** every access is attributable to a named individual; shared logins are prohibited.

## 2. Platform Access Model (customer-facing)

NovaHR enforces role-based access control per tenant:

| Role | Access |
|---|---|
| Employee | Own profile, own payslips, own leave requests and balances, own attendance |
| Manager | Employee access plus team leave approvals and team views |
| HR Admin | Full tenant administration: employees, payroll, leave, departments, settings, reports, user roles |
| Executive | Read-oriented dashboards and reports across the tenant |

- Tenant isolation is enforced at the database layer (row-level security keyed on tenant ID) and application layer; no role can cross tenants.
- Role changes are performed by HR Admins and recorded in the audit log.
- Payroll actions (run, approve, publish payslips) are restricted to HR Admin.

## 3. Internal Access to Production

| System | Who | Controls |
|---|---|---|
| Supabase (production database, auth) | Named engineers only | MFA, least-privilege dashboard roles |
| Vercel (hosting, env vars, logs) | Named engineers only | MFA |
| GitHub (source code) | Named engineers | MFA, branch protection on main, PR review once team is 2+ |
| Resend (email) | Named engineers | MFA |
| Direct production data access | Exceptional, logged, and justified (support or incident only) | Written justification in ticket; no bulk exports; screen data minimally |

Support staff resolve issues through application-level tools wherever possible; direct database access for support requires a ticket reference and is reviewed quarterly.

## 4. Joiner, Mover, Leaver

- **Joiner:** access granted per a role-based checklist, approved by the founder; POPIA and security training before production access.
- **Mover:** access re-baselined to the new role within 5 business days.
- **Leaver:** all access revoked within 24 hours of exit; shared secrets they held are rotated; revocation recorded.

## 5. Access Reviews

Quarterly review of: all production system members, dashboard roles, GitHub collaborators, and any standing database credentials. Findings and removals are recorded. Annual review of this policy.

## 6. Third Parties

Contractors receive time-boxed, least-privilege access under a signed contractor agreement with POPIA undertakings; access expires automatically at engagement end.

## 7. Violations

Unauthorised access attempts, credential sharing, or unlogged production data access are security incidents handled under the Incident Response Plan and may constitute misconduct.
