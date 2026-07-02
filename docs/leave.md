# Leave management

NovaHR implements the full South African statutory leave framework (BCEA sections 20 to 27,
as read with the Constitutional Court's interim order in *Van Wyk v Minister of Employment
and Labour*, October 2025), plus common company-policy leave.

## Leave types and entitlements

Defined in `src/lib/config/leave.ts`; durations are working days for a five-day week.

| Type | Default | Statutory basis | Paid by employer |
| --- | --- | --- | --- |
| Annual | 18 days/year | BCEA s20 minimum is 21 consecutive days (15 working days) | Yes |
| Sick | 30 days per 36-month cycle | BCEA s22 | Yes |
| Family responsibility | 3 days/year | BCEA s27 (after 4 months' service, 4+ days/week) | Yes |
| Maternity | 4 months (~88 days) | BCEA s25 | No (UIF benefits) |
| Parental | 10 consecutive days | BCEA s25A | No (UIF benefits) |
| Adoption | 10 weeks (~50 days) | BCEA s25B (child under 2) | No (UIF benefits) |
| Commissioning parental | 10 weeks (~50 days) | BCEA s25C (surrogacy) | No (UIF benefits) |
| Study | 5 days/year | Company policy (not statutory) | Yes |
| Unpaid | 5 days/year | Company policy | No |

**Van Wyk interim position** (effective until Parliament amends the BCEA, deadline October
2028): all parents collectively share four months plus ten days of parental leave and may
divide it between themselves. NovaHR keeps the distinct types for record-keeping and UIF
claims; the policy descriptions surface the shareability.

## Working-day counting

`src/lib/leave/business-days.ts` counts leave in working days: weekends and South African
public holidays are excluded. The server recomputes the day count from the date range on
every request; the client-supplied value is never trusted.

Public holidays for 2026-2028 are embedded, including the Public Holidays Act rule that a
holiday falling on a Sunday moves its observance to the following Monday. The full calendar
is visible in the app under **Leave > Public holidays**. Extend `SA_PUBLIC_HOLIDAYS` before
2029 (a unit test will start failing for uncovered years if ranges are queried).

## Balances

- New employees get a `LeaveBalance` row per leave type
  (`DEFAULT_LEAVE_TOTALS` in `src/lib/config/leave.ts`).
- Existing employees were backfilled by migration `20260702090001_backfill_leave_balances`,
  which also raised legacy sick balances from 10 to the BCEA-correct 30 per cycle.
- Approval increments `used` via an upsert, so employees created before a leave type existed
  still work.

## Request lifecycle

1. Employee (or HR/manager on their behalf, enforced by `requireEmployeeScope`) submits a
   request with optional supporting document (10 MB, JPEG/PNG/PDF).
2. HR and managers are emailed (Resend); a notification and activity entry are created.
3. HR can decide any request; a manager can decide direct reports' requests but never their
   own. The decider's name comes from the session, not the client.
4. Approval increments the balance; the employee is emailed the outcome.

## Payroll interaction

Approved unpaid leave days can be passed to the payroll calculator
(`calculateMonthlyPayroll` options) to reduce the pay base pro rata; the deduction appears
as an "Unpaid Leave" line on the payslip.
