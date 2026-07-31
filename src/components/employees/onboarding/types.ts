import type { EmploymentType, MaritalStatus } from "@/lib/types";
import type { FieldErrors } from "@/lib/schemas/employee";
import {
  validatePersonalStep,
  validateRoleStep,
  validateCompensationStep,
} from "@/lib/schemas/employee";
import { SA_BANKS } from "@/lib/services/netcash/helpers";

export interface QualificationRow {
  type: string;
  name: string;
  institution: string;
  yearCompleted: string;
  expiresAt: string;
}

export interface CustomFieldEntry {
  definitionId: string;
  value: string;
}

export interface NewEmployeeForm {
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phone: string;
  idType: "sa_id" | "passport";
  idNumber: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "";
  maritalStatus: MaritalStatus | "";
  taxNumber: string;
  address: string;
  nextOfKinName: string;
  nextOfKinRelationship: string;
  nextOfKinPhone: string;
  nextOfKinAddress: string;
  emergencyContactSameAsNextOfKin: boolean;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;

  skills: string[];
  languages: string[];
  qualifications: QualificationRow[];
  customFields: CustomFieldEntry[];

  jobTitle: string;
  department: string;
  branchId: string;
  employmentType: EmploymentType;
  startDate: string;
  location: string;
  managerId: string;
  buddy: string;

  annualGross: string;
  travelAllowance: string;
  housingAllowance: string;
  pensionContributionPct: string;
  medicalAid: string;
  retirementAnnuity: string;

  wageType: "salaried" | "hourly" | "daily" | "weekly";
  hourlyRate: string;
  dailyRate: string;
  weeklyRate: string;

  isMedicalAidMember: boolean;

  bank: string;
  accountNumber: string;
  branchCode: string;
  accountType: "Cheque" | "Savings";
}

export function emptyForm(defaults: { location: string; bank: string }): NewEmployeeForm {
  const defaultBankEntry = SA_BANKS.find((b) => b.name === defaults.bank);
  return {
    firstName: "",
    lastName: "",
    preferredName: "",
    email: "",
    phone: "",
    idType: "sa_id",
    idNumber: "",
    passportNumber: "",
    nationality: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    taxNumber: "",
    address: "",
    nextOfKinName: "",
    nextOfKinRelationship: "",
    nextOfKinPhone: "",
    nextOfKinAddress: "",
    emergencyContactSameAsNextOfKin: false,
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",

    skills: [],
    languages: [],
    qualifications: [],
    customFields: [],

    jobTitle: "",
    department: "",
    branchId: "",
    employmentType: "full_time",
    startDate: new Date().toISOString().slice(0, 10),
    location: defaults.location,
    managerId: "",
    buddy: "",

    annualGross: "",
    travelAllowance: "",
    housingAllowance: "",
    pensionContributionPct: "",
    medicalAid: "",
    retirementAnnuity: "",
    wageType: "salaried",
    hourlyRate: "",
    dailyRate: "",
    weeklyRate: "",
    isMedicalAidMember: false,

    bank: defaults.bank,
    accountNumber: "",
    branchCode: defaultBankEntry?.universalBranchCode ?? "",
    accountType: "Cheque",
  };
}

export const STEPS = [
  { id: "personal", title: "Personal details", description: "Basic and contact information" },
  { id: "role", title: "Role & employment", description: "Position, department and reporting" },
  { id: "compensation", title: "Compensation", description: "Salary, allowances and banking" },
  { id: "review", title: "Review & confirm", description: "Check details before creating" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export function validateStep(step: StepId, form: NewEmployeeForm): FieldErrors {
  switch (step) {
    case "personal":
      return validatePersonalStep(form);
    case "role":
      return validateRoleStep(form);
    case "compensation":
      return validateCompensationStep(form);
    case "review":
      return {};
  }
}

export function isStepValid(step: StepId, form: NewEmployeeForm): boolean {
  switch (step) {
    case "personal": {
      const identityComplete =
        form.idType === "passport"
          ? Boolean(
              form.passportNumber.trim() &&
                form.nationality.trim() &&
                form.dateOfBirth.trim() &&
                form.gender
            )
          : Boolean(form.idNumber.trim());
      return Boolean(
        form.firstName.trim() &&
          form.lastName.trim() &&
          form.email.trim() &&
          form.phone.trim() &&
          identityComplete
      );
    }
    case "role":
      return Boolean(form.jobTitle.trim() && form.location.trim() && form.startDate);
    case "compensation":
      return Boolean(
        form.annualGross.trim() &&
          Number(form.annualGross) > 0 &&
          form.bank.trim() &&
          form.accountNumber.trim() &&
          form.branchCode.trim()
      );
    case "review":
      return true;
  }
}
