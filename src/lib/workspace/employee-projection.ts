import type { Employee } from "@/lib/types";

/**
 * Role-based projections of employee records for the client workspace payload.
 *
 * The workspace loader must never send an employee's data to a colleague who is
 * not entitled to see it. Rather than trusting the UI to hide fields, we strip
 * them server-side before they leave the server. Three shapes exist:
 *
 * - full: the viewer's own record, and every record for HR/exco.
 * - manager-report: a manager's direct report. Keeps operational data the
 *   manager needs (salary for the team-payroll estimate, leave balances for
 *   approvals) but strips deep personal information (banking, tax number, ID
 *   number, home address, emergency contact) and POPIA-special employment
 *   equity data (race, gender, disability, foreign-national status).
 * - directory: any other colleague. Strips all financial, identifying and
 *   equity data, leaving only what a name-and-role directory needs.
 */

const EMPTY_BANK = {
  bank: "",
  accountNumber: "",
  branchCode: "",
  accountType: "Cheque" as const,
  validated: false,
  validatedAt: null,
};

const EMPTY_EMERGENCY = { name: "", relationship: "", phone: "" };

/** Directory shape: a colleague a viewer may see by name/role only. */
export function sanitizeEmployee(employee: Employee): Employee {
  return {
    ...employee,
    salary: {
      annualGross: 0,
      currency: employee.salary.currency,
      payFrequency: employee.salary.payFrequency,
    },
    bankDetails: { ...EMPTY_BANK },
    taxNumber: "",
    idNumber: "",
    dateOfBirth: undefined,
    address: "",
    emergencyContact: { ...EMPTY_EMERGENCY },
    leaveBalances: [],
    onboarding: undefined,
    // Employment-equity data is special personal information under POPIA.
    equityRace: undefined,
    equityGender: undefined,
    occupationalLevel: undefined,
    hasDisability: undefined,
    foreignNational: undefined,
  };
}

/**
 * A manager's direct report: keeps salary (team-payroll estimate), dateOfBirth
 * (age-based tax rebate in that estimate) and leave balances (approvals), but
 * strips deep personal and equity data a manager has no need to see.
 */
export function sanitizeForManagerReport(employee: Employee): Employee {
  return {
    ...employee,
    bankDetails: { ...EMPTY_BANK },
    taxNumber: "",
    idNumber: "",
    address: "",
    emergencyContact: { ...EMPTY_EMERGENCY },
    equityRace: undefined,
    equityGender: undefined,
    occupationalLevel: undefined,
    hasDisability: undefined,
    foreignNational: undefined,
  };
}

export interface ProjectionSession {
  role: string;
  employeeId?: string | null;
}

/**
 * Projects the full tenant employee list down to what `session` may see, and
 * returns the set of employee ids whose leave/records the viewer may access
 * (their own, plus a manager's direct reports).
 */
export function projectEmployees(
  employees: Employee[],
  session: ProjectionSession
): { employees: Employee[]; visibleEmployeeIds: Set<string> } {
  const isPrivileged = session.role === "hr" || session.role === "exco";
  if (isPrivileged) {
    return { employees, visibleEmployeeIds: new Set(employees.map((e) => e.id)) };
  }

  const selfId = session.employeeId ?? undefined;
  const reportIds = new Set<string>();
  if (session.role === "manager" && selfId) {
    for (const e of employees) {
      if (e.managerId === selfId) reportIds.add(e.id);
    }
  }

  const projected = employees.map((e) => {
    if (selfId && e.id === selfId) return e; // own full record
    if (reportIds.has(e.id)) return sanitizeForManagerReport(e);
    return sanitizeEmployee(e);
  });

  const visibleEmployeeIds = new Set<string>(reportIds);
  if (selfId) visibleEmployeeIds.add(selfId);

  return { employees: projected, visibleEmployeeIds };
}
