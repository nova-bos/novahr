# NovaHR Backup Policy

**Version:** 1.0
**Effective Date:** [●]
**Owner:** Engineering
**Review cycle:** Annual, with quarterly restore tests

---

## 1. What Is Backed Up

| Asset | Method | Frequency | Retention |
|---|---|---|---|
| Production Postgres database (all tenant data) | Supabase automated backups | Daily | 7 days minimum (Pro plan); [extend to PITR when justified ●] |
| File storage (payslip PDFs, uploads) | Supabase storage durability + [scheduled export to secondary bucket ●] | Daily | Aligned to database |
| Source code | GitHub (full history, all branches) | Continuous | Indefinite |
| Environment configuration | Vercel env vars + encrypted offline copy of the secrets register | On change | Current + previous |
| Legal and business documents | Repo (`docs/`) + [Google Drive ●] | Continuous | Indefinite |

## 2. Objectives

- **RPO (Recovery Point Objective): 24 hours.** Maximum acceptable data loss equals one backup interval.
- **RTO (Recovery Time Objective): 8 business hours** for full restoration after catastrophic database loss.

These figures are published in the SLA and must not be promised lower than what the infrastructure actually supports.

## 3. Restoration Procedure (summary)

Full runbook: `docs/compliance/disaster-recovery-plan.md`.

1. Declare the incident and freeze deployments.
2. Identify the latest good backup in the Supabase dashboard.
3. Restore to the production project (or a new project if the project itself is lost).
4. If a new project: update `DATABASE_URL` and Supabase keys in Vercel env vars, redeploy, run `prisma migrate deploy` to verify schema alignment.
5. Re-apply any deletions executed after the backup point (deletion log) before serving traffic.
6. Smoke test: login, view an employee, open a payslip, run the manual QA checklist.
7. Communicate restoration and any data-loss window to affected customers.

## 4. Backup Security

- Backups are encrypted at rest and accessible only to named engineers with MFA (Access Control Policy).
- Backups contain personal information and fall under all POPIA policies; a backup restore to any non-production environment must be scrubbed or access-restricted like production.
- Deleted tenant data ages out of backups within the rotation window (max 35 days), per the Data Deletion Policy.

## 5. Testing

- **Quarterly restore test:** restore the latest backup to a scratch project, verify row counts and a sample payslip render, record the result and elapsed time in the restore-test log.
- A failed restore test is a P2 incident: root cause and fix within 10 business days.

## 6. Responsibilities

Engineering owns execution and testing; the Information Officer reviews restore-test logs quarterly.
