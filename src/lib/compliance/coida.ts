// Pure COIDA (Compensation for Occupational Injuries and Diseases Act) Return of
// Earnings logic, form W.As.8. Kept free of "use server" so it can be unit
// tested and imported anywhere. The server action in coida-actions.ts fetches
// payslip data and delegates the aggregation here.
//
// Employers declare each employee's total annual earnings, capped at the maximum
// assessable earnings ceiling gazetted for the assessment year (1 March to end
// February, aligned with the SARS tax year).
//
// Ceilings are per annum. Update this table when the Department of Employment
// and Labour gazettes a new maximum for a year (keyed by assessment start year).
export const COIDA_EARNINGS_CEILING: Record<string, number> = {
  "2021": 484200,
  "2022": 529264,
  "2023": 563520,
  "2024": 597328,
};

const LATEST_CEILING_YEAR = "2024";

/** Maximum assessable earnings for the assessment year (start year, e.g. "2024"). */
export function coidaCeilingForYear(startYear: string): number {
  return COIDA_EARNINGS_CEILING[startYear] ?? COIDA_EARNINGS_CEILING[LATEST_CEILING_YEAR];
}

export interface CoidaEmployeeEarnings {
  employeeId: string;
  employeeNumber: string;
  name: string;
  /** Total remuneration for the year. */
  earnings: number;
  /** Number of distinct months the employee had a payslip (1-12). */
  monthsWorked: number;
}

export interface CoidaEmployeeRow {
  employeeId: string;
  employeeNumber: string;
  name: string;
  actualEarnings: number;
  assessableEarnings: number;
}

export interface CoidaReturn {
  taxYear: string;
  /** Maximum assessable earnings per employee for the year. */
  ceiling: number;
  rows: CoidaEmployeeRow[];
  employeeCount: number;
  totalActualEarnings: number;
  totalAssessableEarnings: number;
  averageEmployees: number;
}

/** Cap each employee's earnings at the year's ceiling and total the return. */
export function buildCoidaReturn(
  taxYear: string,
  employees: CoidaEmployeeEarnings[]
): CoidaReturn {
  const startYear = taxYear.split("/")[0];
  const ceiling = coidaCeilingForYear(startYear);

  let totalActual = 0;
  let totalAssessable = 0;
  let monthTotals = 0;

  const rows: CoidaEmployeeRow[] = employees.map((e) => {
    const assessable = Math.min(e.earnings, ceiling);
    totalActual += e.earnings;
    totalAssessable += assessable;
    monthTotals += e.monthsWorked;
    return {
      employeeId: e.employeeId,
      employeeNumber: e.employeeNumber,
      name: e.name,
      actualEarnings: e.earnings,
      assessableEarnings: assessable,
    };
  });

  rows.sort((a, b) => a.name.localeCompare(b.name));

  return {
    taxYear,
    ceiling,
    rows,
    employeeCount: rows.length,
    totalActualEarnings: totalActual,
    totalAssessableEarnings: totalAssessable,
    // The W.As.8 asks for the average number employed over the 12-month period.
    averageEmployees: monthTotals > 0 ? monthTotals / 12 : 0,
  };
}
