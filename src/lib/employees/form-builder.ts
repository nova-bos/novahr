import { AVATAR_COLORS, defaultLeaveBalances, onboardingPlan } from "@/demo/employees";
import { getInitials } from "@/lib/format";
import type { Employee, Gender, MaritalStatus, Tenant } from "@/lib/types";
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
    branchId: form.branchId || undefined,
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
      retirementAnnuity: form.retirementAnnuity ? Number(form.retirementAnnuity) : undefined,
      isMedicalAidMember: form.isMedicalAidMember || undefined,
      wageType: form.wageType || "salaried",
      hourlyRate: form.wageType === "hourly" && form.hourlyRate ? Number(form.hourlyRate) : undefined,
      dailyRate: form.wageType === "daily" && form.dailyRate ? Number(form.dailyRate) : undefined,
      weeklyRate: form.wageType === "weekly" && form.weeklyRate ? Number(form.weeklyRate) : undefined,
    },
    bankDetails: {
      bank: form.bank,
      accountNumber: form.accountNumber.trim(),
      branchCode: form.branchCode.trim(),
      accountType: form.accountType,
      validated: false,
      validatedAt: null,
    },
    taxNumber: form.taxNumber.trim(),
    idType: form.idType,
    idNumber: form.idType === "sa_id" ? form.idNumber.trim() : "",
    passportNumber: form.idType === "passport" ? form.passportNumber.trim() || undefined : undefined,
    nationality: form.idType === "passport" ? form.nationality.trim() || undefined : undefined,
    // SA-ID holders: derive from the ID. Passport holders: use the entered date.
    dateOfBirth:
      form.idType === "sa_id"
        ? dateOfBirthFromIdNumber(form.idNumber.trim())
        : form.dateOfBirth.trim() || undefined,
    gender: (form.gender || undefined) as Gender | undefined,
    maritalStatus: (form.maritalStatus || undefined) as MaritalStatus | undefined,
    address: form.address.trim(),
    emergencyContact: buildEmergencyContact(form),
    nextOfKin: hasNextOfKin(form)
      ? {
          name: form.nextOfKinName.trim(),
          relationship: form.nextOfKinRelationship.trim(),
          phone: form.nextOfKinPhone.trim(),
          address: form.nextOfKinAddress.trim(),
        }
      : undefined,
    emergencyContactSameAsNextOfKin: form.emergencyContactSameAsNextOfKin,
    skills: form.skills.map((s) => s.trim()).filter(Boolean),
    languages: form.languages.map((l) => l.trim()).filter(Boolean),
    qualifications: form.qualifications
      .filter((q) => q.name.trim() !== "")
      .map((q) => ({
        id: `q-${Math.random().toString(36).slice(2, 10)}`,
        type: q.type || "certificate",
        name: q.name.trim(),
        institution: q.institution.trim() || undefined,
        yearCompleted: q.yearCompleted.trim() ? Number(q.yearCompleted) : undefined,
        expiresAt: q.expiresAt.trim() || undefined,
      })),
    customFields: form.customFields
      .filter((f) => f.value.trim() !== "")
      .map((f) => ({ definitionId: f.definitionId, value: f.value.trim() })),
    leaveBalances: defaultLeaveBalances(),
    onboarding: onboardingPlan(0, form.startDate, form.buddy.trim() || undefined),
  };
}

function hasNextOfKin(form: NewEmployeeForm): boolean {
  return Boolean(
    form.nextOfKinName.trim() ||
      form.nextOfKinRelationship.trim() ||
      form.nextOfKinPhone.trim() ||
      form.nextOfKinAddress.trim()
  );
}

// When the emergency contact is the same as the next of kin, mirror the
// next-of-kin values so downstream consumers of emergencyContact keep working.
function buildEmergencyContact(form: NewEmployeeForm) {
  if (form.emergencyContactSameAsNextOfKin) {
    return {
      name: form.nextOfKinName.trim(),
      relationship: form.nextOfKinRelationship.trim(),
      phone: form.nextOfKinPhone.trim(),
    };
  }
  return {
    name: form.emergencyName.trim(),
    relationship: form.emergencyRelationship.trim(),
    phone: form.emergencyPhone.trim(),
  };
}
