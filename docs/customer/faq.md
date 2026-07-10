# NovaHR Frequently Asked Questions

**Audience:** Prospects and customers. Also the source for the website FAQ page and in-app help.

---

## Product

**What is NovaHR?**
NovaHR is South African HR and payroll software for SMEs: employee records, payroll with SARS-compliant PAYE/UIF/SDL calculations, payslips, leave management, attendance, and reporting, in one web app.

**Who is it for?**
South African businesses from 1 to a few hundred employees that want to run payroll and HR themselves without enterprise complexity or per-payslip bureau fees.

**Do I need payroll experience to use it?**
No. The app guides you through setup, applies the statutory rules automatically, and our guides explain each step. You should still have an accountant verify your first run, as with any payroll change.

**Does NovaHR work on mobile?**
Yes, it is a responsive web app. Employees can view payslips and request leave from a phone.

## Payroll and Compliance

**Are the tax calculations SARS-compliant?**
Yes. NovaHR implements the official SARS tax tables, rebates, medical tax credits, UIF ceiling, and SDL rules for the current tax year, verified against SARS sources and covered by an extensive automated test suite. Details: our Payroll Calculations and Auditing documentation.

**What happens when SARS changes tax rates?**
We update the engine after each annual Budget (effective 1 March) and notify you in release notes. You do not need to do anything except verify your first March run.

**Does NovaHR submit my EMP201/EMP501 to SARS?**
No. NovaHR gives you the exact figures and reports; you (or your accountant) file via eFiling. You stay in control of your SARS profile.

**Does it handle UIF and SDL?**
Yes: 1% employee plus 1% employer UIF up to the statutory ceiling, and 1% SDL where your payroll exceeds R500,000 per year. Both are calculated automatically and shown in reports.

**Is leave BCEA-compliant?**
Default policies match BCEA minimums (15 working days annual leave, 30 days sick per 36-month cycle, 3 days family responsibility). You can configure more generous policies to match your contracts.

**Can employees see their payslips?**
Yes. Employees get self-service access to their own payslips (PDF download), leave balances, and requests. They only see their own data.

## Security and Privacy

**Where is my data stored?**
In encrypted cloud infrastructure (Supabase/Postgres, hosted on [region ●]), with encryption in transit and at rest, daily backups, and strict tenant isolation: your data is cryptographically and logically separated from other companies'.

**Is NovaHR POPIA-compliant?**
Yes. We operate under a Data Processing Agreement with every customer, maintain a registered Information Officer, publish our PAIA Manual and Privacy Policy, and follow a documented breach response process. See our POPIA Compliance Statement.

**Who owns the data?**
You do. Export it any time. If you cancel, you get a 30-day export window, after which we delete it.

**Can NovaHR staff see my payroll?**
Access to production data is restricted to named engineers, only for support and reliability, under logged, least-privilege access. We never use your payroll data for marketing.

## Pricing and Billing

**What does it cost?**
Starter R499/month (up to 10 employees), Growth R999/month (up to 30), Scale R2,499/month (unlimited). Prices exclude VAT. No per-payslip fees, no setup fees.

**Is there a free trial?**
Yes, a full-featured trial. No card required. Trial data carries over when you subscribe.

**Can I cancel anytime?**
Monthly plans: yes, effective end of the billing month. There is also a 14-day money-back guarantee on your first subscription. See the Refund and Cancellation Policy.

**What counts as an employee?**
Active (non-terminated) employee records. Terminated employees kept for history do not count toward your plan limit.

## Getting Started

**How long does setup take?**
Most companies are live within two weeks, including a parallel run for the first payroll. A 10-employee company can complete basic setup in about 30 minutes (see the Quick Start Guide).

**Can I import from Sage/SimplePay/spreadsheets?**
You can capture employees manually today; guided migration help is available on Growth and Scale plans [CSV import: on the roadmap ●].

**What support do I get?**
Email support on all plans (hello@novahr.co.za), priority support and WhatsApp on Growth and Scale, dedicated onboarding on Scale. See the Support Policy for response times.
