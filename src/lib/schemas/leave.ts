import { z } from "zod";
import type { FieldErrors } from "./employee";

export const leaveRequestSchema = z
  .object({
    employeeId: z.string().min(1, "Please select an employee"),
    type: z.enum([
      "annual",
      "sick",
      "family",
      "unpaid",
      "maternity",
      "parental",
      "adoption",
      "commissioning",
      "study",
    ]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().min(3, "Please add a reason for this request"),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate >= d.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export function validateLeaveRequest(data: unknown): FieldErrors {
  const result = leaveRequestSchema.safeParse(data);
  if (result.success) return {};
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field != null && typeof field !== "symbol" && !errors[String(field)]) {
      errors[String(field)] = issue.message;
    }
  }
  return errors;
}
