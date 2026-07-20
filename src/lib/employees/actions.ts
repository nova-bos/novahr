"use server";

import type { Prisma } from "@prisma/client";
import { runAsTenant } from "@/lib/db-context";
import { requireEmployeeScope, requireRole } from "@/lib/auth/require";
import type { ActivityItem, Employee, NotificationItem, Onboarding } from "@/lib/types";
import { mapActivityItem, mapEmployee, mapNotificationItem } from "../workspace/mappers";
import { claimNextEmployeeNumber } from "@/lib/employee-numbers/actions";
import { DEFAULT_LEAVE_TOTALS } from "@/lib/config/leave";
import type { LeaveType } from "@/lib/types";
import { getNetcashServiceKeys } from "@/lib/settings/actions";
import { validateBankAccount } from "@/lib/services/netcash/bankValidation";
import { mapAccountType } from "@/lib/services/netcash/helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SalaryHistoryEntry {
  id: string;
  annualGross: number;
  payFrequency: string;
  effectiveDate: string;
  changedBy: string;
  changeReason: string | null;
}

export async function getSalaryHistoryAction(employeeId: string): Promise<SalaryHistoryEntry[]> {
  const session = await requireRole("hr");
  return runAsTenant(session.tenantId, async (tx) => {
    const history = await tx.employeeSalaryHistory.findMany({
      where: { employeeId, tenantId: session.tenantId },
      orderBy: { effectiveDate: "desc" },
    });
    return history.map((h) => ({
      id: h.id,
      annualGross: h.annualGross.toNumber(),
      payFrequency: h.payFrequency,
      effectiveDate: h.effectiveDate.toISOString().slice(0, 10),
      changedBy: h.changedBy,
      changeReason: h.changeReason,
    }));
  });
}

export async function createEmployeeRecord(
  employee: Employee
): Promise<{ employee: Employee; activity: ActivityItem; notification: NotificationItem }> {
  const session = await requireRole("hr");
  const isOnboarding = employee.status === "probation";

  return runAsTenant(session.tenantId, async (tx) => {
    // Generate employee number using the configurable format system.
    const employeeNumber = await claimNextEmployeeNumber(session.tenantId, tx);

    // Load tenant leave policy (if configured) to seed leave balances correctly.
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
        salaryRetirementAnnuity: employee.salary.retirementAnnuity,
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
          create: (Object.keys(leaveTotals) as LeaveType[]).map((type) => ({
            type,
            total: leaveTotals[type],
            used: 0,
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
    if (salary.retirementAnnuity !== undefined)
      data.salaryRetirementAnnuity = salary.retirementAnnuity;
  }

  const bankFieldsChanged =
    bankDetails !== undefined &&
    (bankDetails.bank !== undefined ||
      bankDetails.accountNumber !== undefined ||
      bankDetails.branchCode !== undefined ||
      bankDetails.accountType !== undefined);
  if (bankDetails) {
    if (bankDetails.bank !== undefined) data.bankName = bankDetails.bank;
    if (bankDetails.accountNumber !== undefined) data.bankAccountNumber = bankDetails.accountNumber;
    if (bankDetails.branchCode !== undefined) data.bankBranchCode = bankDetails.branchCode;
    if (bankDetails.accountType !== undefined) data.bankAccountType = bankDetails.accountType;
  }
  if (bankFieldsChanged) {
    // Changed banking details must be re-verified before they are trusted
    // for salary payments.
    data.bankAccountValidated = false;
    data.bankValidatedAt = null;
  }

  if (emergencyContact) {
    if (emergencyContact.name !== undefined) data.emergencyContactName = emergencyContact.name;
    if (emergencyContact.relationship !== undefined)
      data.emergencyContactRelationship = emergencyContact.relationship;
    if (emergencyContact.phone !== undefined) data.emergencyContactPhone = emergencyContact.phone;
  }

  return runAsTenant(tenantId, async (tx) => {
    // Track salary changes for history. The tenant filter also guards the
    // update below against cross-tenant ids.
    const existing = await tx.employee.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Employee not found.");
    const salaryChanged =
      (salary?.annualGross !== undefined && salary.annualGross !== existing?.salaryAnnualGross.toNumber()) ||
      (salary?.payFrequency !== undefined && salary.payFrequency !== existing?.salaryPayFrequency);
    if (salaryChanged && existing) {
      await tx.employeeSalaryHistory.create({
        data: {
          tenantId,
          employeeId: id,
          annualGross: existing.salaryAnnualGross,
          payFrequency: existing.salaryPayFrequency,
          travelAllowance: existing.salaryTravelAllowance,
          housingAllowance: existing.salaryHousingAllowance,
          medicalAid: existing.salaryMedicalAid,
          pensionContribPct: existing.salaryPensionContributionPct,
          retirementAnnuity: existing.salaryRetirementAnnuity,
          effectiveDate: new Date(),
          changedBy: session.id,
          changeReason: "Salary update",
        },
      });
    }

    const updated = await tx.employee.update({
      where: { id },
      data,
      include: { leaveBalances: true },
    });

    if (bankFieldsChanged) {
      // Bank detail edits are the classic payroll fraud vector; always leave
      // an audit trail of who changed them.
      await tx.activityItem.create({
        data: {
          tenantId,
          type: "settings_updated",
          message: `updated banking details for ${updated.firstName} ${updated.lastName}`,
          actor: session.name,
          employeeId: id,
        },
      });
    }

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

const PHOTO_BUCKET = "employee-photos";
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadEmployeePhotoAction(
  employeeId: string,
  formData: FormData
): Promise<{ photoUrl?: string; error?: string }> {
  const session = await requireEmployeeScope(employeeId);

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided." };
  if (!PHOTO_ALLOWED.has(file.type)) return { error: "Only JPEG, PNG and WebP images are supported." };
  if (file.size > PHOTO_MAX_BYTES) return { error: "Photo must be under 5 MB." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${session.tenantId}/${employeeId}.${ext}`;

  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, await file.arrayBuffer(), { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  await runAsTenant(session.tenantId, async (tx) => {
    await tx.employee.update({ where: { id: employeeId }, data: { photoUrl } });
  });

  return { photoUrl };
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

export async function validateEmployeeBankAccountAction(
  employeeId: string
): Promise<{ success: boolean; valid?: boolean; message?: string; error?: string }> {
  const session = await requireEmployeeScope(employeeId);
  try {
    const keys = await getNetcashServiceKeys(session.tenantId);
    if (!keys.accountServicesKey) {
      return { success: false, error: "No account services key configured. Add it in Settings > Payroll > Netcash." };
    }

    const emp = await runAsTenant(session.tenantId, async (tx) =>
      tx.employee.findUniqueOrThrow({
        where: { id: employeeId },
        select: { bankAccountNumber: true, bankBranchCode: true, bankAccountType: true },
      })
    );

    const accountType: "1" | "2" = mapAccountType(emp.bankAccountType) === "2" ? "2" : "1";
    const branch = emp.bankBranchCode.replace(/\D/g, "").padStart(6, "0").slice(0, 6);

    const result = await validateBankAccount(
      keys.accountServicesKey,
      emp.bankAccountNumber,
      branch,
      accountType,
      keys.environment
    );

    await runAsTenant(session.tenantId, async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          bankAccountValidated: result.valid,
          bankValidatedAt: result.valid ? new Date() : null,
        },
      });
    });

    return { success: true, valid: result.valid, message: result.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Validation failed." };
  }
}
