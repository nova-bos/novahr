// Helpers for reading a South African ID number. An SA ID is 13 digits:
//   YYMMDD SSSS C A Z
//   1-6  date of birth (YYMMDD)
//   7-10 sequence, encoding gender: 0000-4999 female, 5000-9999 male
//   11   citizenship: 0 = SA citizen, 1 = permanent resident
//   12   usually 8 (historically a race digit, now fixed)
//   13   Luhn checksum
//
// The Zod `saIdNumber` schema in ./sa.ts owns validation (13 digits, real
// calendar date, citizenship digit, Luhn). These helpers derive facts from an
// ID that has already been validated, so the onboarding wizard can prefill and
// show date of birth and gender.

export type DerivedGender = "male" | "female";

/**
 * Derive the date of birth (YYYY-MM-DD) from the first six digits of an SA ID.
 * Uses a sliding century window: a two-digit year less than or equal to the
 * current two-digit year is read as 2000s, otherwise 1900s. Returns null when
 * the digits are not a real calendar date.
 */
export function dobFromSaId(id: string): string | null {
  if (!/^\d{6}/.test(id)) return null;
  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));
  const currentYY = new Date().getFullYear() % 100;
  const century = yy <= currentYY ? 2000 : 1900;
  const year = century + yy;
  // Validate as a real calendar date (rejects e.g. 30 February).
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== mm - 1 ||
    date.getUTCDate() !== dd
  ) {
    return null;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(mm)}-${pad(dd)}`;
}

/**
 * Derive gender from digits 7 to 10 of an SA ID. 0000-4999 is female,
 * 5000-9999 is male. Returns null when those digits are missing.
 */
export function genderFromSaId(id: string): DerivedGender | null {
  if (!/^\d{10}/.test(id)) return null;
  const sequence = Number(id.slice(6, 10));
  return sequence < 5000 ? "female" : "male";
}

/**
 * True when the citizenship digit (position 11) is 0 (citizen) or 1
 * (permanent resident). Any other value marks a malformed ID.
 */
export function hasValidCitizenshipDigit(id: string): boolean {
  if (id.length < 11) return false;
  return id[10] === "0" || id[10] === "1";
}

export interface SaIdFacts {
  dateOfBirth: string | null;
  gender: DerivedGender | null;
}

/** Convenience wrapper returning both derived facts at once. */
export function readSaId(id: string): SaIdFacts {
  return { dateOfBirth: dobFromSaId(id), gender: genderFromSaId(id) };
}
