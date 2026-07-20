"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { claimNextEmployeeNumber } from "@/lib/employee-numbers/actions";
import { DEFAULT_LEAVE_TOTALS } from "@/lib/config/leave";
import { saIdNumber, saPhone, bankAccountNumber, branchCode } from "@/lib/schemas/sa";
import type { CsvRow } from "./import-columns";
import type {
  LeaveType,
  EmploymentType,
  PayFrequency,
  EquityRace,
  EquityGender,
  OccupationalLevel,
} from "@/lib/types";

export type { CsvRow } from "./import-columns";

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportEmployeesResult {
  imported: number;
  errors: ImportRowError[];
}

const EMPLOYMENT_TYPES: EmploymentType[] = ["full_time", "part_time", "contract"];
const PAY_FREQUENCIES: PayFrequency[] = ["monthly", "biweekly", "weekly"];
const RACES: EquityRace[] = ["african", "coloured", "indian", "white", "other"];
const GENDERS: EquityGender[] = ["male", "female", "other"];
const LEVELS: OccupationalLevel[] = [
  "top_management",
  "senior_management",
  "professional_mid",
  "skilled_technical",
  "semi_skilled",
  "unskilled",
];

const AVATAR_PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6",
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4",
];

function randomAvatarColor(): string {
  return AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];
}

function toInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Strip currency symbols, spaces and thousands separators from a money field. */
function cleanNumber(value: string): string {
  return value.replace(/[^\d.-]/g, "");
}

function parseBool(value: string): boolean {
  return /^(y|yes|true|1)$/i.test(value.trim());
}

/** Normalise an enum-style value: lowercase, spaces and hyphens become underscores. */
function normEnum(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]/g, "_");
}

function normEmploymentType(value: string): EmploymentType {
  const v = normEnum(value);
  return (EMPLOYMENT_TYPES as string[]).includes(v) ? (v as EmploymentType) : "full_time";
}

function normPayFrequency(value: string): PayFrequency {
  const v = normEnum(value);
  return (PAY_FREQUENCIES as string[]).includes(v) ? (v as PayFrequency) : "monthly";
}

function normAccountType(value: string): string {
  return value.trim().toLowerCase() === "savings" ? "Savings" : "Cheque";
}

