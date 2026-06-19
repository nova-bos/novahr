import { AVATAR_COLORS, defaultLeaveBalances, onboardingPlan } from "@/demo/employees";
import { getInitials } from "@/lib/format";
import type { Employee, Tenant } from "@/lib/types";
import type { NewEmployeeForm } from "@/components/employees/onboarding/types";
import { dateOfBirthFromIdNumber } from "@/lib/workspace/mappers";

export function buildEmployeeFromForm(
  form: NewEmployeeForm,
  tenant: Tenant,
  nextNum: number
): Employee {
  return {
    id: `${tenant.id}-emp-${String(nextNum).padStart(3, "0")}`,
    tenantId: tenant.id,
    employeeNumber: `${tenant.initials}-${String(nextNum).padStart(4, "0")}`,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    preferredName: form.preferredName.trim() || undefined,
    email: form.email.trim(),
    phone: form.phone.trim(),
    avatarColor: AVATAR_COLORS[nextNum % AVATAR_COLORS.length],
    initials: getInitials(form.firstName.trim() || "?", form.lastName.trim() || "?"),
    jobTitle: form.jobTitle.trim(),
    department: form.department,
    employmentType: form.employmentType,
    status: "probation",
    startDate: form.startDate,
    location: form.location.trim(),
    managerId: form.managerId || undefined,
    salary: {
      annualGross: Number(form.annualGross) || 0,
      currency: "ZAR",
      payFrequency: "monthly",
      travelAllowance: form.travelAllowance ? Number(form.travelAllowance) : undefined,
      housingAllowance: form.housingAllowance ? Number(form.housingAllowance) : undefined,
      pensionContributionPct: form.pensionContributionPct
        ? Number(form.pensionContributionPct) / 100
        : undefined,
      medicalAid: form.medicalAid ? Number(form.medicalAid) : undefined,
    },
    bankDetails: {
      bank: form.bank,
      accountNumber: form.accountNumber.trim(),
      branchCode: form.branchCode.trim(),
      accountType: form.accountType,
    },
    taxNumber: form.taxNumber.trim(),
    idNumber: form.idNumber.trim(),
    dateOfBirth: dateOfBirthFromIdNumber(form.idNumber.trim()),
    address: form.address.trim(),
    emergencyContact: {
      name: form.emergencyName.trim(),
      relationship: form.emergencyRelationship.trim(),
      phone: form.emergencyPhone.trim(),
    },
    leaveBalances: defaultLeaveBalances(),
    onboarding: onboardingPlan(0, form.startDate, form.buddy.trim() || undefined),
  };
}
