import type { EmploymentType } from "@/lib/types";

// Single source of truth for employee demographic and qualification dropdowns.
//
// These values are stored as plain strings on the Employee and
// EmployeeQualification records, so the lists can be extended freely without a
// database migration. Existing values (single, married, life_partner, degree,
// diploma, certificate, licence, ...) must never be renamed, only added to, so
// historic records keep rendering the right label.

export type Option = { value: string; label: string };

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

// South African marital statuses, including customary marriage and civil union
// which are both legally recognised alongside civil marriage.
export const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "customary_marriage", label: "Customary marriage" },
  { value: "civil_union", label: "Civil union" },
  { value: "life_partner", label: "Life partner" },
  { value: "engaged", label: "Engaged" },
  { value: "separated", label: "Separated" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
] as const;

// Qualification types ordered roughly by National Qualifications Framework
// (NQF) level, from school-leaving through to doctoral. Covers the full SA
// spectrum: matric, higher and advanced certificates, occupational and trade
// certificates, diplomas, and the full degree ladder up to a PhD.
export const QUALIFICATION_TYPES = [
  { value: "matric", label: "National Senior Certificate (Matric)" },
  { value: "national_certificate", label: "National Certificate" },
  { value: "higher_certificate", label: "Higher Certificate" },
  { value: "advanced_certificate", label: "Advanced Certificate" },
  { value: "certificate", label: "Certificate" },
  { value: "occupational_certificate", label: "Occupational / Trade certificate" },
  { value: "diploma", label: "Diploma" },
  { value: "advanced_diploma", label: "Advanced Diploma" },
  { value: "postgraduate_diploma", label: "Postgraduate Diploma" },
  { value: "degree", label: "Bachelor's Degree" },
  { value: "honours", label: "Honours Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "doctorate", label: "Doctoral Degree (PhD)" },
  { value: "licence", label: "Professional Licence / Registration" },
  { value: "short_course", label: "Short course" },
  { value: "other", label: "Other" },
] as const;

// Employment types aligned to the Basic Conditions of Employment Act. "contract"
// is the fixed-term category (kept as its historic value); learnership and
// internship cover SETA/skills-development placements common in South Africa.
export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-time (permanent)" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Fixed-term contract" },
  { value: "temporary", label: "Temporary" },
  { value: "casual", label: "Casual" },
  { value: "learnership", label: "Learnership" },
  { value: "internship", label: "Internship" },
];

function toLabelMap(options: readonly Option[]): Record<string, string> {
  return Object.fromEntries(options.map((o) => [o.value, o.label]));
}

export const GENDER_LABELS = toLabelMap(GENDER_OPTIONS);
export const MARITAL_LABELS = toLabelMap(MARITAL_OPTIONS);
export const QUALIFICATION_LABELS = toLabelMap(QUALIFICATION_TYPES);
export const EMPLOYMENT_TYPE_LABELS = toLabelMap(EMPLOYMENT_TYPE_OPTIONS);
