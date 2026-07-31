"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import { formatDate } from "@/lib/format";
import {
  generateEmploymentContract,
  generateTerminationLetter,
  generateWarningLetter,
  type LetterData,
} from "./letter-templates";

export type LetterType = "employment_contract" | "termination_letter" | "warning_verbal" | "warning_written" | "warning_final";

async function buildLetterData(employeeId: string, tenantId: string): Promise<LetterData> {
  // runAsTenant gives us a transaction-scoped client. All reads carry tenantId.
  let data!: LetterData;
  await runAsTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        jobTitle: true,
        department: true,
        startDate: true,
        terminatedAt: true,
        terminationReason: true,
        salaryAnnualGross: true,
      },
    });
    if (!employee) throw new Error("Employee not found.");

    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, legalName: true, address: true, city: true },
    });

    data = {
      companyName: tenant.name,
      companyLegalName: tenant.legalName,
      companyAddress: [tenant.address, tenant.city].filter(Boolean).join(", "),
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeNumber: employee.employeeNumber,
      jobTitle: employee.jobTitle,
      department: employee.department,
      startDate: formatDate(employee.startDate.toISOString()),
      endDate: employee.terminatedAt ? formatDate(employee.terminatedAt.toISOString()) : undefined,
      salary: employee.salaryAnnualGross.toNumber(),
      reason: employee.terminationReason ?? undefined,
      today: formatDate(new Date().toISOString()),
    };
  });
  return data;
}

export async function generateLetterAction(input: {
  employeeId: string;
  type: LetterType;
  offence?: string;
  hearingDate?: string;
  hearingAttendees?: string;
}): Promise<{ html: string; filename: string }> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;

  const data = await buildLetterData(input.employeeId, tenantId);
  data.signatory = session.name;

  let html: string;
  let filename: string;

  switch (input.type) {
    case "employment_contract":
      html = generateEmploymentContract(data);
      filename = `employment-contract-${data.employeeNumber}`;
      break;
    case "termination_letter":
      html = generateTerminationLetter(data);
      filename = `termination-letter-${data.employeeNumber}`;
      break;
    case "warning_verbal":
      html = generateWarningLetter(
        data,
        "verbal",
        input.offence ?? "Misconduct",
        input.hearingDate ? { date: input.hearingDate, attendees: input.hearingAttendees } : undefined
      );
      filename = `verbal-warning-${data.employeeNumber}`;
      break;
    case "warning_written":
      html = generateWarningLetter(
        data,
        "written",
        input.offence ?? "Misconduct",
        input.hearingDate ? { date: input.hearingDate, attendees: input.hearingAttendees } : undefined
      );
      filename = `written-warning-${data.employeeNumber}`;
      break;
    case "warning_final":
      html = generateWarningLetter(
        data,
        "final",
        input.offence ?? "Misconduct",
        input.hearingDate ? { date: input.hearingDate, attendees: input.hearingAttendees } : undefined
      );
      filename = `final-warning-${data.employeeNumber}`;
      break;
    default:
      throw new Error("Unknown letter type.");
  }

  return { html, filename };
}
