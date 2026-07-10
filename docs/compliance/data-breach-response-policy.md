# NovaHR Data Breach Response Policy

**Version:** 1.0 (Draft, pending legal review)
**Effective Date:** 10 July 2026
**Owner:** Information Officer
**Review cycle:** Annual, plus after every incident

This policy governs the response to security compromises involving personal information, implementing POPIA section 22. It works together with the broader Incident Response Plan (which also covers outages and non-data incidents).

---

## 1. What Counts as a Breach

A "security compromise" exists where there are **reasonable grounds to believe** that personal information has been accessed or acquired by an unauthorised person. Examples:

- Unauthorised access to the database or a tenant's data (including cross-tenant access);
- Compromised administrator or user credentials used to view employee data;
- Payslips or exports emailed or exposed to the wrong recipient;
- A lost or stolen device with unencrypted customer data;
- A sub-operator (Supabase, Vercel, Resend) notifying us of a compromise affecting our data;
- Ransomware or destructive access to systems holding personal information.

A vulnerability *without* evidence of access is handled under the Vulnerability Disclosure Policy and Incident Response Plan, not this policy, but must be assessed for possible exploitation.

## 2. Response Team

| Role | Person | Duties |
|---|---|---|
| Incident Lead / Information Officer | [Founder ●] | Decisions, regulator notification, customer communication |
| Technical Lead | [Founder / engineer ●] | Containment, forensics, remediation |
| Legal adviser | [External attorney ●] | Notification wording, legal exposure |

As a solo-founder company, one person may hold several roles; the external attorney contact must be pre-arranged.

## 3. Response Phases and Clock

**The 72-hour clock starts when a compromise is confirmed.** POPIA requires notification "as soon as reasonably possible"; NovaHR's standard is within 72 hours.

### Phase 1: Detect and contain (hour 0-4)
1. Log discovery time, source, and initial facts in the incident record.
2. Contain: revoke compromised credentials and sessions, rotate secrets (Supabase service keys, Resend API key), disable affected accounts, isolate affected functionality (feature flag or maintenance mode) if needed.
3. Preserve evidence: export relevant audit logs, Supabase logs, Vercel logs before rotation destroys context. Do not delete anything.

### Phase 2: Assess (hour 4-24)
4. Determine: what data, which tenants, which data subjects, over what period, by whom (if known).
5. Classify severity: number of data subjects, sensitivity (ID numbers and bank details are high), likelihood of misuse.
6. Engage the attorney if any personal information was likely accessed.

### Phase 3: Notify (within 72 hours of confirmation)
7. **Information Regulator:** written notification per s 22(4): description of the compromise, categories of data, measures taken, recommendation to data subjects, identity of the unauthorised person if known. Submit via the Regulator's prescribed channel (eservices portal / breach notification form).
8. **Affected customers (Responsible Parties):** NovaHR as Operator notifies each affected customer immediately per the DPA, with enough detail for them to meet their own s 22 duties toward their employees.
9. **Data subjects:** where NovaHR is itself the Responsible Party (own contacts), notify affected data subjects in writing (email plus website notice if addresses are unknown), in plain language, with: what happened, what data, what we did, what they should do (e.g. change passwords, watch for phishing), and contact details.
10. Notification may be delayed only if a law enforcement or the Regulator determines it would impede a criminal investigation; record the basis.

### Phase 4: Remediate and close (day 3-30)
11. Fix root cause; verify with tests.
12. Post-incident review within 10 business days: timeline, root cause, what worked, what failed, actions with owners and dates.
13. Update this policy, the Incident Response Plan, and security controls per lessons learned.
14. Retain the full incident record for 5 years.

## 4. Communication Rules

- One voice: only the Incident Lead communicates externally.
- Never speculate, minimise, or admit legal liability in notifications; state facts, actions, and guidance.
- Use pre-approved templates (Appendix A) reviewed by the attorney.
- Internal discussion of the incident happens in a dedicated channel, preserved as part of the record.

## 5. Appendix A: Customer Notification Template

> Subject: Security notice from NovaHR: action required
>
> Dear [Customer],
>
> We are writing to inform you of a security incident affecting your NovaHR account, in line with our Data Processing Agreement and POPIA section 22.
>
> **What happened:** On [date], we identified [factual description]. We confirmed the compromise on [date/time].
> **What information was involved:** [categories of data and affected employees].
> **What we have done:** [containment and remediation steps taken].
> **What we recommend you do:** [reset passwords / inform affected employees / specific guidance]. As the Responsible Party for your employees' information, you may have your own notification obligations under POPIA section 22; we will provide any information you need to meet them.
> **Contact:** [Incident Lead name], hello@novahr.co.za, [phone].
>
> We will provide updates every [cadence] until resolved.

## 6. Testing

Run a tabletop exercise of this policy at least annually (scenario: leaked service key exposing one tenant's payslips) and record the outcome.
