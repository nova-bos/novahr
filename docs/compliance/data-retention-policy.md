# NovaHR Data Retention Policy

**Version:** 1.0 (Draft, pending legal review)
**Effective Date:** [●]
**Owner:** Information Officer
**Review cycle:** Annual

This policy defines how long each category of data is retained by NovaHR and why. It implements POPIA section 14 (records must not be kept longer than necessary) while honouring statutory minimum retention periods that override it.

---

## 1. Principles

1.1 Retain personal information only as long as necessary for the purpose collected, a legal obligation, or the establishment or defence of legal claims.

1.2 Where a statutory minimum applies (tax, employment law), it takes precedence over early deletion requests; processing during the retention tail is restricted to record-keeping.

1.3 When a retention period expires, data is deleted or irreversibly de-identified per the Data Deletion Policy.

## 2. Retention Schedule: Customer Tenant Data (NovaHR as Operator)

The customer (employer) is the Responsible Party and controls retention within these system defaults:

| Data category | Retention | Driver |
|---|---|---|
| Active employee records | Duration of employment | Operational |
| Terminated employee records | 5 years from tax year of termination (customer-controlled) | SARS: Tax Administration Act s 29 (5 years); Income Tax Act Fourth Schedule |
| Payslips and payroll runs | 5 years | SARS payroll record requirement |
| Leave and attendance records | 3 years minimum | BCEA s 31 (records for 3 years) |
| Audit logs | 12 months rolling minimum, 24 months target | Security, POPIA accountability |
| Notifications | 12 months | Operational |
| Uploaded documents | Linked to owning record's period | Follows parent record |

### After subscription cancellation

| Stage | Period | State |
|---|---|---|
| Export Window | 30 days from effective cancellation | Read-only access for export |
| Deletion | Within 60 days after Export Window | Tenant data deleted from production |
| Backup purge | Within the backup rotation cycle (max 35 days after production deletion) | Data ages out of backups |

The customer is responsible for exporting records it must retain by law before deletion.

## 3. Retention Schedule: NovaHR's Own Data (NovaHR as Responsible Party)

| Data category | Retention | Driver |
|---|---|---|
| Customer contracts, Orders, DPAs | Term + 5 years | Prescription Act (3 years) plus tax; contract claims |
| Invoices and financial records | 5 years from end of tax year | Tax Administration Act s 29; Companies Act s 24 (7 years for some records: apply 7 years to accounting records) |
| Accounting records | 7 years | Companies Act 71 of 2008, s 24 and Regulation 25 |
| Support tickets | 3 years from closure | Service history, claims |
| Marketing lists | Until unsubscribe or 2 years inactivity | POPIA minimality |
| Prospect data (no engagement) | 12 months | POPIA minimality |
| DSAR register and consent records | 5 years from request/withdrawal | Accountability evidence |
| Breach and incident records | 5 years | Accountability, insurance |
| Own employee records (when staff are hired) | Employment + 5 years | SARS, BCEA, prescription |
| System and access logs | 12-24 months | Security investigation window |

## 4. Legal Holds

Where litigation, a regulatory investigation, or a SARS query is pending or reasonably anticipated, the Information Officer may place a legal hold suspending deletion of the affected records until the hold is lifted in writing.

## 5. Responsibilities

- **Information Officer:** owns this policy, approves exceptions, maintains the retention register, lifts legal holds.
- **Engineering:** implements automated deletion jobs and backup rotation aligned to this schedule.
- **All personnel:** must not retain ad hoc copies (exports, spreadsheets) beyond the schedule.

## 6. Review

Reviewed annually and on any change in law (SARS, BCEA, Companies Act, POPIA regulations) or system architecture.
