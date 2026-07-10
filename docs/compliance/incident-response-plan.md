# NovaHR Incident Response Plan (IRP)

**Version:** 1.0
**Effective Date:** 10 July 2026
**Owner:** Engineering
**Review cycle:** Annual, plus after every P1/P2 incident

Covers all operational and security incidents. Incidents involving personal information also trigger the Data Breach Response Policy; catastrophic infrastructure loss also triggers the Disaster Recovery Plan.

---

## 1. Severity Classification

| Severity | Definition | Examples | Response start |
|---|---|---|---|
| **P1** | Data breach, data integrity loss, or service down for all users, or payroll blocked on pay day | Cross-tenant data exposure; database corruption; auth outage; payroll run failing on the 25th | Immediately |
| **P2** | Core feature broken with no workaround | Payslip PDF generation down; leave approvals failing | Within 4 business hours |
| **P3** | Degraded but usable | Slow reports; intermittent email delays | Within 1 business day |
| **P4** | Minor | Cosmetic bugs, copy errors | Backlog |

## 2. Detection Sources

- Vercel runtime errors and logs; Supabase logs and alerts;
- Customer reports to hello@novahr.co.za;
- Failed CI or deployment alerts;
- Vulnerability reports via the Vulnerability Disclosure Policy;
- Sub-processor status pages and notifications (Vercel, Supabase, Resend).

## 3. Response Steps

### 3.1 Triage (all severities)
1. Open an incident record: timestamp, reporter, symptoms, severity, owner.
2. Classify severity; if personal information may be exposed, invoke the Data Breach Response Policy in parallel immediately.

### 3.2 P1/P2 handling
3. **Stabilise first:** roll back the last deployment if the incident followed a deploy (Vercel instant rollback); enable maintenance mode if data integrity is at risk.
4. **Preserve evidence** before rotating anything: export relevant logs.
5. **Communicate:** P1 incidents over 1 hour trigger customer notification (BCP communication plan). Assign one communicator.
6. **Diagnose and fix:** roll forward with a tested fix or restore from backup (DRP) as appropriate. Never test fixes directly in production if avoidable; use preview deployments.
7. **Verify:** run the manual QA checklist on the affected flows; confirm with the reporting customer.
8. **Close:** record resolution time, root cause, and customer impact in the incident record.

### 3.3 Post-incident review (P1/P2)
Within 10 business days, write a blameless review: timeline, root cause (technique: 5 whys), detection gap, response gap, and corrective actions with owners and due dates. File in `docs/incidents/` [create on first incident] and track actions to completion.

## 4. Payroll-Specific Rules

- Any incident affecting **calculation correctness** (wrong PAYE, UIF, leave balances) is at least P2 regardless of user count, and P1 if payslips were already published to employees.
- If incorrect payslips were published: identify affected tenants and periods from the database, notify each affected HR admin with the correct values and a corrected payslip, and record the correction in the audit log. Do not silently edit published payslips.
- Deployment freeze during the month-end window (24th to 1st) except P1 fixes.

## 5. Roles

Solo-founder mode: the founder is incident commander, engineer, and communicator; the external attorney supports breach handling. When the team grows, separate commander and communicator roles.

## 6. Records

All incident records are retained for 5 years. A quarterly summary (count by severity, mean time to resolve, repeat causes) feeds the engineering review.

## 7. Testing

Annual tabletop combining this plan with the Breach Policy scenario. Update the plan with lessons learned.
