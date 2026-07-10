# NovaHR Operations Runbook

**Version:** 1.0
**Owner:** Engineering
**Purpose:** every routine and emergency operational task, executable by a competent engineer without oral handover. Companion to the Disaster Recovery Plan and Incident Response Plan.

---

## 1. Environments

| Env | Where | Data |
|---|---|---|
| Local | `npm run dev` against local/branch database | Seed data only (`docs/seed-data.md`) |
| Preview | Vercel preview per PR | Never production data |
| Production | Vercel (main branch) + Supabase production project | Live customer data: all POPIA policies apply |

## 2. Deployment

- **Deploy:** merge/push to `main`; Vercel builds and deploys automatically. CI (lint, `tsc`, vitest) must be green first;
- **Verify:** after deploy, run the smoke set: login, employee list, open a payslip PDF, submit a leave request on the demo tenant;
- **Rollback:** Vercel dashboard, Deployments, promote the previous good deployment (instant). If a migration shipped with the bad deploy, prefer roll-forward; destructive down-migrations require a fresh backup first;
- **Freeze window:** no deploys from the 24th to the 1st except P1 fixes (customers run payroll).

## 3. Database

- **Migrations:** created via `npx prisma migrate dev` locally; applied to production with `npx prisma migrate deploy` (runs in the deploy pipeline [confirm current wiring ●]). Never `db push` against production. Baseline: `baseline_v1` (2026-07-09);
- **Restore:** see Disaster Recovery Plan section 4.1;
- **Direct queries against production:** exceptional, ticket-referenced, read-only unless an incident demands otherwise (Access Control Policy section 3);
- **Seeding:** production is never seeded; demo tenant data is managed separately.

## 4. Secrets Rotation

Order matters: generate new, deploy, verify, then revoke old.

| Secret | Where used | Rotate |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server actions | Supabase dashboard, API settings; update Vercel env; redeploy |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Same flow; anon key is public-by-design but rotate on incident |
| `DATABASE_URL` | Prisma | Supabase connection settings; update Vercel; redeploy |
| `RESEND_API_KEY` | Email | Resend dashboard; update Vercel; send test payslip email |

Record every rotation (what, when, why, by whom) in the secrets register [location ●]. Annual rotation minimum; immediate on suspected exposure (then also: Data Breach Response Policy).

## 5. Email Operations

- Payslip and notification email via Resend from [sending domain ●]; SPF/DKIM/DMARC records live at the DNS host [registrar ●];
- Delivery failures: check Resend logs first (suppressions, bounces), then application logs;
- A bounced payslip email is not data loss: the payslip remains in self-service; notify the HR admin to correct the address.

## 6. Monitoring and Logs

- **App errors:** Vercel dashboard, Logs/Observability, filter by function and timeframe;
- **Database/auth:** Supabase dashboard, Logs;
- **Uptime:** [external ping monitor ●: add before first paying customer, e.g. UptimeRobot on the login page];
- **Dependency status:** vercel-status.com, status.supabase.com, resend-status.com.

## 7. Routine Calendar

| Cadence | Task |
|---|---|
| Monthly (23rd) | Verify latest backup exists ahead of month-end |
| Monthly | Review support inbox metrics; health-score customers (CS process) |
| Quarterly | Restore test (Backup Policy); access review (Access Control Policy); dependency updates |
| Annually (March) | SARS constants update per `payroll-calculations-and-auditing.md` section 3 |
| Annually | Secret rotation, DR tabletop, policy review set |

## 8. Common Support Operations

- **Reset a user's access:** trigger reset email via admin tools; never set passwords manually;
- **Tenant data question:** reproduce on the demo tenant first; access production data only with ticket justification;
- **"Payslip wrong" report:** treat per Incident Response Plan section 4 (calculation incidents); never edit published payslips;
- **Cancellation:** follow the Customer Offboarding Checklist (customer-success docs).
