import { describe, expect, it } from "vitest";
import {
  getPayrollRunsByTenant,
  getPayslip,
  getPayslipsByEmployee,
  getPayslipsByRun,
  payslips,
} from "./payroll";

describe("getPayrollRunsByTenant", () => {
  it("returns the tenant's runs sorted by period, ascending", () => {
    const runs = getPayrollRunsByTenant("novatech");

    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((r) => r.tenantId === "novatech")).toBe(true);

    for (let i = 0; i < runs.length - 1; i++) {
      expect(runs[i].period.localeCompare(runs[i + 1].period)).toBeLessThanOrEqual(0);
    }
  });

  it("marks all but the last run as completed, and the last as scheduled", () => {
    const runs = getPayrollRunsByTenant("novatech");

    expect(runs.slice(0, -1).every((r) => r.status === "completed")).toBe(true);
    expect(runs[runs.length - 1].status).toBe("scheduled");
  });

  it("returns an empty array for an unknown tenant", () => {
    expect(getPayrollRunsByTenant("does-not-exist")).toEqual([]);
  });
});

describe("getPayslipsByRun", () => {
  it("returns only payslips belonging to the given run", () => {
    const run = getPayrollRunsByTenant("novatech")[0];
    const result = getPayslipsByRun(run.id);

    expect(result.length).toBe(run.payslipIds.length);
    expect(result.every((p) => p.runId === run.id)).toBe(true);
  });

  it("returns an empty array for an unknown run", () => {
    expect(getPayslipsByRun("does-not-exist")).toEqual([]);
  });
});

describe("getPayslip", () => {
  it("returns the payslip with the given id", () => {
    const payslip = payslips[0];
    expect(getPayslip(payslip.id)).toBe(payslip);
  });

  it("returns undefined for an unknown id", () => {
    expect(getPayslip("does-not-exist")).toBeUndefined();
  });
});

describe("getPayslipsByEmployee", () => {
  it("returns the employee's payslips sorted by period, descending", () => {
    const employeeId = payslips[0].employeeId;
    const result = getPayslipsByEmployee(employeeId);

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.employeeId === employeeId)).toBe(true);

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].period.localeCompare(result[i + 1].period)).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns an empty array for an unknown employee", () => {
    expect(getPayslipsByEmployee("does-not-exist")).toEqual([]);
  });
});
