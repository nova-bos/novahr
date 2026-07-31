import Decimal from "decimal.js";

Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

/**
 * The minimal employee shape ETI needs. Works with both the client-side
 * Employee type and a raw Prisma Employee row (which has no dateOfBirth column,
 * only idNumber). When dateOfBirth is absent it is derived from the SA ID.
 */
export interface EtiEmployee {
  idNumber: string;
  startDate: string | Date;
  dateOfBirth?: string | null;
}

/**
 * Derives date of birth (YYYY-MM-DD) from the first six digits of a South
 * African ID number (YYMMDD). The century is inferred: a two-digit year at or
 * below the current year's last two digits is treated as 2000s, otherwise
 * 1900s. Returns null for anything that is not a parseable 6-digit prefix.
 */
export function deriveDateOfBirthFromSaId(idNumber: string): string | null {
  const digits = (idNumber ?? "").replace(/\D/g, "");
  if (digits.length < 6) return null;
  const yy = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const currentYy = new Date().getFullYear() % 100;
  const century = yy <= currentYy ? 2000 : 1900;
  const year = century + yy;
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/**
 * Employment Tax Incentive (ETI) engine.
 *
 * ETI reduces an employer's monthly PAYE liability for qualifying young
 * employees. It is claimed on the EMP201 and reduces the PAYE payable to SARS
 * (it is NOT a deduction from the employee's pay). An employer may claim ETI
 * for a maximum of 24 qualifying months per employee, at a higher rate in the
 * first 12 months and a lower rate in the second 12 months.
 *
 * IMPORTANT: the monetary bands below are tax-sensitive and change by Budget.
 * The values encoded here follow the structure effective 1 April 2025
 * (eligible remuneration up to R7,500; first-band 60%). Before this is used to
 * calculate a real EMP201 submission, VERIFY every threshold, rate and cap
 * against the current official SARS "Guide to the Employment Tax Incentive"
 * (sars.gov.za). Treat this the same way the PAYE tables in calculator.ts are
 * treated: verified line by line, with a tripwire test in eti.test.ts.
 */

// The maximum monthly remuneration for which any ETI may be claimed.
export const ETI_REMUNERATION_CEILING = new Decimal("7500");

// National Minimum Wage, per hour. The 2025 gazetted NMW is R28.79/hour.
// REVIEW this every year: the NMW is re-gazetted (usually in March) and must
// be bumped upward when it is. The ETI minimum-wage gate is derived from this.
export const NATIONAL_MINIMUM_WAGE_PER_HOUR = new Decimal("28.79");

// Ordinary hours used to convert an hourly rate to a monthly equivalent and to
// gross up / apportion sub-full-month remuneration. The Employment Tax
// Incentive Act works on a 160-hour month.
export const ETI_ORDINARY_HOURS = new Decimal("160");

// Minimum monthly wage gate below which ETI may not be claimed. Set to the
// National Minimum Wage monthly equivalent (NMW per hour * 160 ordinary hours =
// R28.79 * 160 = R4,606.40). The previous R2,000 floor sat below the NMW and
// let employers claim ETI on sub-minimum wages, which the ETI Act prohibits.
// Where a sector or bargaining-council wage is higher, pass it via
// EtiInput.minMonthlyWage to override. REVIEW when the NMW is gazetted upward.
export const ETI_DEFAULT_MIN_MONTHLY_WAGE = NATIONAL_MINIMUM_WAGE_PER_HOUR.times(
  ETI_ORDINARY_HOURS
); // R4,606.40

// The month (inclusive) from which ETI may first be claimed for any employee.
export const ETI_START_DATE = new Date("2013-10-01T00:00:00.000Z");

// Qualifying age window, measured at the last day of the month being processed.
export const ETI_MIN_AGE = 18;
export const ETI_MAX_AGE = 29;

// Total qualifying months an employer may claim per employee.
export const ETI_MAX_QUALIFYING_MONTHS = 24;

/**
 * A single formula band. `amount` is evaluated against the monthly
 * remuneration R when lowerInclusive <= R < upperExclusive.
 *   kind "percent": amount = rate * R
 *   kind "fixed":   amount = value
 *   kind "taper":   amount = value - taperRate * (R - lowerInclusive)
 */
type EtiBand =
  | { lowerInclusive: string; upperExclusive: string; kind: "percent"; rate: string }
  | { lowerInclusive: string; upperExclusive: string; kind: "fixed"; value: string }
  | { lowerInclusive: string; upperExclusive: string; kind: "taper"; value: string; taperRate: string };

// First 12 qualifying months. VERIFY against the current SARS ETI guide.
const ETI_BANDS_FIRST_12: EtiBand[] = [
  { lowerInclusive: "0",    upperExclusive: "2500", kind: "percent", rate: "0.60" },
  { lowerInclusive: "2500", upperExclusive: "5500", kind: "fixed",   value: "1500" },
  { lowerInclusive: "5500", upperExclusive: "7500", kind: "taper",   value: "1500", taperRate: "0.75" },
];

// Second 12 qualifying months (half the first-year values). VERIFY.
const ETI_BANDS_SECOND_12: EtiBand[] = [
  { lowerInclusive: "0",    upperExclusive: "2500", kind: "percent", rate: "0.30" },
  { lowerInclusive: "2500", upperExclusive: "5500", kind: "fixed",   value: "750" },
  { lowerInclusive: "5500", upperExclusive: "7500", kind: "taper",   value: "750", taperRate: "0.375" },
];

export type EtiDisqualification =
  | "age_out_of_range"
  | "no_id_number"
  | "employed_before_2013"
  | "remuneration_above_ceiling"
  | "below_minimum_wage"
  | "qualifying_months_exhausted"
  | "employment_type_excluded";

export interface EtiInput {
  /** The period being processed, "YYYY-MM". Age and tenure are measured here. */
  period: string;
  /** Age at the last day of the period. If omitted, derived from the employee. */
  age?: number;
  /** ETI remuneration for the month (gross, per the SARS definition). */
  monthlyRemuneration: number;
  /** Count of months already claimed for this employee (0 to 24). */
  monthsAlreadyClaimed: number;
  /** Minimum monthly wage floor for this employee. */
  minMonthlyWage?: number;
  /**
   * Ordinary hours actually worked in the month. Defaults to 160 (a full ETI
   * month) so existing callers are unchanged. When fewer than 160 hours are
   * worked, both the wage-gate test and the ETI amount are computed on the
   * 160-hour grossed-up remuneration, then the amount is apportioned back down
   * by hoursWorked / 160, per the ETI Act's 160-hour rule.
   */
  hoursWorked?: number;
  /**
   * True when the employer is statutorily barred from claiming ETI for this
   * employee, e.g. national, provincial or local government employers and other
   * connected/excluded employers. Defaults to false so existing callers are
   * unchanged. When set, emits the employment_type_excluded disqualification.
   */
  employmentExcluded?: boolean;
}

export interface EtiResult {
  qualifies: boolean;
  amount: number;
  /** 1..24 for the qualifying month this claim represents, else null. */
  qualifyingMonth: number | null;
  /** Reasons the employee does not qualify (empty when qualifies is true). */
  disqualifications: EtiDisqualification[];
}

function lastDayOfPeriod(period: string): Date {
  const [year, month] = period.split("-").map(Number);
  // Day 0 of the next month is the last day of this month.
  return new Date(year, month, 0);
}

function ageAt(dateOfBirth: string, at: Date): number {
  const dob = new Date(dateOfBirth);
  let age = at.getFullYear() - dob.getFullYear();
  const m = at.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < dob.getDate())) age--;
  return age;
}

