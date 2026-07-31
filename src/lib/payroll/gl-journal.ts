import type { PayrollRegister } from "./register";

/**
 * General ledger / payroll journal export (Phase 6 HR outputs).
 *
 * Turns a run's totals into balanced debit/credit journal lines a bookkeeper can
 * post. The account mapping is a small constant table (default South African
 * chart-of-accounts labels and codes) so it can be refined per tenant later
 * without touching the balancing logic.
 *
 * Double-entry shape for a monthly payroll:
 *
 *   Dr  Salaries & Wages expense        = gross earnings
 *   Dr  Employer UIF expense            = employer UIF
 *   Dr  Employer SDL expense            = employer SDL
 *     Cr  PAYE payable                  = PAYE withheld
 *     Cr  UIF payable                   = employee UIF + employer UIF
 *     Cr  SDL payable                   = employer SDL
 *     Cr  Other payroll deductions      = medical aid, retirement, loans, etc.
 *     Cr  Net pay / bank clearing       = net paid to employees
 *
 * Debits total = gross + employer UIF + employer SDL.
 * Credits total = PAYE + (employee UIF + employer UIF) + SDL + other + net.
 * Because gross = PAYE + employee UIF + other + net (net-pay identity) and the
 * employer UIF/SDL debits are mirrored by their payable credits, the two sides
 * are equal by construction. A unit test asserts this on a sample run.
 */

export type GlSide = "debit" | "credit";

export interface GlAccount {
  code: string;
  name: string;
}

export interface GlJournalLine {
  accountCode: string;
  accountName: string;
  side: GlSide;
  debit: number;
  credit: number;
}

export interface GlJournal {
  lines: GlJournalLine[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

/**
 * Default account mapping. Codes follow a common SA small-business layout
 * (expenses 5xxx, current liabilities 2xxx). Refine per tenant later by
 * threading a custom map into buildGlJournal.
 */
export const DEFAULT_GL_ACCOUNTS = {
  salariesExpense: { code: "5000", name: "Salaries & Wages" },
  employerUifExpense: { code: "5010", name: "UIF Contribution (Employer)" },
  employerSdlExpense: { code: "5020", name: "Skills Development Levy (Employer)" },
  payePayable: { code: "2100", name: "PAYE Payable (SARS)" },
  uifPayable: { code: "2110", name: "UIF Payable" },
  sdlPayable: { code: "2120", name: "SDL Payable (SARS)" },
  otherDeductionsPayable: { code: "2130", name: "Payroll Deductions Payable" },
  netPayClearing: { code: "2140", name: "Net Pay / Bank Clearing" },
} as const;

export type GlAccountMap = typeof DEFAULT_GL_ACCOUNTS;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Builds a balanced payroll journal from a register's totals. Zero-value lines
 * are omitted to keep the journal readable. The gross earnings debit is derived
 * from the register total so it always equals the sum of the credit-side
 * components (net + PAYE + employee UIF + other deductions).
 */
export function buildGlJournal(
  register: PayrollRegister,
  accounts: GlAccountMap = DEFAULT_GL_ACCOUNTS
): GlJournal {
  const t = register.totals;

  const gross = round2(t.gross);
  const paye = round2(t.paye);
  const employeeUif = round2(t.uif);
  const employerUif = round2(t.employerUif);
  const employerSdl = round2(t.employerSdl);
  const other = round2(t.otherDeductions);
  const net = round2(t.netPay);

  const lines: GlJournalLine[] = [];

  const debit = (acc: GlAccount, amount: number) => {
    if (amount === 0) return;
    lines.push({ accountCode: acc.code, accountName: acc.name, side: "debit", debit: amount, credit: 0 });
  };
  const credit = (acc: GlAccount, amount: number) => {
    if (amount === 0) return;
    lines.push({ accountCode: acc.code, accountName: acc.name, side: "credit", debit: 0, credit: amount });
  };

  // Debits: the cost to the employer.
  debit(accounts.salariesExpense, gross);
  debit(accounts.employerUifExpense, employerUif);
  debit(accounts.employerSdlExpense, employerSdl);

  // Credits: liabilities and the net paid out.
  credit(accounts.payePayable, paye);
  credit(accounts.uifPayable, round2(employeeUif + employerUif));
  credit(accounts.sdlPayable, employerSdl);
  credit(accounts.otherDeductionsPayable, other);
  credit(accounts.netPayClearing, net);

  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));

  return {
    lines,
    totalDebit,
    totalCredit,
    balanced: totalDebit === totalCredit,
  };
}

/** Column headers for the GL journal CSV. */
export const GL_JOURNAL_HEADERS = ["Account code", "Account", "Debit", "Credit"] as const;

/** Serialises a journal into CSV rows, with a trailing totals row. */
export function glJournalToRows(journal: GlJournal): (string | number)[][] {
  const rows: (string | number)[][] = journal.lines.map((l) => [
    l.accountCode,
    l.accountName,
    l.debit ? l.debit.toFixed(2) : "",
    l.credit ? l.credit.toFixed(2) : "",
  ]);
  rows.push(["", "TOTAL", journal.totalDebit.toFixed(2), journal.totalCredit.toFixed(2)]);
  return rows;
}
