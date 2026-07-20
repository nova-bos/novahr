import { z } from "zod";
import { saIdNumber, saPhone, bankAccountNumber, branchCode } from "./sa";

const optionalSaPhone = z
  .string()
  .refine((v) => v === "" || saPhone.safeParse(v).success, {
    message: "Enter a valid South African phone number, e.g. 071 234 5678",
  });

export const personalStepSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  preferredName: z.string(),
  email: z.email("Enter a valid email address"),
  phone: saPhone,
  idNumber: saIdNumber,
  taxNumber: z.string().refine(
    (v) => v === "" || /^\d{10}$/.test(v),
    "Tax number must be 10 digits"
  ),
  address: z.string(),
  emergencyName: z.string(),
  emergencyRelationship: z.string(),
  emergencyPhone: optionalSaPhone,
});

export const roleStepSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  department: z.string(),
  employmentType: z.enum(["full_time", "part_time", "contract"]),
  startDate: z.string().min(1, "Start date is required"),
  location: z.string().min(1, "Work location is required"),
  managerId: z.string(),
  buddy: z.string(),
});

export const compensationStepSchema = z.object({
  annualGross: z
    .string()
    .min(1, "Annual gross salary is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Salary must be greater than zero"),
  pensionContributionPct: z.string().refine(
    (v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 50),
    "Pension contribution must be between 0% and 50%"
  ),
  travelAllowance: z.string().refine(
    (v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0),
    "Enter a valid amount"
  ),
  housingAllowance: z.string().refine(
    (v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0),
    "Enter a valid amount"
  ),
  medicalAid: z.string().refine(
    (v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0),
    "Enter a valid amount"
  ),
  retirementAnnuity: z.string().refine(
    (v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0),
    "Enter a valid amount"
  ),
  bank: z.string().min(1, "Bank is required"),
  accountNumber: bankAccountNumber,
  branchCode: branchCode,
  accountType: z.enum(["Cheque", "Savings"]),
});

export const editEmployeeProfileSchema = z.object({
  email: z.email("Enter a valid email address"),
  phone: saPhone,
  emergencyPhone: optionalSaPhone,
});

export const editEmployeeCompensationSchema = z.object({
  annualGross: z
    .string()
    .min(1, "Annual gross salary is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Salary must be greater than zero"),
});

export type FieldErrors = Record<string, string>;

function collectErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (field != null && typeof field !== "symbol" && !errors[String(field)]) {
      errors[String(field)] = issue.message;
    }
  }
  return errors;
}

export function validatePersonalStep(data: unknown): FieldErrors {
  const result = personalStepSchema.safeParse(data);
  return result.success ? {} : collectErrors(result.error.issues);
}

export function validateRoleStep(data: unknown): FieldErrors {
  const result = roleStepSchema.safeParse(data);
  return result.success ? {} : collectErrors(result.error.issues);
}

export function validateCompensationStep(data: unknown): FieldErrors {
  const result = compensationStepSchema.safeParse(data);
  return result.success ? {} : collectErrors(result.error.issues);
}

export function validateEditEmployeeProfile(data: unknown): FieldErrors {
  const result = editEmployeeProfileSchema.safeParse(data);
  return result.success ? {} : collectErrors(result.error.issues);
}

export function validateEditEmployeeCompensation(data: unknown): FieldErrors {
  const result = editEmployeeCompensationSchema.safeParse(data);
  return result.success ? {} : collectErrors(result.error.issues);
}
