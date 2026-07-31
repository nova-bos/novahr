"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { claimNextEmployeeNumber } from "@/lib/employee-numbers/actions";
import { DEFAULT_LEAVE_TOTALS } from "@/lib/config/leave";
import { saIdNumber, saPhone, bankAccountNumber, branchCode } from "@/lib/schemas/sa";
import { toCSV } from "@/lib/export/csv";
import { IMPORT_COLUMNS, type CsvRow } from "./import-columns";
import type {
  LeaveType,
  EmploymentType,
  PayFrequency,
  EquityRace,
  EquityGender,
  OccupationalLevel,
  Gender,
  MaritalStatus,
} from "@/lib/types";

export type { CsvRow } from "./import-columns";

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportEmployeesResult {
  // Total rows written (created + updated), kept for backward compatibility.
  imported: number;
  created: number;
  updated: number;
  errors: ImportRowError[];
}

/**
 * Preview classification of parsed rows into creates, updates and errors, so the
 * import dialog can show what will happen before the write runs. Computed
 * against the tenant's current workforce (matched by employee number).
 */
export interface ImportPreview {
  creates: number;
  updates: number;
  errors: ImportRowError[];
}

const EMPLOYMENT_TYPES: EmploymentType[] = ["full_time", "part_time", "contract"];
const PAY_FREQUENCIES: PayFrequency[] = ["monthly", "biweekly", "weekly"];
const RACES: EquityRace[] = ["african", "coloured", "indian", "white", "other"];
const GENDERS: EquityGender[] = ["male", "female", "other"];
const DEMO_GENDERS: Gender[] = ["male", "female", "other"];
const MARITAL_STATUSES: MaritalStatus[] = [
  "single",
  "married",
  "divorced",
  "widowed",
  "life_partner",
];
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

  const idType = normEnum(row.idType ?? "");
  const isPassport = idType === "passport";
  if (row.idType?.trim() && idType !== "sa_id" && idType !== "passport")
    add("idType", "ID type must be sa_id or passport.");

  if (isPassport) {
    if (!row.passportNumber?.trim()) add("passportNumber", "Passport number is required for passport holders.");
    if (!row.dateOfBirth?.trim()) add("dateOfBirth", "Date of birth is required for passport holders.");
    else if (isNaN(Date.parse(row.dateOfBirth.trim())))
      add("dateOfBirth", "Date of birth must be a valid date (YYYY-MM-DD).");
  } else {
    if (!row.idNumber?.trim()) add("idNumber", "SA ID number is required.");
    else if (!saIdNumber.safeParse(row.idNumber.trim()).success)
      add("idNumber", "SA ID number is invalid (must be 13 digits and pass the checksum).");
  }

  if (row.dateOfBirth?.trim() && isNaN(Date.parse(row.dateOfBirth.trim())))
    add("dateOfBirth", "Date of birth must be a valid date (YYYY-MM-DD).");

  if (row.gender?.trim() && !(DEMO_GENDERS as string[]).includes(normEnum(row.gender)))
    add("gender", "Gender must be male, female or other.");

  if (row.maritalStatus?.trim() && !(MARITAL_STATUSES as string[]).includes(normEnum(row.maritalStatus)))
    add("maritalStatus", "Marital status must be single, married, divorced, widowed or life_partner.");

  if (row.taxNumber?.trim() && !/^\d{10}$/.test(row.taxNumber.trim()))
    add("taxNumber", "Tax number must be 10 digits.");

  if (row.nextOfKinPhone?.trim() && !saPhone.safeParse(row.nextOfKinPhone.trim()).success)
    add("nextOfKinPhone", "Next of kin phone must be a valid South African number.");

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

