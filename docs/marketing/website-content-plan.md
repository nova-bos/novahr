# NovaHR Website Content Plan

**Owner:** Founder
**State:** landing page, terms, and privacy routes exist in the app. This plan covers the full public site; draft copy for the two trust pages (Security, Compliance) is included below since their source documents now exist in `docs/`.

---

## 1. Page Inventory

| Page | Route | Source material | Status |
|---|---|---|---|
| Landing | `/` | Exists; refresh proof points from one-pager | Live [refine ●] |
| Features | `/features` | One-pager table + module screenshots | To build |
| Pricing | `/pricing` | `docs/sales/pricing-sheet.md` + in-app tiers | Partially live (landing section) |
| Security | `/security` | Draft below | To build |
| Compliance | `/compliance` | Draft below + POPIA statement | To build |
| FAQ | `/faq` | `docs/customer/faq.md` | To build |
| About | `/about` | Founder story, Nova Business OS suite | To build |
| Contact | `/contact` | hello@novahr.co.za + form | To build |
| Terms | `/terms` | Replace placeholder with `docs/legal/terms-of-service.md` after attorney review | Placeholder live |
| Privacy | `/privacy` | Replace with `docs/compliance/privacy-policy.md` after attorney review | Placeholder live |
| Legal hub | `/legal` | Links: ToS, Privacy, Cookies, AUP, SLA, DPA, PAIA Manual, VDP | To build |
| Blog | `/blog` | `content-strategy-and-calendar.md` | Post-launch |
| Case studies | `/customers` | Requires real customers | Post-launch |
| Free resources | `/resources` | Lead magnets + email gate | To build |

Footer on every page: Terms, Privacy, PAIA Manual, Security, hello@novahr.co.za, company legal name + registration number [●].

## 2. Security Page (draft copy)

> # Security at NovaHR
>
> You are trusting us with ID numbers, salaries, and bank details. Here is exactly how we protect them.
>
> **Encryption everywhere.** All traffic is encrypted with TLS. Data is encrypted at rest with AES-256, including backups.
>
> **Your company's data is isolated.** Every record is separated per company at the database level with row-level security, enforced on every query, not just in application code.
>
> **Least-privilege access.** Employees see only their own data; managers their team; admins their company. Internally, production access is limited to named engineers with multi-factor authentication, and support works through application tools, not raw database access.
>
> **Everything is logged.** Payroll runs, approvals, role changes, and exports are recorded in an audit log your administrators can view.
>
> **Backed up daily.** Automated daily backups with tested restore procedures. Recovery objectives are published in our SLA.
>
> **Built on certified infrastructure.** NovaHR runs on Vercel and Supabase (both SOC 2 Type II), with transactional email via Resend.
>
> **Found a vulnerability?** We welcome good-faith research: read our [Vulnerability Disclosure Policy] and email hello@novahr.co.za with subject "SECURITY REPORT". We respond within 3 business days and will not pursue good-faith researchers.
>
> Questions from your IT or security team? Request our security pack: hello@novahr.co.za.

## 3. Compliance Page (draft copy)

> # Compliance
>
> ## POPIA
> We process employee data as your Operator under a signed Data Processing Agreement, with a registered Information Officer, published [PAIA Manual], breach response within 72 hours, and documented retention and deletion rules. Full detail: our [POPIA Compliance Statement].
>
> ## SARS payroll compliance
> The payroll engine implements the current tax year's PAYE tables, rebates, medical scheme fees tax credits, UIF ceiling, and SDL rules, verified against SARS publications, covered by 200+ automated tests, and updated every March. How we verify: [Payroll Calculations and Auditing].
>
> ## BCEA
> Default leave policies meet BCEA minimums (annual, sick, family responsibility, maternity, parental), payslips carry the section 33 particulars, and records are retained beyond the 3-year requirement.
>
> ## What stays your responsibility
> NovaHR is software, not a tax practitioner: filing EMP201/EMP501, paying SARS, and UI-19 declarations remain yours, with our reports giving you the exact figures. Plain-language detail: [Compliance Disclaimer and Customer Responsibilities].

## 4. Conversion Rules

- One primary CTA sitewide: **Start free trial** (no card required); secondary: **See pricing**;
- Every page answers one visitor question and links the next logical page (Features to Pricing to Trial);
- Trust strip (encryption, POPIA DPA, SA-built, money-back guarantee) on landing, features, and pricing;
- Lead magnet offer on blog and resources pages only (do not distract the trial path elsewhere).
