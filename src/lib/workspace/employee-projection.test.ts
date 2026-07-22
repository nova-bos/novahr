import { describe, it, expect } from "vitest";
import { projectEmployees, sanitizeEmployee, sanitizeForManagerReport } from "./employee-projection";
import type { Employee } from "@/lib/types";

function makeEmployee(overrides: Partial<Employee> & { id: string }): Employee {
  return {
    tenantId: "t1",
    employeeNumber: "EMP001",
    firstName: "Test",
    lastName: "Person",
    email: "test@x.co.za",
    phone: "0821234567",
    avatarColor: "#000",
    initials: "TP",
    jobTitle: "Engineer",
    department: "Engineering",
    employmentType: "full_time",
    status: "active",
    startDate: "2024-01-01",
    location: "Cape Town",
    salary: { annualGross: 600000, currency: "ZAR", payFrequency: "monthly" },
    bankDetails: { bank: "FNB", accountNumber: "62012345678", branchCode: "250655", accountType: "Cheque", validated: true, validatedAt: null },
    taxNumber: "0123456789",
    idNumber: "9001015800088",
    dateOfBirth: "1990-01-01",
    address: "12 Long Street",
    emergencyContact: { name: "Kin", relationship: "Spouse", phone: "0839999999" },
    equityRace: "african",
    equityGender: "female",
    occupationalLevel: "professional_mid",
    hasDisability: false,
    foreignNational: false,
    leaveBalances: [{ type: "annual", total: 21, used: 5 }],
    ...overrides,
  } as Employee;
}

const SENSITIVE_STRIPPED = (e: Employee) => {
  expect(e.taxNumber).toBe("");
  expect(e.idNumber).toBe("");
  expect(e.bankDetails.accountNumber).toBe("");
  expect(e.address).toBe("");
  expect(e.emergencyContact.name).toBe("");
  expect(e.equityRace).toBeUndefined();
  expect(e.equityGender).toBeUndefined();
  expect(e.occupationalLevel).toBeUndefined();
  expect(e.hasDisability).toBeUndefined();
  expect(e.foreignNational).toBeUndefined();
};

describe("sanitizeEmployee (directory shape)", () => {
  it("strips financial, identifying and equity data and zeroes salary/balances", () => {
    const s = sanitizeEmployee(makeEmployee({ id: "e1" }));
    SENSITIVE_STRIPPED(s);
    expect(s.salary.annualGross).toBe(0);
    expect(s.leaveBalances).toEqual([]);
    expect(s.dateOfBirth).toBeUndefined();
    // directory fields retained
    expect(s.firstName).toBe("Test");
    expect(s.jobTitle).toBe("Engineer");
  });
});

describe("sanitizeForManagerReport", () => {
  it("strips deep PII and equity but keeps salary, dateOfBirth and leave balances", () => {
    const s = sanitizeForManagerReport(makeEmployee({ id: "e1" }));
    SENSITIVE_STRIPPED(s);
    // operational data retained for team payroll estimate + approvals
    expect(s.salary.annualGross).toBe(600000);
    expect(s.dateOfBirth).toBe("1990-01-01");
    expect(s.leaveBalances).toHaveLength(1);
  });
});

describe("projectEmployees", () => {
  const self = makeEmployee({ id: "self", employeeNumber: "EMP-SELF" });
  const report = makeEmployee({ id: "report", managerId: "self" });
  const colleague = makeEmployee({ id: "colleague", managerId: "someone-else" });
  const all = [self, report, colleague];

  it("gives HR the full, unmodified list", () => {
    const { employees, visibleEmployeeIds } = projectEmployees(all, { role: "hr", employeeId: "self" });
    expect(employees).toBe(all);
    expect(employees[2].salary.annualGross).toBe(600000);
    expect(visibleEmployeeIds.size).toBe(3);
  });

  it("gives exco the full list", () => {
    const { employees } = projectEmployees(all, { role: "exco", employeeId: null });
    expect(employees[1].idNumber).toBe("9001015800088");
  });

  it("employee: own record full, every colleague reduced to directory shape", () => {
    const { employees, visibleEmployeeIds } = projectEmployees(all, { role: "employee", employeeId: "self" });
    const projSelf = employees.find((e) => e.id === "self")!;
    const projReport = employees.find((e) => e.id === "report")!;
    expect(projSelf.idNumber).toBe("9001015800088"); // own record intact
    expect(projReport.salary.annualGross).toBe(0); // colleague sanitized
    SENSITIVE_STRIPPED(projReport);
    // an employee only sees their own leave
    expect(visibleEmployeeIds.has("self")).toBe(true);
    expect(visibleEmployeeIds.has("report")).toBe(false);
  });

  it("manager: own full, reports keep salary but lose deep PII, others directory-only", () => {
    const { employees, visibleEmployeeIds } = projectEmployees(all, { role: "manager", employeeId: "self" });
    const projReport = employees.find((e) => e.id === "report")!;
    const projColleague = employees.find((e) => e.id === "colleague")!;

    // direct report: salary kept, deep PII stripped
    expect(projReport.salary.annualGross).toBe(600000);
    expect(projReport.leaveBalances).toHaveLength(1);
    SENSITIVE_STRIPPED(projReport);

    // non-report colleague: fully sanitized directory shape
    expect(projColleague.salary.annualGross).toBe(0);
    SENSITIVE_STRIPPED(projColleague);

    // manager sees their own and reports' leave, not others'
    expect(visibleEmployeeIds.has("self")).toBe(true);
    expect(visibleEmployeeIds.has("report")).toBe(true);
    expect(visibleEmployeeIds.has("colleague")).toBe(false);
  });

  it("never mutates the input records", () => {
    projectEmployees(all, { role: "employee", employeeId: "self" });
    // the shared source objects keep their data
    expect(colleague.idNumber).toBe("9001015800088");
    expect(colleague.salary.annualGross).toBe(600000);
  });
});
