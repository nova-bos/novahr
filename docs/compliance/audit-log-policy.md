# NovaHR Audit Log Policy

**Version:** 1.0
**Effective Date:** 10 July 2026
**Owner:** Engineering
**Review cycle:** Annual

Defines what NovaHR logs, why, for how long, and who may access logs. Supports POPIA accountability and customer audit requirements.

---

## 1. What Is Logged

### 1.1 Application audit log (visible to customer HR Admins in-app)

Per tenant, with actor, timestamp (UTC), action, and affected entity:

- Authentication: logins, failed logins, password resets, invitations;
- Employee records: create, update, terminate, delete;
- Payroll: run created, calculated, approved, payslips published, payslip downloads;
- Leave: requests, approvals, rejections, balance adjustments;
- Roles and permissions: role changes, user activation and deactivation;
- Company settings changes;
- Data exports (who exported what, when).

### 1.2 Platform logs (internal)

- Vercel function logs (requests, errors), Supabase database and auth logs;
- Deployment history (who deployed what, when: Vercel + git history);
- Internal administrative access to production (per Access Control Policy).

## 2. Log Content Rules

- Logs record **who did what to which record**, not full data payloads;
- Never log: passwords, session tokens, full bank account numbers, or full SA ID numbers (mask to last 4 where a reference is needed);
- Log entries are append-only from the application's perspective; no UI or API exists to edit or delete audit entries; direct database tampering is restricted by access controls and is itself detectable via platform logs.

## 3. Retention

| Log | Retention |
|---|---|
| Application audit log | 24 months target, 12 months minimum (see Data Retention Policy); deleted with tenant data on offboarding |
| Vercel / Supabase platform logs | Provider defaults [document current plan limits ●] |
| Deployment and git history | Indefinite |

## 4. Access

- Customer HR Admins see their own tenant's audit log only;
- Internal access to cross-tenant logs is restricted to named engineers for support, security, and reliability purposes;
- Logs containing personal information are subject to all POPIA safeguards.

## 5. Monitoring and Review

- Failed login spikes and anomalous administrative actions are reviewed when detected [alerting to be automated: ●];
- Audit log integrity is included in the quarterly access review;
- Incidents identified from logs follow the Incident Response Plan.

## 6. Customer Assurance

On request, NovaHR provides customers a description of logged events and retention for their due diligence. Tenant-specific log extracts are available to the tenant's own HR Admin via the app or support.
