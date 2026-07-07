import { describe, expect, it } from "vitest";
import { buildIrp5, SARS_SOURCE_CODES } from "./irp5";

const base = {
  income: 0,
  annualPayment: 0,
  commission: 0,
  travelAllowance: 0,
  otherAllowances: 0,
  pension: 0,
  medicalAid: 0,
  paye: 0,
  uif: 0,
};

describe("buildIrp5", () => {
  it("produces an IRP5 with source-code lines and gross remuneration 3699", () => {
    const cert = buildIrp5({
      ...base,
      income: 480_000,
      annualPayment: 40_000,
      travelAllowance: 60_000,
      pension: 33_000,
      medicalAid: 24_000,
      paye: 96_000,
      uif: 2_124,
    });
    expect(cert.type).toBe("IRP5");
    // gross remuneration is the sum of income lines (3699)
    expect(cert.grossRemuneration).toBe(580_000);
    // total deductions is pension + medical (4103)
    expect(cert.totalDeductions).toBe(57_000);
    expect(cert.paye).toBe(96_000);
    expect(cert.uif).toBe(2_124);
    // income line codes are present and correct
    expect(cert.incomeLines.find((l) => l.code === SARS_SOURCE_CODES.income)?.amount).toBe(480_000);
    expect(cert.incomeLines.find((l) => l.code === SARS_SOURCE_CODES.annualPayment)?.amount).toBe(40_000);
    expect(cert.incomeLines.find((l) => l.code === SARS_SOURCE_CODES.travelAllowance)?.amount).toBe(60_000);
  });

  it("issues an IT3(a) when no PAYE was deducted", () => {
    const cert = buildIrp5({ ...base, income: 60_000, uif: 600 });
    expect(cert.type).toBe("IT3(a)");
    expect(cert.paye).toBe(0);
    expect(cert.grossRemuneration).toBe(60_000);
  });

  it("omits zero-value lines", () => {
    const cert = buildIrp5({ ...base, income: 120_000, paye: 5_000, uif: 1_200 });
    expect(cert.incomeLines).toHaveLength(1);
    expect(cert.deductionLines).toHaveLength(0);
    expect(cert.totalDeductions).toBe(0);
  });
});
