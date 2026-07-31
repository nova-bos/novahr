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

// Validates the date of birth encoded in digits 1-6 as a real calendar date
// (rejects e.g. 31 February), using a sliding century window.
function hasRealDateOfBirth(id: string): boolean {
  const yy = parseInt(id.slice(0, 2), 10);
  const mm = parseInt(id.slice(2, 4), 10);
  const dd = parseInt(id.slice(4, 6), 10);
  const currentYY = new Date().getFullYear() % 100;
  const year = (yy <= currentYY ? 2000 : 1900) + yy;
  const date = new Date(Date.UTC(year, mm - 1, dd));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === mm - 1 &&
    date.getUTCDate() === dd
  );
}

export const saIdNumber = z
  .string()
  .regex(/^\d{13}$/, "SA ID must be 13 digits")
  .refine(hasRealDateOfBirth, "SA ID contains an invalid date of birth")
  // Citizenship digit (position 11) must be 0 (citizen) or 1 (permanent resident).
  .refine((id) => id[10] === "0" || id[10] === "1", "SA ID has an invalid citizenship digit")
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
