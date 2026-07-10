# NovaHR ROI Calculator

**Format:** methodology + worked example. Build as a spreadsheet (Google Sheets, shared per prospect) and later as a web calculator on the pricing page.

---

## Inputs (ask the prospect)

| Input | Symbol | Typical SME value |
|---|---|---|
| Number of employees | E | 15 |
| Current payroll method | | Bureau / accountant / spreadsheet |
| Bureau or accountant fee per month | B | R80 x E = R1,200 |
| Hours/month the admin person spends on payroll + payslips + leave admin | H | 12 |
| Fully loaded hourly cost of that person | C | R250 |
| SARS penalties or corrections in the last 12 months | P | R0-R5,000 |
| Paper/printing/courier for payslips per month | S | R150 |

## Formula

**Current monthly cost** = B + (H x C) + (P / 12) + S

**NovaHR monthly cost** = plan price + (H' x C), where H' is residual admin time (measured onboarding experience: roughly one-third of H, since capture, calculation, payslip distribution, and leave chasing are automated)

**Monthly saving** = Current - NovaHR
**Payback period** = onboarding effort (about 10 admin hours x C, once) / monthly saving

## Worked Example (15 employees, Growth plan R999)

| | Current | With NovaHR |
|---|---|---|
| Bureau fees | R1,200 | R0 |
| Admin time | 12h x R250 = R3,000 | 4h x R250 = R1,000 |
| Penalties amortised | R2,400 / 12 = R200 | R0 (deadline visibility; figures always ready) |
| Payslip distribution | R150 | R0 (self-service) |
| Software | R0 | R999 |
| **Total/month** | **R4,550** | **R1,999** |

**Saving: R2,551 per month (R30,612/year). Payback: under 1 month.**

## Soft Benefits (state, do not price)

- Employees stop interrupting HR for payslips and balances (self-service);
- Audit trail for CCMA disputes and audits;
- POPIA posture: encrypted system vs spreadsheets on laptops;
- Owner visibility: real-time cost and leave liability dashboards;
- No key-person risk in a spreadsheet only one person understands.

## Rules for Honest Use

- Use the prospect's real numbers, not the typicals;
- If their current cost is genuinely lower (e.g. 3 employees, accountant does it for free), say so and sell on control and compliance instead, or tell them to stay put until they grow: honesty converts later;
- Never claim NovaHR prevents all penalties; it provides the figures and visibility, filing remains theirs.
