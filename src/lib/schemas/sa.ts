import { z } from "zod";

function luhnCheck(id: string): boolean {
  let sum = 0;
  let doubleUp = false;
  for (let i = id.length - 1; i >= 0; i--) {
    let digit = parseInt(id[i], 10);
    if (doubleUp) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleUp = !doubleUp;
  }
  return sum % 10 === 0;
}

export const saIdNumber = z
  .string()
  .regex(/^\d{13}$/, "SA ID must be 13 digits")
  .refine((id) => {
    const mm = parseInt(id.slice(2, 4), 10);
    const dd = parseInt(id.slice(4, 6), 10);
    return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31;
  }, "SA ID contains an invalid date of birth")
  .refine(luhnCheck, "SA ID number is invalid");

// Accepts 0XXXXXXXXX (10 digits) or +27XXXXXXXXX (12 chars). Spaces and
// hyphens are ignored: the error message and placeholders show the number as
// "071 234 5678", so typing it that way must validate.
export const saPhone = z
  .string()
  .refine(
    (v) => /^(\+27|0)\d{9}$/.test(v.replace(/[\s-]/g, "")),
    "Enter a valid South African phone number, e.g. 071 234 5678"
  );

export const bankAccountNumber = z
  .string()
  .regex(/^\d{6,11}$/, "Account number must be 6 to 11 digits");

export const branchCode = z
  .string()
  .regex(/^\d{6}$/, "Branch code must be 6 digits");
