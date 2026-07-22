import { z } from "zod";
import type { FieldErrors } from "./employee";

const daySelectionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["full", "partial"]),
});

export const leaveRequestSchema = z.object({
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
  daySelections: z.array(daySelectionSchema).min(1, "Please select at least one day"),
  reason: z.string().optional(),
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
