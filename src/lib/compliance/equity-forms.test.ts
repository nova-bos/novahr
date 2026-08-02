import { describe, it, expect } from "vitest";
import { buildEquityForms, type EquityPerson } from "./equity-forms";

const p = (over: Partial<EquityPerson>): EquityPerson => ({
  race: "african",
  gender: "male",
  level: "professional_mid",
  foreignNational: false,
  hasDisability: false,
  annualGross: 300000,
  ...over,
});

describe("buildEquityForms", () => {
  it("classifies race/gender into the EEA2 matrix and totals", () => {
    const forms = buildEquityForms([
      p({ race: "african", gender: "male", annualGross: 200000 }),
      p({ race: "white", gender: "female", annualGross: 400000 }),
      p({ foreignNational: true, gender: "male", annualGross: 500000 }),
      p({ gender: "female", hasDisability: true, race: "coloured", annualGross: 300000 }),
    ]);

    expect(forms.headcount).toBe(4);
    const row = forms.eea2Rows.find((r) => r.level === "professional_mid")!;
    expect(row.cell.male.african).toBe(1);
    expect(row.cell.male.foreign).toBe(1);
    expect(row.cell.female.white).toBe(1);
    expect(row.cell.female.coloured).toBe(1);
    expect(row.cell.disability).toBe(1);
    expect(row.cell.total).toBe(4);
    expect(forms.eea2Totals.total).toBe(4);
    expect(forms.eea2Totals.male.foreign).toBe(1);
  });

  it("computes EEA4 gender averages per level", () => {
    const forms = buildEquityForms([
      p({ gender: "male", annualGross: 200000 }),
      p({ gender: "male", annualGross: 400000 }),
      p({ gender: "female", annualGross: 300000 }),
    ]);
    const row = forms.eea4Rows.find((r) => r.level === "professional_mid")!;
    expect(row.maleCount).toBe(2);
    expect(row.maleAvg).toBe(300000);
    expect(row.femaleCount).toBe(1);
    expect(row.femaleAvg).toBe(300000);
    expect(row.avg).toBe(300000);
  });

  it("buckets unspecified level and non-designated race", () => {
    const forms = buildEquityForms([p({ level: null, race: "other", gender: null })]);
    const row = forms.eea2Rows.find((r) => r.level === "unspecified")!;
    expect(row.cell.total).toBe(1);
    // Ungendered person contributes to total but not male/female columns.
    expect(row.cell.male.other + row.cell.female.other).toBe(0);
  });
});