function bandAmount(bands: EtiBand[], remuneration: Decimal): Decimal {
  const band = bands.find(
    (b) =>
      remuneration.greaterThanOrEqualTo(b.lowerInclusive) &&
      remuneration.lessThan(b.upperExclusive)
  );
  if (!band) return new Decimal(0);
  if (band.kind === "percent") return remuneration.times(band.rate);
  if (band.kind === "fixed") return new Decimal(band.value);
  return Decimal.max(
    new Decimal(band.value).minus(remuneration.minus(band.lowerInclusive).times(band.taperRate)),
    0
  );
}

/**
 * Computes the ETI amount claimable for one employee for one month.
 * Returns qualifies=false with the failing reasons when not claimable.
 *
 * 160-hour rule (worked example). A qualifying employee works 80 ordinary hours
 * in the month for actual remuneration of R2,000:
 *   grossedUp   = 2000 * 160 / 80 = R4,000   (used for wage-gate and band lookup)
 *   wage gate   = R4,000 >= R4,606.40 NMW floor? No -> below_minimum_wage.
 * If instead the employee earned R2,500 for those 80 hours:
 *   grossedUp   = 2500 * 160 / 80 = R5,000   (>= R4,606.40 floor, passes)
 *   band ETI    = middle band -> R1,500 on the grossed-up figure
 *   final ETI   = 1500 * 80 / 160 = R750.
 */