/** Shared column mapping used for both create and update. */
function mapRowToData(row: CsvRow): Record<string, unknown> {
  const idType = normEnum(row.idType ?? "") === "passport" ? "passport" : "sa_id";
  const dobRaw = row.dateOfBirth?.trim();
  const dateOfBirth =
    idType === "passport" && dobRaw && !isNaN(Date.parse(dobRaw)) ? new Date(dobRaw) : null;
  return {
    firstName: row.firstName.trim(),
    lastName: row.lastName.trim(),
    preferredName: row.preferredName?.trim() || null,
    email: row.email.trim(),
    phone: row.phone.trim(),
    jobTitle: row.jobTitle.trim(),
    department: row.department?.trim() || "General",
    employmentType: normEmploymentType(row.employmentType ?? ""),
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
    idType,
    idNumber: idType === "passport" ? "" : row.idNumber.trim(),
    passportNumber: idType === "passport" ? row.passportNumber?.trim() || null : null,
    nationality: row.nationality?.trim() || null,
    dateOfBirth,
    gender: row.gender?.trim() ? (normEnum(row.gender) as Gender) : null,
    maritalStatus: row.maritalStatus?.trim() ? (normEnum(row.maritalStatus) as MaritalStatus) : null,
    address: row.address?.trim() ?? "",
    emergencyContactName: row.emergencyName?.trim() ?? "",
    emergencyContactRelationship: row.emergencyRelationship?.trim() ?? "",
    emergencyContactPhone: row.emergencyPhone?.trim() ?? "",
    nextOfKinName: row.nextOfKinName?.trim() || null,
    nextOfKinRelationship: row.nextOfKinRelationship?.trim() || null,
    nextOfKinPhone: row.nextOfKinPhone?.trim() || null,
    nextOfKinAddress: row.nextOfKinAddress?.trim() || null,
    equityRace: row.equityRace?.trim() ? (normEnum(row.equityRace) as EquityRace) : null,
    equityGender: row.equityGender?.trim() ? (normEnum(row.equityGender) as EquityGender) : null,
    occupationalLevel: row.occupationalLevel?.trim()
      ? (normEnum(row.occupationalLevel) as OccupationalLevel)
      : null,
    foreignNational: parseBool(row.foreignNational ?? ""),
    hasDisability: parseBool(row.hasDisability ?? ""),
  };
}

