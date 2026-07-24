import { describe, expect, it } from "vitest";
import { buildIrp5, SARS_SOURCE_CODES } from "./irp5";

const base = {
  income: 0,
  annualPayment: 0,
  commission: 0,
  travelAllowance: 0,
  otherAllowances: 0,
  fringeBenefits: 0,
  pension: 0,
  medicalAid: 0,
  paye: 0,
  uif: 0,
  employerUif: 0,
  sdl: 0,
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

  it("includes fringe benefits (3801), total UIF (4141), SDL (4142) and total (4149)", () => {
    const cert = buildIrp5({
      ...base,
      income: 390_000,
      otherAllowances: 7_800,
      fringeBenefits: 3_560,
      paye: 106_251.68,
      uif: 1_062.72,
      employerUif: 1_062.72,
      sdl: 4_013.58,
    });
    expect(cert.grossRemuneration).toBe(401_360); // 390,000 + 7,800 + 3,560
    expect(cert.incomeLines.find((l) => l.code === SARS_SOURCE_CODES.fringeBenefits)?.amount).toBe(3_560);
    expect(cert.totalUif).toBe(2_125.44); // employer + employee (code 4141)
    expect(cert.sdl).toBe(4_013.58); // code 4142
    expect(cert.totalTaxSdlUif).toBe(112_390.7); // code 4149 = PAYE + total UIF + SDL
  });

  it("omits zero-value lines", () => {
    const cert = buildIrp5({ ...base, income: 120_000, paye: 5_000, uif: 1_200 });
    expect(cert.incomeLines).toHaveLength(1);
    expect(cert.deductionLines).toHaveLength(0);
    expect(cert.totalDeductions).toBe(0);
  });
});