export function calculateEti(input: EtiInput, employee: EtiEmployee): EtiResult {
  const disqualifications: EtiDisqualification[] = [];

  const periodEnd = lastDayOfPeriod(input.period);
  const dateOfBirth = employee.dateOfBirth ?? deriveDateOfBirthFromSaId(employee.idNumber);
  const age = input.age ?? (dateOfBirth ? ageAt(dateOfBirth, periodEnd) : NaN);

  if (Number.isNaN(age) || age < ETI_MIN_AGE || age > ETI_MAX_AGE) {
    disqualifications.push("age_out_of_range");
  }

  if (!employee.idNumber) {
    disqualifications.push("no_id_number");
  }

  if (input.employmentExcluded) {
    disqualifications.push("employment_type_excluded");
  }

  if (new Date(employee.startDate) < ETI_START_DATE) {
    disqualifications.push("employed_before_2013");
  }

  // 160-hour apportionment. When fewer than 160 ordinary hours are worked, the
  // wage-gate test and the ETI band lookup run on the grossed-up 160-hour
  // equivalent; the resulting amount is apportioned back down afterwards. When
  // hoursWorked is >= 160 or undefined the factor is 1 and behaviour is as before.
  const hoursWorked = new Decimal(input.hoursWorked ?? ETI_ORDINARY_HOURS.toNumber());
  const actualRemuneration = new Decimal(input.monthlyRemuneration);
  const grossUp =
    hoursWorked.greaterThan(0) && hoursWorked.lessThan(ETI_ORDINARY_HOURS)
      ? ETI_ORDINARY_HOURS.dividedBy(hoursWorked)
      : new Decimal(1);
  const remuneration = actualRemuneration.times(grossUp);
  const apportion =
    hoursWorked.greaterThan(0) && hoursWorked.lessThan(ETI_ORDINARY_HOURS)
      ? hoursWorked.dividedBy(ETI_ORDINARY_HOURS)
      : new Decimal(1);

  if (remuneration.greaterThanOrEqualTo(ETI_REMUNERATION_CEILING)) {
    disqualifications.push("remuneration_above_ceiling");
  }

  const minWage = new Decimal(input.minMonthlyWage ?? ETI_DEFAULT_MIN_MONTHLY_WAGE);
  if (remuneration.lessThan(minWage)) {
    disqualifications.push("below_minimum_wage");
  }

  if (
    input.monthsAlreadyClaimed < 0 ||
    input.monthsAlreadyClaimed >= ETI_MAX_QUALIFYING_MONTHS
  ) {
    disqualifications.push("qualifying_months_exhausted");
  }

  if (disqualifications.length > 0) {
    return { qualifies: false, amount: 0, qualifyingMonth: null, disqualifications };
  }

  const qualifyingMonth = input.monthsAlreadyClaimed + 1;
  const bands = qualifyingMonth <= 12 ? ETI_BANDS_FIRST_12 : ETI_BANDS_SECOND_12;
  // Compute the band ETI on the grossed-up figure, then apportion back down.
  const amount = bandAmount(bands, remuneration).times(apportion).toDecimalPlaces(2);

  return {
    qualifies: true,
    amount: amount.toNumber(),
    qualifyingMonth,
    disqualifications: [],
  };
}

export interface EtiUtilisation {
  /** ETI actually used to reduce this month's PAYE. */
  etiUtilised: number;
  /** Unused ETI rolled into the next month of the same reconciliation period. */
  etiCarriedForward: number;
  /** PAYE remaining after ETI, never negative. */
  payablePaye: number;
}

/**
 * Applies ETI against a month's PAYE, honouring carry-forward. ETI may only
 * reduce PAYE to zero, never below: any excess (calculated ETI plus ETI brought
 * forward, minus PAYE) is carried into the next month rather than lost. This is
 * the fix for silently dropping ETI when it exceeds PAYE.
 *
 * Carry-forward accumulates within a SARS reconciliation period only. Callers
 * must pass etiBroughtForward = 0 at the start of a period (March and September)
 * because unused ETI is reconciled/refunded at period end, not rolled across.
 */
export function applyEti(
  paye: number,
  etiCalculated: number,
  etiBroughtForward = 0
): EtiUtilisation {
  const available = new Decimal(etiCalculated).plus(etiBroughtForward);
  const payeDec = new Decimal(paye);
  const utilised = Decimal.min(available, payeDec);
  return {
    etiUtilised: utilised.toDecimalPlaces(2).toNumber(),
    etiCarriedForward: available.minus(utilised).toDecimalPlaces(2).toNumber(),
    payablePaye: payeDec.minus(utilised).toDecimalPlaces(2).toNumber(),
  };
}

/**
 * True when the period ("YYYY-MM") is the first month of a SARS reconciliation
 * period: March (interim) or September (final). No ETI is brought forward into
 * these months.
 */
export function isReconciliationPeriodStart(period: string): boolean {
  const month = Number(period.split("-")[1]);
  return month === 3 || month === 9;
}

/** Returns the previous month for a period string ("YYYY-MM"). */
export function previousPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 2, 1); // month is 1-based, go back one
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
