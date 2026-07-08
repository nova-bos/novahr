"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { claimNextEmployeeNumber } from "@/lib/employee-numbers/actions";
import { DEFAULT_LEAVE_TOTALS } from "@/lib/config/leave";
import type { LeaveType } from "@/lib/types";

export interface CsvRow {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  startDate: string;
  salaryAnnualGross: string;
}

export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportEmployeesResult {
  imported: number;
  errors: ImportRowError[];
}

function validateRow(row: CsvRow, rowNumber: number): ImportRowError[] {
  const errs: ImportRowError[] = [];

  if (!row.firstName.trim()) {
    errs.push({ row: rowNumber, field: "firstName", message: "First name is required." });
  }
  if (!row.lastName.trim()) {
    errs.push({ row: rowNumber, field: "lastName", message: "Last name is required." });
  }
  if (!row.email.trim()) {
    errs.push({ row: rowNumber, field: "email", message: "Email is required." });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
    errs.push({ row: rowNumber, field: "email", message: "Email is not valid." });
  }
  if (!row.jobTitle.trim()) {
    errs.push({ row: rowNumber, field: "jobTitle", message: "Job title is required." });
  }
  if (!row.startDate.trim()) {
    errs.push({ row: rowNumber, field: "startDate", message: "Start date is required." });
  } else if (isNaN(Date.parse(row.startDate.trim()))) {
    errs.push({ row: rowNumber, field: "startDate", message: "Start date must be a valid date (YYYY-MM-DD)." });
  }

  if (!row.salaryAnnualGross.trim()) {
    errs.push({ row: rowNumber, field: "salaryAnnualGross", message: "Annual gross salary is required." });
  } else {
    const salary = parseFloat(row.salaryAnnualGross.trim());
    if (isNaN(salary) || salary <= 0) {
      errs.push({ row: rowNumber, field: "salaryAnnualGross", message: "Annual gross salary must be a positive number." });
    }
  }

  return errs;
}

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

export async function importEmployeesFromCsvAction(
  rows: CsvRow[]
): Promise<ImportEmployeesResult> {
  const session = await requireRole("hr");

  let imported = 0;
  const errors: ImportRowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    const rowErrors = validateRow(row, rowNumber);
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    try {
      await runAsTenant(session.tenantId, async (tx) => {
        const employeeNumber = await claimNextEmployeeNumber(session.tenantId, tx);

        const leavePolicy = await tx.tenantLeavePolicy.findUnique({
          where: { tenantId: session.tenantId },
        });

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

        const firstName = row.firstName.trim();
        const lastName = row.lastName.trim();

        await tx.employee.create({
          data: {
            tenantId: session.tenantId,
            employeeNumber,
            firstName,
            lastName,
            email: row.email.trim(),
            jobTitle: row.jobTitle.trim(),
            department: row.department.trim() || "General",
            startDate: new Date(row.startDate.trim()),
            salaryAnnualGross: parseFloat(row.salaryAnnualGross.trim()),
            salaryCurrency: "ZAR",
            salaryPayFrequency: "monthly",
            avatarColor: randomAvatarColor(),
            initials: toInitials(firstName, lastName),
            status: "active",
            employmentType: "full_time",
            phone: "",
            location: "",
            address: "",
            taxNumber: "",
            idNumber: "",
            bankName: "",
            bankAccountNumber: "",
            bankBranchCode: "",
            bankAccountType: "Cheque",
            emergencyContactName: "",
            emergencyContactRelationship: "",
            emergencyContactPhone: "",
            leaveBalances: {
              create: (Object.keys(leaveTotals) as LeaveType[]).map((type) => ({
                type,
                total: leaveTotals[type],
                used: 0,
              })),
            },
          },
        });
      });

      imported++;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error creating employee.";
      errors.push({ row: rowNumber, field: "general", message });
    }
  }

  return { imported, errors };
}
