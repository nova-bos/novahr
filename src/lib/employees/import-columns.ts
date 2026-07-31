// Shared spec for the employee CSV import. Kept out of the "use server" action
// file so both the client dialog and the server can import the column list,
// template builder and parser. The parser is a proper CSV reader: it handles
// quoted fields with embedded commas and newlines, escaped quotes (""), a
// leading UTF-8 BOM from Excel, and maps columns by header name so the order in
// the file does not matter.

export interface ImportColumn {
  key: string;
  label: string;
  required: boolean;
  example: string;
  hint?: string;
}

/**
 * Every field we capture when onboarding someone, matching the manual
 * onboarding wizard. Required fields are the same ones the wizard insists on so
 * a bulk-imported employee is as complete as a hand-entered one, and ready for
 * payroll (ID number and bank details included).
 */
export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: "employeeNumber", label: "Employee number", required: false, example: "", hint: "Leave blank to create a new employee; fill in to update an existing one" },
  { key: "firstName", label: "First name", required: true, example: "Jane" },
  { key: "lastName", label: "Last name", required: true, example: "Doe" },
  { key: "preferredName", label: "Preferred name", required: false, example: "Jane" },
  { key: "email", label: "Email", required: true, example: "jane.doe@company.co.za" },
  { key: "phone", label: "Phone", required: true, example: "0712345678", hint: "SA number, e.g. 071 234 5678" },
  { key: "idType", label: "ID type", required: false, example: "sa_id", hint: "sa_id or passport (defaults to sa_id)" },
  { key: "idNumber", label: "SA ID number", required: false, example: "8001015009087", hint: "13 digits; required unless ID type is passport" },
  { key: "passportNumber", label: "Passport number", required: false, example: "", hint: "Required when ID type is passport" },
  { key: "nationality", label: "Nationality", required: false, example: "", hint: "For passport holders, e.g. Zimbabwean" },
  { key: "dateOfBirth", label: "Date of birth", required: false, example: "", hint: "YYYY-MM-DD; required for passport holders, derived from the SA ID otherwise" },
  { key: "gender", label: "Gender", required: false, example: "", hint: "male, female or other; derived from the SA ID when possible" },
  { key: "maritalStatus", label: "Marital status", required: false, example: "", hint: "single, married, divorced, widowed or life_partner" },
  { key: "taxNumber", label: "Tax number", required: false, example: "1234567890", hint: "10 digits" },
  { key: "jobTitle", label: "Job title", required: true, example: "Software Engineer" },
  { key: "department", label: "Department", required: false, example: "Engineering", hint: "Defaults to General" },
  { key: "branch", label: "Branch", required: false, example: "", hint: "Branch code or name; must match an existing branch. Leave blank for head office" },
  { key: "employmentType", label: "Employment type", required: false, example: "full_time", hint: "full_time, part_time, contract, temporary, casual, learnership or internship" },
  { key: "startDate", label: "Start date", required: true, example: "2024-01-15", hint: "YYYY-MM-DD" },
  { key: "location", label: "Work location", required: false, example: "Johannesburg" },
  { key: "managerEmail", label: "Manager email", required: false, example: "", hint: "Email of an existing or imported employee" },
  { key: "annualGross", label: "Annual gross salary", required: true, example: "480000", hint: "Number only, no thousands separators" },
  { key: "payFrequency", label: "Pay frequency", required: false, example: "monthly", hint: "monthly, biweekly or weekly" },
  { key: "travelAllowance", label: "Travel allowance (monthly)", required: false, example: "0" },
  { key: "housingAllowance", label: "Housing allowance (monthly)", required: false, example: "0" },
  { key: "pensionContributionPct", label: "Pension contribution %", required: false, example: "7.5", hint: "0 to 50" },
  { key: "medicalAid", label: "Medical aid (monthly)", required: false, example: "0" },
  { key: "retirementAnnuity", label: "Retirement annuity (monthly)", required: false, example: "0" },
  { key: "bank", label: "Bank", required: true, example: "FNB" },
  { key: "accountNumber", label: "Account number", required: true, example: "62012345678", hint: "6 to 11 digits" },
  { key: "branchCode", label: "Branch code", required: true, example: "250655", hint: "6 digits" },
  { key: "accountType", label: "Account type", required: false, example: "Cheque", hint: "Cheque or Savings" },
  { key: "address", label: "Address", required: false, example: "1 Main Road, Sandton" },
  { key: "emergencyName", label: "Emergency contact name", required: false, example: "John Doe" },
  { key: "emergencyRelationship", label: "Emergency contact relationship", required: false, example: "Spouse" },
  { key: "emergencyPhone", label: "Emergency contact phone", required: false, example: "0723456789" },
  { key: "nextOfKinName", label: "Next of kin name", required: false, example: "" },
  { key: "nextOfKinRelationship", label: "Next of kin relationship", required: false, example: "" },
  { key: "nextOfKinPhone", label: "Next of kin phone", required: false, example: "" },
  { key: "nextOfKinAddress", label: "Next of kin address", required: false, example: "" },
  { key: "equityRace", label: "Equity race", required: false, example: "african", hint: "african, coloured, indian, white or other" },
  { key: "equityGender", label: "Equity gender", required: false, example: "female", hint: "male, female or other" },
  { key: "occupationalLevel", label: "Occupational level", required: false, example: "professional_mid", hint: "top_management, senior_management, professional_mid, skilled_technical, semi_skilled or unskilled" },
  { key: "foreignNational", label: "Foreign national", required: false, example: "no", hint: "yes or no" },
  { key: "hasDisability", label: "Has disability", required: false, example: "no", hint: "yes or no" },
];

export type CsvRow = Record<string, string>;

/** Normalise a header cell so "First Name", "first_name" and "firstname" all match. */
function normaliseHeader(h: string): string {
  return h.replace(/[\s_-]/g, "").toLowerCase();
}

/** Wrap a value in quotes if it contains a comma, quote or newline. */
function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Build the downloadable template: a header row plus one filled example row. */
export function buildTemplateCsv(): string {
  const header = IMPORT_COLUMNS.map((c) => c.key).join(",");
  const example = IMPORT_COLUMNS.map((c) => csvCell(c.example)).join(",");
  return `${header}\n${example}\n`;
}

/**
 * Tokenise CSV text into rows of cells. Handles quoted fields (with embedded
 * commas, newlines and "" escapes) and both \n and \r\n line endings.
 */
function tokenise(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\r") {
      // ignore; handled by the following \n
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/**
 * Parse CSV text into row objects keyed by our column keys, mapping columns by
 * header name. Unknown columns are ignored, missing ones default to "". Rows
 * that are completely empty are skipped.
 */
export function parseCsv(text: string): CsvRow[] {
  const clean = text.replace(/^﻿/, ""); // strip Excel BOM
  const table = tokenise(clean);
  if (table.length < 2) return [];

  const header = table[0].map(normaliseHeader);
  const indexByKey: Record<string, number> = {};
  for (const col of IMPORT_COLUMNS) {
    indexByKey[col.key] = header.indexOf(normaliseHeader(col.key));
  }

  const out: CsvRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const obj: CsvRow = {};
    let hasValue = false;
    for (const col of IMPORT_COLUMNS) {
      const idx = indexByKey[col.key];
      const raw = idx >= 0 ? (cells[idx] ?? "") : "";
      const value = raw.trim();
      obj[col.key] = value;
      if (value) hasValue = true;
    }
    if (hasValue) out.push(obj);
  }
  return out;
}
