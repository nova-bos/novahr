# NovaHR Customer Health Check Process

**Owner:** Customer success (founder initially)
**Cadence:** scored monthly from usage data; reviewed in the monthly business review.
**Purpose:** catch churn risk before the cancellation email, and spot expansion candidates.

---

## 1. Health Score Model

Score each customer Green / Amber / Red on four dimensions; the worst dimension sets the overall colour.

### Payroll cadence (the heartbeat metric)
- **Green:** payroll run and published every month;
- **Amber:** a run calculated but not published, or published late;
- **Red:** no payroll run in the last 35 days. *A payroll product that is not running payroll is churning; treat Red here as urgent.*

### Login activity
- **Green:** HR Admin active weekly; employee self-service adoption above 50%;
- **Amber:** HR Admin active only around pay day; self-service below 25%;
- **Red:** no HR Admin login in 21+ days.

### Support sentiment
- **Green:** tickets resolved and confirmed; no open P1/P2;
- **Amber:** repeated tickets on the same theme, or a frustrated tone;
- **Red:** unresolved P1/P2, complaint, or an escalation in the last 30 days.

### Commercial
- **Green:** invoices current; headcount stable or growing within plan;
- **Amber:** payment late once; headcount near plan limit (upsell) or shrinking (risk);
- **Red:** suspended for non-payment, or downgrade requested.

## 2. Data Sources

- Application data: last run date, publication status, login timestamps, active user counts (admin queries; automate a monthly health report, contact hello@novahr.co.za to configure);
- Support inbox: open tickets, escalations;
- Accounting: invoice status.

## 3. Playbooks by Colour

**Green:** nothing to fix. Quarterly value touch (review template), release notes, ask for a referral or testimonial once per year.

**Amber:** within 5 business days, one targeted action:
- Payroll amber: "Anything blocking this month's run?" email;
- Adoption amber: offer a 20-minute training session or employee rollout help;
- Near plan limit: plan-fit conversation (upsell framed as removing friction);
- Support amber: founder reviews the thread and closes the loop personally.

**Red:** within 1 business day, founder calls (not emails) the account owner. Diagnose using the at-risk playbook in the Renewal Process. Log outcome and next action with a date.

## 4. Review Rhythm

Monthly: score all customers (under 20 customers, this is a 30-minute exercise), update the health register, action Ambers and Reds, and record: total by colour, movements, churn saves, upsells identified.

## 5. Health Register (columns)

Customer | Plan | MRR | Payroll cadence | Logins | Support | Commercial | Overall | Action | Owner | Due
