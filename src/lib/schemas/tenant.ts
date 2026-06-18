import { z } from "zod";
import type { FieldErrors } from "./employee";

export const companyProfileSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  legalName: z.string().min(2, "Legal name must be at least 2 characters"),
  industry: z.string().min(1, "Industry is required"),
  founded: z.string().refine((v) => v === "" || /^\d{4}$/.test(v), "Founded year must be 4 digits"),
  registrationNumber: z.string(),
  vatNumber: z.string(),
  city: z.string(),
  address: z.string(),
  primaryContact: z.string().min(1, "Primary contact is required"),
});

export const payrollSettingsSchema = z.object({
  payFrequency: z.enum(["monthly", "biweekly", "weekly"]),
  payDay: z.string().refine(
    (v) => !isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 31,
    "Pay day must be between 1 and 31"
  ),
  bankName: z.string(),
});

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

export function validateCompanyProfile(data: unknown): FieldErrors {
  const result = companyProfileSchema.safeParse(data);
  return result.success ? {} : collectErrors(result.error.issues);
}

export function validatePayrollSettings(data: unknown): FieldErrors {
  const result = payrollSettingsSchema.safeParse(data);
  return result.success ? {} : collectErrors(result.error.issues);
}
