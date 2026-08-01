import type { PayrollInputValue } from "./calculator";

/**
 * Phase 4 variable pay: shared component-type catalogue and helpers.
 *
 * A variable-pay component is one line captured against an open payroll run for
 * one employee. componentType drives three things:
 *   1. the default tax treatment (regular annualisation vs SARS annual-payment),
 *   2. the payslip line label (which the IRP5 aggregation reads by keyword),
 *   3. whether it is an earning, a deduction, or an hours-based earning.
 *
 * Labels are chosen so the existing label-driven IRP5 bucketing in
 * src/lib/compliance/irp5-actions.ts maps them to the right SARS source code
 * with no change there: "Overtime"->3601 income, "Commission"->3606,
 * "Bonus"/"13th Cheque"/"Back Pay (Annual)"->3605 annual payment.
 */

export type TaxTreatment = "regular" | "annual_payment";

export type ComponentKind = "earning" | "hours" | "deduction";

export interface ComponentDefinition {
  type: string;
  label: string;
  taxTreatment: TaxTreatment;
  kind: ComponentKind;
  /** Statutory multiplier applied to quantity x rate for hours-based components. */
  multiplier?: number;
  /** Short helper describing what to capture. */
  hint: string;
}

// Ordered for display. Hours-based components ask for quantity + rate; the
// amount = quantity x rate x multiplier is resolved by resolveInputAmount.
export const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  { type: "overtime", label: "Overtime", taxTreatment: "regular", kind: "hours", multiplier: 1.5, hint: "Ordinary overtime at 1.5x. Enter hours and hourly rate." },
  { type: "overtime_double", label: "Overtime (2x)", taxTreatment: "regular", kind: "hours", multiplier: 2, hint: "Overtime at 2x. Enter hours and hourly rate." },
  { type: "sunday_time", label: "Sunday Time", taxTreatment: "regular", kind: "hours", multiplier: 2, hint: "Sunday work at 2x (1.5x if ordinarily works Sundays). Enter hours and rate." },
  { type: "public_holiday_time", label: "Public Holiday Time", taxTreatment: "regular", kind: "hours", multiplier: 2, hint: "Public holiday work at 2x. Enter hours and hourly rate." },
  { type: "night_shift", label: "Night Shift Allowance", taxTreatment: "regular", kind: "hours", multiplier: 1, hint: "Night shift allowance. Enter hours and per-hour allowance." },
  { type: "standby", label: "Standby Allowance", taxTreatment: "regular", kind: "earning", hint: "Standby allowance for the period." },
  { type: "commission", label: "Commission", taxTreatment: "regular", kind: "earning", hint: "Commission earned this period." },
  { type: "allowance_custom", label: "Allowance", taxTreatment: "regular", kind: "earning", hint: "Custom taxable allowance." },
  { type: "back_pay", label: "Back Pay (Annual)", taxTreatment: "annual_payment", kind: "earning", hint: "Back pay taxed as a non-recurring annual payment." },
  { type: "bonus", label: "Bonus", taxTreatment: "annual_payment", kind: "earning", hint: "Bonus taxed via the SARS non-recurring method." },
  { type: "thirteenth_cheque", label: "13th Cheque", taxTreatment: "annual_payment", kind: "earning", hint: "13th cheque taxed via the SARS non-recurring method." },
  { type: "deduction_custom", label: "Deduction", taxTreatment: "regular", kind: "deduction", hint: "Custom post-tax cash deduction." },
];

export const COMPONENT_BY_TYPE = new Map(COMPONENT_DEFINITIONS.map((d) => [d.type, d]));

/** All valid component type strings (for validation). */
export const COMPONENT_TYPES = COMPONENT_DEFINITIONS.map((d) => d.type);

/**
 * Components valid as recurring monthly items: fixed-amount, regularly-taxed
 * earnings and deductions. Hours-based components (overtime, Sunday time) and
 * annual-payment components (bonus, 13th cheque) vary per period and are
 * excluded.
 */
export function isRecurringComponentType(type: string): boolean {
  const def = COMPONENT_BY_TYPE.get(type);
  return !!def && def.kind !== "hours" && def.taxTreatment === "regular";
}

/** The component definitions that may be set up as recurring. */
export const RECURRING_COMPONENTS = COMPONENT_DEFINITIONS.filter((d) => isRecurringComponentType(d.type));

/**
 * Resolves the final rand amount for a component. Hours-based components use
 * quantity x rate x multiplier; everything else uses the explicit amount.
 */
export function resolveInputAmount(
  type: string,
  fields: { amount?: number; quantity?: number; rate?: number }
): number {
  const def = COMPONENT_BY_TYPE.get(type);
  if (def && def.kind === "hours") {
    const q = fields.quantity ?? 0;
    const r = fields.rate ?? 0;
    const m = def.multiplier ?? 1;
    return Math.round(q * r * m * 100) / 100;
  }
  return Math.round((fields.amount ?? 0) * 100) / 100;
}

/**
 * Maps a persisted PayrollInput row (or a captured draft) into the plain
 * PayrollInputValue the calculator consumes. The label falls back to the
 * component definition's canonical label so IRP5 bucketing stays predictable.
 */
export function toInputValue(row: {
  componentType: string;
  label?: string | null;
  amount: number;
  taxTreatment?: string | null;
  quantity?: number | null;
  rate?: number | null;
}): PayrollInputValue {
  const def = COMPONENT_BY_TYPE.get(row.componentType);
  const treatment = (row.taxTreatment as TaxTreatment) ?? def?.taxTreatment ?? "regular";
  return {
    componentType: row.componentType,
    label: row.label && row.label.trim() !== "" ? row.label : def?.label ?? row.componentType,
    amount: row.amount,
    taxTreatment: treatment === "annual_payment" ? "annual_payment" : "regular",
    quantity: row.quantity ?? undefined,
    rate: row.rate ?? undefined,
  };
}
