import { z } from "zod";
import { saIdNumber, saPhone, bankAccountNumber, branchCode } from "./sa";

const optionalSaPhone = z
  .string()
  .refine((v) => v === "" || saPhone.safeParse(v).success, {
    message: "Enter a valid South African phone number, e.g. 071 234 5678",
  });

export const personalStepSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    preferredName: z.string(),
    email: z.email("Enter a valid email address"),
    phone: saPhone,
    idType: z.enum(["sa_id", "passport"]).default("sa_id"),
    // ID and passport are validated conditionally in superRefine below, so the
    // base fields accept any string here.
    idNumber: z.string().default(""),
    passportNumber: z.string().default(""),
    nationality: z.string().default(""),
    dateOfBirth: z.string().default(""),
    gender: z.enum(["male", "female", "other", ""]).default(""),
    maritalStatus: z
      .enum([
        "single",
        "married",
        "customary_marriage",
        "civil_union",
        "life_partner",
        "engaged",
        "separated",
        "divorced",
        "widowed",
        "",
      ])
      .default(""),
    taxNumber: z.string().refine(
      (v) => v === "" || /^\d{10}$/.test(v),
      "Tax number must be 10 digits"
    ),
    address: z.string(),
    nextOfKinName: z.string().default(""),
    nextOfKinRelationship: z.string().default(""),
    nextOfKinPhone: z.string().default("").refine(
      (v) => v === "" || saPhone.safeParse(v).success,
      "Enter a valid South African phone number, e.g. 071 234 5678"
    ),
    nextOfKinAddress: z.string().default(""),
    emergencyContactSameAsNextOfKin: z.boolean().default(false),
    emergencyName: z.string(),
    emergencyRelationship: z.string(),
    emergencyPhone: optionalSaPhone,
  })
  .superRefine((data, ctx) => {
    if (data.idType === "passport") {
      if (!data.passportNumber.trim()) {
        ctx.addIssue({ code: "custom", path: ["passportNumber"], message: "Passport number is required" });
      }
      if (!data.nationality.trim()) {
        ctx.addIssue({ code: "custom", path: ["nationality"], message: "Nationality is required" });
      }
      if (!data.dateOfBirth.trim()) {
        ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Date of birth is required" });
      }
      if (!data.gender) {
        ctx.addIssue({ code: "custom", path: ["gender"], message: "Gender is required" });
      }
    } else {
      const result = saIdNumber.safeParse(data.idNumber);
      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          path: ["idNumber"],
          message: result.error.issues[0]?.message ?? "SA ID number is invalid",
        });
      }
    }
  });

export const roleStepSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  department: z.string(),
  employmentType: z.enum([
    "full_time",
    "part_time",
    "contract",
    "temporary",
    "casual",
    "learnership",
    "internship",
  ]),
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
  // Next-of-kin phone is optional but, when supplied, must be a valid SA number.
  nextOfKinPhone: optionalSaPhone,
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
