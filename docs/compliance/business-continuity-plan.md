# NovaHR Business Continuity Plan (BCP)

**Version:** 1.0
**Effective Date:** 10 July 2026
**Owner:** Founder
**Review cycle:** Annual

How NovaHR the business keeps operating through disruptions. Technical recovery lives in the Disaster Recovery Plan; security incidents in the Incident Response Plan.

---

## 1. Critical Business Functions

Ranked by tolerance for interruption:

| Function | Max tolerable outage | Continuity approach |
|---|---|---|
| Platform availability (customers run payroll) | 8 business hours; near-zero on month-end pay days | DRP; deployment freezes around month-end |
| Customer support | 1 business day | Email-based; accessible from any device |
| Payroll correctness (SARS table updates each March) | Must land before first March payroll run | Annual update checklist in CALCULATIONS.md |
| Billing and collections | 1 week | Invoice records in accounting system + repo |
| Legal/compliance response (breach, DSAR) | 72-hour statutory clock | Breach policy, attorney on retainer |

## 2. Key Person Risk (solo founder)

The single largest continuity risk is founder unavailability. Mitigations:

- **Access continuity:** credentials for all critical systems (Supabase, Vercel, GitHub, Resend, registrar, bank, accounting) stored in a password manager with a documented emergency access procedure for [trusted person / attorney ●].
- **Runbooks:** deployment, restore, and support procedures are documented in this repo so a competent engineer can operate the platform without oral handover.
- **Instructions letter:** a sealed letter with the attorney naming who may operate or wind down the service, and how customers get their data (Export Window process), if the founder is incapacitated.
- **Successor onboarding target:** a new engineer should reach operational capability from documentation alone within 5 business days.

## 3. Disruption Scenarios and Responses

| Scenario | Response |
|---|---|
| Platform outage (Vercel/Supabase) | DRP; customer comms within 2 hours; status updates every 4 hours |
| Load-shedding / local power or connectivity loss | Cloud infrastructure is unaffected; founder operations continue via UPS/LTE; support SLAs measured in business hours absorb short gaps |
| Founder illness (short) | Support autoresponder with revised response times; P1 payroll issues escalated to [backup contact ●] |
| Founder incapacity (long) | Emergency access procedure; attorney executes instructions letter |
| Banking/payment disruption | Invoices remain payable by EFT to the account in the invoice; alternate account documented with the accountant |
| Office/equipment loss | All systems are cloud-based; replacement laptop plus password manager restores full capability within 1 day |
| Pandemic/travel restrictions | Fully remote operation is the default; no change |

## 4. Month-End Protection Window

Because customers run payroll at month-end:

- No production deployments from the 24th to the 1st unless fixing a P1;
- Backup verification on the 23rd of each month;
- Founder availability (or delegated cover) confirmed for the 25th to the 31st.

## 5. Communication Plan

| Audience | Channel | Trigger | Owner |
|---|---|---|---|
| Customers (HR admins) | Email from hello@novahr.co.za [+ status page ●] | Any disruption over 1 hour | Founder |
| Regulator | Written notification | Data breach (per Breach Policy) | Information Officer |
| Suppliers/partners | Email | Disruption affecting them | Founder |

Outage email template:

> Subject: NovaHR service disruption: [date]
>
> We are currently experiencing [issue]. Your data is safe [adjust if not confirmed]. We expect restoration by [time]. If you are mid-payroll, please [guidance]. Updates will follow every 4 hours. Contact: hello@novahr.co.za.

## 6. Recovery Priorities After Major Disruption

1. Restore platform availability and data integrity (DRP);
2. Notify and support customers, prioritising anyone mid-payroll;
3. Resume support queue;
4. Resume billing;
5. Post-incident review and plan updates.

## 7. Testing and Maintenance

- Annual tabletop covering scenario "founder unavailable during a month-end outage".
- Emergency access procedure verified annually.
- Contact list and instructions letter reviewed annually.
