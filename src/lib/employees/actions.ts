"use server";

import type { Prisma } from "@prisma/client";
import { runAsTenant } from "@/lib/db-context";
import { requireEmployeeScope, requireRole } from "@/lib/auth/require";
import type { ActivityItem, Employee, NotificationItem, Onboarding } from "@/lib/types";
import { mapActivityItem, mapEmployee, mapNotificationItem } from "../workspace/mappers";
import { deriveEmployeePrefix } from "./factory";

export async function createEmployeeRecord(
  employee: Employee
): Promise<{ employee: Employee; activity: ActivityItem; notification: NotificationItem }> {
  const session = await requireRole("hr");
  const isOnboarding = employee.status === "probation";

  return runAsTenant(session.tenantId, async (tx) => {
    // Generate employee number server-side using the real company name so
    // new tenants get a meaningful prefix (e.g. "NT-0001") instead of a
    // CUID fragment.
    const [tenant, existingCount] = await Promise.all([
      tx.tenant.findUniqueOrThrow({ where: { id: session.tenantId }, select: { name: true } }),
      tx.employee.count({ where: { tenantId: session.tenantId } }),
    ]);
    const prefix = deriveEmployeePrefix(tenant.name);
    const employeeNumber = `${prefix}-${String(existingCount + 1).padStart(4, "0")}`;

    const created = await tx.employee.create({
      data: {
        tenantId: session.tenantId,
        employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        preferredName: employee.preferredName,
        email: employee.email,
        phone: employee.phone,
        avatarColor: employee.avatarColor,
        initials: employee.initials,
        jobTitle: employee.jobTitle,
        department: employee.department,
        employmentType: employee.employmentType,
        status: employee.status,
        startDate: new Date(employee.startDate),
        location: employee.location,
        managerId: employee.managerId,
        salaryAnnualGross: employee.salary.annualGross,
        salaryCurrency: employee.salary.currency,
        salaryPayFrequency: employee.salary.payFrequency,
        salaryTravelAllowance: employee.salary.travelAllowance,
        salaryHousingAllowance: employee.salary.housingAllowance,
        salaryPensionContributionPct: employee.salary.pensionContributionPct,
        salaryMedicalAid: employee.salary.medicalAid,
        bankName: employee.bankDetails.bank,
        bankAccountNumber: employee.bankDetails.accountNumber,
        bankBranchCode: employee.bankDetails.branchCode,
        bankAccountType: employee.bankDetails.accountType,
        taxNumber: employee.taxNumber,
        idNumber: employee.idNumber,
        address: employee.address,
        emergencyContactName: employee.emergencyContact.name,
        emergencyContactRelationship: employee.emergencyContact.relationship,
        emergencyContactPhone: employee.emergencyContact.phone,
        onboarding: employee.onboarding as Prisma.InputJsonValue | undefined,
        leaveBalances: {
          create: employee.leaveBalances.map((balance) => ({
            type: balance.type,
            total: balance.total,
            used: balance.used,
          })),
        },
      },
      include: { leaveBalances: true },
    });

    const activity = await tx.activityItem.create({
      data: {
        tenantId: created.tenantId,
        type: isOnboarding ? "onboarding" : "hire",
        message: isOnboarding
          ? `started onboarding as ${created.jobTitle}`
          : `joined as ${created.jobTitle}`,
        actor: `${created.firstName} ${created.lastName}`,
        employeeId: created.id,
      },
    });

    const notification = await tx.notificationItem.create({
      data: {
        tenantId: created.tenantId,
        title: isOnboarding ? "New team member onboarding" : "New employee added",
        description: `${created.firstName} ${created.lastName} ${
          isOnboarding ? "started onboarding as" : "joined as"
        } ${created.jobTitle}.`,
        type: "info",
      },
    });

    return {
      employee: mapEmployee(created),
      activity: mapActivityItem(activity),
      notification: mapNotificationItem(notification),
    };
  });
}