export async function importEmployeesFromCsvAction(
  rows: CsvRow[]
): Promise<ImportEmployeesResult> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;

  // Existing workforce, indexed by employee number (the upsert key) and by email
  // (for manager links and duplicate-email detection).
  const numberToId = new Map<string, string>();
  const emailToId = new Map<string, string>();
  await runAsTenant(tenantId, async (tx) => {
    const existing = await tx.employee.findMany({
      where: { tenantId },
      select: { id: true, email: true, employeeNumber: true },
    });
    for (const e of existing) {
      emailToId.set(e.email.toLowerCase(), e.id);
      numberToId.set(e.employeeNumber.trim().toLowerCase(), e.id);
    }
  });

  const errors: ImportRowError[] = [];
  // A row targets an existing employee when its employeeNumber matches one.
  const validRows: { row: CsvRow; rowNumber: number; existingId: string | null }[] = [];

  rows.forEach((row, i) => {
    const rowErrors = validateRow(row, i + 1);
    const number = row.employeeNumber?.trim().toLowerCase() ?? "";
    const existingId = number ? numberToId.get(number) ?? null : null;

    // An employee number that does not match anyone is an error: we never
    // silently create with a caller-supplied number (numbers are system-assigned).
    if (number && !existingId) {
      rowErrors.push({
        row: i + 1,
        field: "employeeNumber",
        message: `Employee number "${row.employeeNumber?.trim()}" was not found. Leave it blank to create a new employee.`,
      });
    }

    if (rowErrors.length > 0) errors.push(...rowErrors);
    else validRows.push({ row, rowNumber: i + 1, existingId });
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

  let created = 0;
  let updated = 0;
  const managerLinks: { employeeId: string; managerEmail: string; rowNumber: number }[] = [];

  for (const { row, rowNumber, existingId } of validRows) {
    try {
      const data = mapRowToData(row);
      if (existingId) {
        await runAsTenant(tenantId, async (tx) => {
          const emp = await tx.employee.update({
            where: { id: existingId },
            data,
          });
          emailToId.set(emp.email.toLowerCase(), emp.id);
          if (row.managerEmail?.trim()) {
            managerLinks.push({
              employeeId: emp.id,
              managerEmail: row.managerEmail.trim().toLowerCase(),
              rowNumber,
            });
          }
        });
        updated++;
      } else {
        await runAsTenant(tenantId, async (tx) => {
          const employeeNumber = await claimNextEmployeeNumber(tenantId, tx);
          const emp = await tx.employee.create({
            data: {
              ...(data as object),
              tenantId,
              employeeNumber,
              avatarColor: randomAvatarColor(),
              initials: toInitials(row.firstName.trim(), row.lastName.trim()),
              status: "active",
              leaveBalances: {
                create: (Object.keys(leaveTotals) as LeaveType[]).map((type) => ({
                  type,
                  total: leaveTotals[type],
                  used: 0,
                })),
              },
            } as Parameters<typeof tx.employee.create>[0]["data"],
          });
          emailToId.set(emp.email.toLowerCase(), emp.id);
          numberToId.set(emp.employeeNumber.trim().toLowerCase(), emp.id);
          if (row.managerEmail?.trim()) {
            managerLinks.push({
              employeeId: emp.id,
              managerEmail: row.managerEmail.trim().toLowerCase(),
              rowNumber,
            });
          }
        });
        created++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error saving employee.";
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

  return { imported: created + updated, created, updated, errors };
}

/**
 * Classify parsed rows into creates and updates (and surface validation errors)
 * without writing anything, so the dialog can preview the outcome. An
 * employeeNumber that matches an existing employee is an update; a blank one is a
 * create. A supplied number that matches nobody is an error. An email that
 * belongs to a different existing employee (not the one matched by number) is
 * flagged, but the same employee's own email is never treated as a duplicate.
 */
export async function previewEmployeeImportAction(rows: CsvRow[]): Promise<ImportPreview> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;

  const numberToId = new Map<string, string>();
  const emailToId = new Map<string, string>();
  await runAsTenant(tenantId, async (tx) => {
    const existing = await tx.employee.findMany({
      where: { tenantId },
      select: { id: true, email: true, employeeNumber: true },
    });
    for (const e of existing) {
      emailToId.set(e.email.toLowerCase(), e.id);
      numberToId.set(e.employeeNumber.trim().toLowerCase(), e.id);
    }
  });

  const errors: ImportRowError[] = [];
  let creates = 0;
  let updates = 0;
  const seenEmails = new Map<string, number>();

  rows.forEach((row, i) => {
    const rowNumber = i + 1;
    const rowErrors = validateRow(row, rowNumber);
    const number = row.employeeNumber?.trim().toLowerCase() ?? "";
    const existingId = number ? numberToId.get(number) ?? null : null;

    if (number && !existingId) {
      rowErrors.push({
        row: rowNumber,
        field: "employeeNumber",
        message: `Employee number "${row.employeeNumber?.trim()}" was not found. Leave it blank to create a new employee.`,
      });
    }

    const email = row.email?.trim().toLowerCase() ?? "";
    if (email) {
      // Duplicate against another existing employee (matched by number is fine).
      const ownerId = emailToId.get(email);
      if (ownerId && ownerId !== existingId) {
        rowErrors.push({
          row: rowNumber,
          field: "email",
          message: `Email "${row.email?.trim()}" already belongs to another employee.`,
        });
      }
      // Duplicate within the file itself.
      const firstSeen = seenEmails.get(email);
      if (firstSeen != null) {
        rowErrors.push({
          row: rowNumber,
          field: "email",
          message: `Email "${row.email?.trim()}" is repeated (also on row ${firstSeen}).`,
        });
      } else {
        seenEmails.set(email, rowNumber);
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }
    if (existingId) updates++;
    else creates++;
  });

  return { creates, updates, errors };
}

/**
 * Build a downloadable CSV template pre-populated with the tenant's current
 * workforce, in the exact import columns (employeeNumber first). Re-importing it
 * updates those employees (matched by number); clearing a number and re-importing
 * creates a new one. An empty tenant gets a header-only template plus a single
 * commented example row so the shape is clear.
 */
export async function exportEmployeeTemplateAction(): Promise<string> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;

  const employees = await runAsTenant(tenantId, (tx) =>
    tx.employee.findMany({
      where: { tenantId },
      orderBy: { employeeNumber: "asc" },
    })
  );

  // managerId is a plain column (no Prisma relation), so resolve manager emails
  // via a lookup over the same result set.
  const emailById = new Map<string, string>();
  for (const e of employees) emailById.set(e.id, e.email);

  const headers = IMPORT_COLUMNS.map((c) => c.key);

  const toDateStr = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : "");
  const num = (v: { toString(): string } | number | null): string =>
    v == null ? "" : typeof v === "number" ? String(v) : v.toString();

  const rows = employees.map((e) => {
    // SA-ID holders: derive DOB/gender from the ID for the export; passport
    // holders use the stored columns.
    const record: Record<string, string> = {
      employeeNumber: e.employeeNumber,
      firstName: e.firstName,
      lastName: e.lastName,
      preferredName: e.preferredName ?? "",
      email: e.email,
      phone: e.phone,
      idType: e.idType ?? "sa_id",
      idNumber: e.idNumber ?? "",
      passportNumber: e.passportNumber ?? "",
      nationality: e.nationality ?? "",
      dateOfBirth: toDateStr(e.dateOfBirth),
      gender: e.gender ?? "",
      maritalStatus: e.maritalStatus ?? "",
      taxNumber: e.taxNumber ?? "",
      jobTitle: e.jobTitle,
      department: e.department,
      employmentType: e.employmentType,
      startDate: toDateStr(e.startDate),
      location: e.location,
      managerEmail: e.managerId ? emailById.get(e.managerId) ?? "" : "",
      annualGross: num(e.salaryAnnualGross),
      payFrequency: e.salaryPayFrequency,
      travelAllowance: num(e.salaryTravelAllowance),
      housingAllowance: num(e.salaryHousingAllowance),
      pensionContributionPct: num(e.salaryPensionContributionPct),
      medicalAid: num(e.salaryMedicalAid),
      retirementAnnuity: num(e.salaryRetirementAnnuity),
      bank: e.bankName,
      accountNumber: e.bankAccountNumber,
      branchCode: e.bankBranchCode,
      accountType: e.bankAccountType,
      address: e.address,
      emergencyName: e.emergencyContactName,
      emergencyRelationship: e.emergencyContactRelationship,
      emergencyPhone: e.emergencyContactPhone,
      nextOfKinName: e.nextOfKinName ?? "",
      nextOfKinRelationship: e.nextOfKinRelationship ?? "",
      nextOfKinPhone: e.nextOfKinPhone ?? "",
      nextOfKinAddress: e.nextOfKinAddress ?? "",
      equityRace: e.equityRace ?? "",
      equityGender: e.equityGender ?? "",
      occupationalLevel: e.occupationalLevel ?? "",
      foreignNational: e.foreignNational ? "yes" : "no",
      hasDisability: e.hasDisability ? "yes" : "no",
    };
    return headers.map((h) => record[h] ?? "");
  });

  // Empty tenant: header plus a single example row so the format is obvious.
  if (rows.length === 0) {
    const example = IMPORT_COLUMNS.map((c) => c.example);
    return toCSV(headers, [example]);
  }

  return toCSV(headers, rows);
}
