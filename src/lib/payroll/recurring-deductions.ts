import Decimal from "decimal.js";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

/**
 * Recurring post-tax deductions recovered from net pay over several months:
 * employer loans/advances and garnishee (emoluments attachment) orders. Each
 * carries an outstanding balance that is reduced every payroll run until it is
 * settled. These do NOT affect PAYE, UIF or SDL, which are computed on gross.
 */
export interface RecoverableDeduction {
  id: string;
  kind: "loan" | "garnishee" | "other";
  description: string;
  monthlyAmount: number;
  balance: number;
}

export interface AppliedRecovery {
  id: string;
  amount: number;
  newBalance: number;
  settled: boolean;
}

export interface RecurringDeductionResult {
  /** Payslip deduction line items to append. */
  lines: { label: string; amount: number }[];
  /** Per-deduction balance changes to persist. */
  applied: AppliedRecovery[];
  /** Total recovered this run, to subtract from net pay. */
  total: number;
}

function round2(d: Decimal): number {
  return d.toDecimalPlaces(2).toNumber();
}

/**
 * Applies one month of recovery to a set of active recoverable deductions.
 * Each instalment is capped at the remaining balance so it can never over-
 * recover, and a deduction is flagged settled once its balance reaches zero.
 */
export function applyRecurringDeductions(
  deductions: RecoverableDeduction[]
): RecurringDeductionResult {
  const lines: { label: string; amount: number }[] = [];
  const applied: AppliedRecovery[] = [];
  let total = new Decimal(0);

  for (const d of deductions) {
    const balance = new Decimal(d.balance);
    if (balance.lessThanOrEqualTo(0)) continue;
    const instalment = Decimal.min(new Decimal(d.monthlyAmount), balance);
    if (instalment.lessThanOrEqualTo(0)) continue;

    const amount = round2(instalment);
    const newBalance = round2(balance.minus(instalment));
    lines.push({ label: d.description, amount });
    applied.push({ id: d.id, amount, newBalance, settled: newBalance <= 0 });
    total = total.plus(amount);
  }

  return { lines, applied, total: round2(total) };
}
