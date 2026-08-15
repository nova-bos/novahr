import { describe, it, expect } from "vitest";
import { generateEmploymentContract, type LetterData } from "./letter-templates";

const base: LetterData = {
  companyName: "Ironwood Freight",
  companyLegalName: "Ironwood Freight (Pty) Ltd",
  companyRegistration: "2019/123456/07",
  companyAddress: "14 Oak Ave, Sandton",
  employeeName: "Nomsa Dlamini",
  employeeNumber: "IRO-0001",
  employeeIdNumber: "8803120812085",
  jobTitle: "HR Manager",
  department: "Admin",
  placeOfWork: "Johannesburg",
  employmentType: "Full-time",
  payFrequency: "monthly",
  startDate: "01 Feb 2019",
  salary: 456000,
  today: "15 Aug 2026",
  signatory: "Wandile Mtshwene",
};

describe("generateEmploymentContract", () => {
  const html = generateEmploymentContract(base);

  it("includes the parties, registration and ID", () => {
    expect(html).toContain("Ironwood Freight (Pty) Ltd");
    expect(html).toContain("2019/123456/07");
    expect(html).toContain("Nomsa Dlamini");
    expect(html).toContain("8803120812085");
  });

  it("shows annual and monthly remuneration", () => {
    expect(html).toContain("Annual gross remuneration");
    expect(html).toContain("Monthly gross remuneration");
    // Currency grouping is ICU-locale dependent (spaces may be non-breaking), so
    // match the significant digits rather than an exact formatted string.
    const normalised = html.replace(/\u00a0/g, " ");
    expect(normalised).toMatch(/456[ .,]?000/);
    expect(normalised).toMatch(/38[ .,]?000/);
  });

  it("covers the core BCEA clauses", () => {
    for (const clause of ["Probation", "Leave", "Termination and notice", "personal information", "CCMA"]) {
      expect(html).toContain(clause);
    }
  });

  it("marks an indefinite contract when there is no end date", () => {
    expect(html).toContain("indefinite period");
  });

  it("marks a fixed term when an end date is given", () => {
    const fixed = generateEmploymentContract({ ...base, endDate: "31 Jan 2027" });
    expect(fixed).toContain("fixed-term contract");
    expect(fixed).toContain("31 Jan 2027");
  });

  it("never contains an em or en dash (house rule)", () => {
    expect(/[\u2013\u2014]/.test(html)).toBe(false);
  });
});
