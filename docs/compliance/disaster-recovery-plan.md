# NovaHR Disaster Recovery Plan (DRP)

**Version:** 1.0
**Effective Date:** 10 July 2026
**Owner:** Engineering
**Review cycle:** Annual, plus after every invocation or failed test

Technical recovery procedures for catastrophic failures. Business-side continuity (communications, alternative operations) is in the Business Continuity Plan; day-to-day incidents are in the Incident Response Plan.

---

## 1. Objectives

| Metric | Target |
|---|---|
| RPO (max data loss) | 24 hours |
| RTO (service restoration) | 8 business hours |
| Communication to customers | Within 2 hours of declaring a disaster |

## 2. Architecture Recovery Map

| Component | Provider | Failure mode | Recovery path |
|---|---|---|---|
| Application | Vercel | Platform outage | Wait out per Vercel status; if prolonged (>8h), redeploy from GitHub to a standby platform [documented alternative: ●] |
| Application | Vercel | Bad deployment | Instant rollback to previous deployment in Vercel dashboard |
| Database and auth | Supabase | Data corruption / accidental deletion | Restore daily backup (Backup Policy, section 3) |
| Database and auth | Supabase | Project or region loss | Create new project, restore backup, update env vars, redeploy |
| Email | Resend | Outage | Payslip/notification emails queue or fail visibly; re-send after restoration; no data loss (email is not the system of record) |
| DNS / domain | [Registrar ●] | Hijack / expiry | Registrar lock, auto-renew, MFA on registrar account |
| Source code | GitHub | Account compromise | MFA enforced; local clones exist; restore from any developer clone |
| Secrets | Vercel env vars | Loss | Encrypted offline copy of the secrets register; regenerate provider keys |

## 3. Disaster Declaration

The founder/engineering lead declares a disaster when production is down or data integrity is compromised with no fix expected within 2 hours. Declaration starts the communication clock and this plan.

## 4. Recovery Procedures

### 4.1 Full database restore
1. Freeze deployments; put the app in maintenance mode if partially up.
2. Supabase dashboard: Database, Backups; choose the latest good backup (or point-in-time if enabled).
3. Restore in place, or to a new project if the project is lost.
4. New project only: update `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel; redeploy.
5. Run `npx prisma migrate deploy` against the restored database and verify no pending migrations.
6. Re-apply post-backup deletions from the deletion log.
7. Smoke test (login, employee view, payslip PDF, leave request) using the manual QA checklist.
8. Lift maintenance mode; notify customers of restoration and the data-loss window (time between backup and failure).

### 4.2 Application rollback
1. Vercel dashboard: Deployments; promote the last known-good deployment.
2. If a migration accompanied the bad deploy, assess whether it must be rolled back (prefer roll-forward fixes; destructive down-migrations require a backup first).

### 4.3 Credential compromise
Follow the Data Breach Response Policy in parallel: rotate all keys (Supabase anon + service role, Resend, any provider tokens), invalidate sessions, then assess data exposure.

## 5. Communication During Disaster

- Within 2 hours: email all customer HR admins: what is down, expected restoration, whether data is affected. Template in the Business Continuity Plan.
- Updates every 4 hours until resolved.
- Post-incident summary to affected customers within 5 business days.

## 6. Contact List

| Role | Name | Phone | Email |
|---|---|---|---|
| Incident lead | [Founder ●] | [●] | [●] |
| Attorney | [●] | [●] | [●] |
| Supabase support | n/a | n/a | Dashboard support (Pro plan) |
| Vercel support | n/a | n/a | Dashboard support |

## 7. Testing

- Quarterly: backup restore test (Backup Policy section 5).
- Annually: full DR tabletop walking through scenario 4.1 end to end, timed against the 8-hour RTO. Record results and gaps.