function optionalNumber(value: string): number | null {
  const cleaned = cleanNumber(value);
  if (!cleaned) return null;
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

function validateRow(row: CsvRow, rowNumber: number): ImportRowError[] {
  const errs: ImportRowError[] = [];
  const add = (field: string, message: string) => errs.push({ row: rowNumber, field, message });

  if (!row.firstName?.trim()) add("firstName", "First name is required.");
  if (!row.lastName?.trim()) add("lastName", "Last name is required.");

  if (!row.email?.trim()) add("email", "Email is required.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) add("email", "Email is not valid.");

  if (!row.phone?.trim()) add("phone", "Phone is required.");
  else if (!saPhone.safeParse(row.phone.trim()).success)
    add("phone", "Phone must be a valid South African number, e.g. 071 234 5678.");

  if (!row.idNumber?.trim()) add("idNumber", "SA ID number is required.");
  else if (!saIdNumber.safeParse(row.idNumber.trim()).success)
    add("idNumber", "SA ID number is invalid (must be 13 digits and pass the checksum).");

  if (row.taxNumber?.trim() && !/^\d{10}$/.test(row.taxNumber.trim()))
    add("taxNumber", "Tax number must be 10 digits.");

  if (!row.jobTitle?.trim()) add("jobTitle", "Job title is required.");

  if (!row.startDate?.trim()) add("startDate", "Start date is required.");
  else if (isNaN(Date.parse(row.startDate.trim())))
    add("startDate", "Start date must be a valid date (YYYY-MM-DD).");

  if (row.employmentType?.trim() && !(EMPLOYMENT_TYPES as string[]).includes(normEnum(row.employmentType)))
    add("employmentType", "Employment type must be full_time, part_time or contract.");

  if (row.payFrequency?.trim() && !(PAY_FREQUENCIES as string[]).includes(normEnum(row.payFrequency)))
    add("payFrequency", "Pay frequency must be monthly, biweekly or weekly.");

  if (!row.annualGross?.trim()) add("annualGross", "Annual gross salary is required.");
  else {
    const salary = Number(cleanNumber(row.annualGross));
    if (isNaN(salary) || salary <= 0) add("annualGross", "Annual gross salary must be a positive number.");
  }

  for (const f of ["travelAllowance", "housingAllowance", "medicalAid", "retirementAnnuity"] as const) {
    if (row[f]?.trim()) {
      const n = Number(cleanNumber(row[f]));
      if (isNaN(n) || n < 0) add(f, "Must be a valid amount.");
    }
  }

  if (row.pensionContributionPct?.trim()) {
    const p = Number(cleanNumber(row.pensionContributionPct));
    if (isNaN(p) || p < 0 || p > 50) add("pensionContributionPct", "Pension contribution must be between 0 and 50.");
  }

  if (!row.bank?.trim()) add("bank", "Bank is required.");
  if (!row.accountNumber?.trim()) add("accountNumber", "Account number is required.");
  else if (!bankAccountNumber.safeParse(row.accountNumber.replace(/\s/g, "")).success)
    add("accountNumber", "Account number must be 6 to 11 digits.");

  if (!row.branchCode?.trim()) add("branchCode", "Branch code is required.");
  else if (!branchCode.safeParse(row.branchCode.replace(/\s/g, "")).success)
    add("branchCode", "Branch code must be 6 digits.");

  if (row.emergencyPhone?.trim() && !saPhone.safeParse(row.emergencyPhone.trim()).success)
    add("emergencyPhone", "Emergency contact phone must be a valid South African number.");

  if (row.equityRace?.trim() && !(RACES as string[]).includes(normEnum(row.equityRace)))
    add("equityRace", "Equity race must be african, coloured, indian, white or other.");
  if (row.equityGender?.trim() && !(GENDERS as string[]).includes(normEnum(row.equityGender)))
    add("equityGender", "Equity gender must be male, female or other.");
  if (row.occupationalLevel?.trim() && !(LEVELS as string[]).includes(normEnum(row.occupationalLevel)))
    add("occupationalLevel", "Occupational level is not one of the allowed values.");

  return errs;
}

export async function importEmployeesFromCsvAction(
  rows: CsvRow[]
): Promise<ImportEmployeesResult> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;

  const errors: ImportRowError[] = [];
  const validRows: { row: CsvRow; rowNumber: number }[] = [];

  rows.forEach((row, i) => {
    const rowErrors = validateRow(row, i + 1);
    if (rowErrors.length > 0) errors.push(...rowErrors);
    else validRows.push({ row, rowNumber: i + 1 });
  });

  // Preload existing employees so manager links can resolve by email, including
  // managers that appear later in the same file (filled in after creation).
  const emailToId = new Map<string, string>();
  await runAsTenant(tenantId, async (tx) => {
    const existing = await tx.employee.findMany({ where: { tenantId }, select: { id: true, email: true } });
    for (const e of existing) emailToId.set(e.email.toLowerCase(), e.id);
  });

  const leavePolicy = await runAsTenant(tenantId, (tx) =>
    tx.tenantLeavePolicy.findUnique({ where: { tenantId } })
  );
  const leaveTotals: Record<LeaveType, number> = leavePolicy
    ? {
        annual: leavePolicy.annualDays,
        sick: leavePolicy.sickDays,
        family: leavePolicy.familyDays,
        maternity: leavePolicy.maternityDays,
        parental: leavePolicy.parentalDays,
        adoption: leavePolicy.adoptionDays,
        commissioning: leavePolicy.commissioningDays,
        study: leavePolicy.studyDays,
        unpaid: leavePolicy.unpaidDays,
      }
    : DEFAULT_LEAVE_TOTALS;

  let imported = 0;
  const managerLinks: { employeeId: string; managerEmail: string; rowNumber: number }[] = [];

  for (const { row, rowNumber } of validRows) {
    try {
      await runAsTenant(tenantId, async (tx) => {
        const employeeNumber = await claimNextEmployeeNumber(tenantId, tx);
        const firstName = row.firstName.trim();
        const lastName = row.lastName.trim();

        const created = await tx.employee.create({
          data: {
            tenantId,
            employeeNumber,
            firstName,
            lastName,
            preferredName: row.preferredName?.trim() || null,
            email: row.email.trim(),
            phone: row.phone.trim(),
            avatarColor: randomAvatarColor(),
            initials: toInitials(firstName, lastName),
            jobTitle: row.jobTitle.trim(),
            department: row.department?.trim() || "General",
            employmentType: normEmploymentType(row.employmentType ?? ""),
            status: "active",
            startDate: new Date(row.startDate.trim()),
            location: row.location?.trim() ?? "",
            salaryAnnualGross: Number(cleanNumber(row.annualGross)),
            salaryCurrency: "ZAR",
            salaryPayFrequency: normPayFrequency(row.payFrequency ?? ""),
            salaryTravelAllowance: optionalNumber(row.travelAllowance ?? ""),
            salaryHousingAllowance: optionalNumber(row.housingAllowance ?? ""),
            salaryPensionContributionPct: optionalNumber(row.pensionContributionPct ?? ""),
            salaryMedicalAid: optionalNumber(row.medicalAid ?? ""),
            salaryRetirementAnnuity: optionalNumber(row.retirementAnnuity ?? ""),
            bankName: row.bank.trim(),
            bankAccountNumber: row.accountNumber.replace(/\s/g, "").trim(),
            bankBranchCode: row.branchCode.replace(/\s/g, "").trim(),
            bankAccountType: normAccountType(row.accountType ?? ""),
            taxNumber: row.taxNumber?.trim() ?? "",
            idNumber: row.idNumber.trim(),
            address: row.address?.trim() ?? "",
            emergencyContactName: row.emergencyName?.trim() ?? "",
            emergencyContactRelationship: row.emergencyRelationship?.trim() ?? "",
            emergencyContactPhone: row.emergencyPhone?.trim() ?? "",
            equityRace: row.equityRace?.trim() ? (normEnum(row.equityRace) as EquityRace) : null,
            equityGender: row.equityGender?.trim() ? (normEnum(row.equityGender) as EquityGender) : null,
            occupationalLevel: row.occupationalLevel?.trim()
              ? (normEnum(row.occupationalLevel) as OccupationalLevel)
              : null,
            foreignNational: parseBool(row.foreignNational ?? ""),
            hasDisability: parseBool(row.hasDisability ?? ""),
            leaveBalances: {
              create: (Object.keys(leaveTotals) as LeaveType[]).map((type) => ({
                type,
                total: leaveTotals[type],
                used: 0,
              })),
            },
          },
        });

        emailToId.set(created.email.toLowerCase(), created.id);
        if (row.managerEmail?.trim()) {
          managerLinks.push({
            employeeId: created.id,
            managerEmail: row.managerEmail.trim().toLowerCase(),
            rowNumber,
          });
        }
      });

      imported++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error creating employee.";
      errors.push({ row: rowNumber, field: "general", message });
    }
  }

  // Second pass: link managers now that every employee (including managers
  // listed later in the file) has an id.
  for (const link of managerLinks) {
    const managerId = emailToId.get(link.managerEmail);
    if (!managerId) {
      errors.push({
        row: link.rowNumber,
        field: "managerEmail",
        message: `Manager email "${link.managerEmail}" was not found. Imported without a manager.`,
      });
      continue;
    }
    if (managerId === link.employeeId) continue; // cannot manage themselves
    try {
      await runAsTenant(tenantId, (tx) =>
        tx.employee.update({ where: { id: link.employeeId }, data: { managerId } })
      );
    } catch {
      errors.push({
        row: link.rowNumber,
        field: "managerEmail",
        message: "Could not link the manager. Imported without one.",
      });
    }
  }

  return { imported, errors };
}