export async function updateEmployeeRecord(
  id: string,
  updates: Partial<Employee>
): Promise<Employee> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;
  // leaveBalances and onboarding are not Prisma columns; strip them before building the update payload
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { salary, bankDetails, emergencyContact, leaveBalances, onboarding, startDate, ...rest } = updates;

  const data: Prisma.EmployeeUpdateInput = { ...rest };

  if (startDate !== undefined) {
    data.startDate = new Date(startDate);
  }

  if (salary) {
    if (salary.annualGross !== undefined) data.salaryAnnualGross = salary.annualGross;
    if (salary.currency !== undefined) data.salaryCurrency = salary.currency;
    if (salary.payFrequency !== undefined) data.salaryPayFrequency = salary.payFrequency;
    if (salary.travelAllowance !== undefined) data.salaryTravelAllowance = salary.travelAllowance;
    if (salary.housingAllowance !== undefined) data.salaryHousingAllowance = salary.housingAllowance;
    if (salary.pensionContributionPct !== undefined)
      data.salaryPensionContributionPct = salary.pensionContributionPct;
    if (salary.medicalAid !== undefined) data.salaryMedicalAid = salary.medicalAid;
  }

  if (bankDetails) {
    if (bankDetails.bank !== undefined) data.bankName = bankDetails.bank;
    if (bankDetails.accountNumber !== undefined) data.bankAccountNumber = bankDetails.accountNumber;
    if (bankDetails.branchCode !== undefined) data.bankBranchCode = bankDetails.branchCode;
    if (bankDetails.accountType !== undefined) data.bankAccountType = bankDetails.accountType;
  }

  if (emergencyContact) {
    if (emergencyContact.name !== undefined) data.emergencyContactName = emergencyContact.name;
    if (emergencyContact.relationship !== undefined)
      data.emergencyContactRelationship = emergencyContact.relationship;
    if (emergencyContact.phone !== undefined) data.emergencyContactPhone = emergencyContact.phone;
  }

  return runAsTenant(tenantId, async (tx) => {
    const updated = await tx.employee.update({
      where: { id },
      data,
      include: { leaveBalances: true },
    });
    return mapEmployee(updated);
  });
}

export async function updateEmployeePhotoRecord(
  employeeId: string,
  photoUrl: string
): Promise<Employee> {
  const session = await requireEmployeeScope(employeeId);
  return runAsTenant(session.tenantId, async (tx) => {
    const updated = await tx.employee.update({
      where: { id: employeeId },
      data: { photoUrl },
      include: { leaveBalances: true },
    });
    return mapEmployee(updated);
  });
}

export async function toggleOnboardingStepRecord(
  employeeId: string,
  stepId: string
): Promise<{ employee: Employee; activity?: ActivityItem }> {
  const session = await requireEmployeeScope(employeeId);
  return runAsTenant(session.tenantId, async (tx) => {
    const existing = await tx.employee.findUniqueOrThrow({
      where: { id: employeeId },
      include: { leaveBalances: true },
    });

    const onboarding = existing.onboarding as unknown as Onboarding | null;
    if (!onboarding) {
      return { employee: mapEmployee(existing) };
    }

    const steps = onboarding.steps.map((step) =>
      step.id === stepId ? { ...step, complete: !step.complete } : step
    );
    const completeCount = steps.filter((step) => step.complete).length;
    const progress = Math.round((completeCount / steps.length) * 100);
    const graduated = progress === 100 && existing.status !== "active";

    const updated = await tx.employee.update({
      where: { id: employeeId },
      data: {
        status: progress === 100 ? "active" : existing.status,
        onboarding: { ...onboarding, steps, progress } as unknown as Prisma.InputJsonValue,
      },
      include: { leaveBalances: true },
    });

    if (!graduated) {
      return { employee: mapEmployee(updated) };
    }

    const activity = await tx.activityItem.create({
      data: {
        tenantId: updated.tenantId,
        type: "onboarding",
        message: "completed onboarding and is now fully active",
        actor: `${updated.firstName} ${updated.lastName}`,
        employeeId: updated.id,
      },
    });

    return { employee: mapEmployee(updated), activity: mapActivityItem(activity) };
  });
}
