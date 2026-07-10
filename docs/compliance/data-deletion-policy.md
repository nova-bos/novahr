# NovaHR Data Deletion Policy

**Version:** 1.0
**Effective Date:** 10 July 2026
**Owner:** Information Officer / Engineering
**Review cycle:** Annual

This policy defines how data is securely deleted when a retention period in the Data Retention Policy expires, a valid deletion request is granted, or a subscription ends.

---

## 1. Deletion Triggers

1. Expiry of a retention period in the Data Retention Policy;
2. End of the post-cancellation Export Window (30 days), for tenant data;
3. A granted data subject deletion request (POPIA s 24) where no statutory retention applies;
4. Customer instruction via the Data Processing Agreement;
5. Trial expiry plus 30 days.

## 2. Deletion Standards

| Data location | Method | Timeline |
|---|---|---|
| Production database (Supabase Postgres) | Hard delete of rows (not soft-delete flags) via authenticated deletion job; cascading deletes across tenant-scoped tables | Within 60 days of trigger |
| File storage (payslip PDFs, uploads) | Object deletion via storage API | Same run as database deletion |
| Backups | Not selectively edited; deleted data ages out with backup rotation (retention max 35 days). Restores during this window must re-apply pending deletions before the restored environment serves traffic | Automatic |
| Email system (Resend) | Delivery logs age out per provider retention; no payslip content is stored beyond transient delivery | Provider-managed |
| Logs and analytics | Rolling retention (12-24 months); deletion requests remove direct identifiers where feasible | Rolling |
| Local exports and working copies | Prohibited beyond immediate need; personnel must delete after use | Immediate |

## 3. De-identification Alternative

Where aggregate statistics must survive (e.g. usage metrics), data is irreversibly de-identified per POPIA's definition: all identifiers and reasonably linkable attributes removed, such that re-identification is not reasonably foreseeable. De-identified data falls outside POPIA and may be retained.

## 4. Tenant Offboarding Procedure

1. Cancellation effective date recorded; tenant flagged read-only (Export Window starts).
2. Automated reminder to the customer at day 7 and day 23 of the Export Window to export payslips and reports.
3. Day 30: access revoked.
4. Within 60 days: deletion job removes all tenant rows, storage objects, and auth users; job output (counts per table, timestamp, operator) is written to the deletion log.
5. Backup rotation completes the purge automatically.
6. Written confirmation of deletion is available to the customer on request (DPA clause 7.3).

## 5. Verification and Records

- Every deletion run writes an entry to the **deletion log**: what, when, trigger, executed by, row counts.
- The Information Officer reviews the deletion log quarterly.
- Deletion of a data subject's information is confirmed to the requester in writing.

## 6. Exceptions

Only the Information Officer may approve exceptions (legal hold, statutory retention, technical constraint), in writing, with an expiry date.
