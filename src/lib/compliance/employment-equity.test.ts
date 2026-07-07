import { describe, expect, it } from "vitest";
import { buildEquityReport, type EquityEmployee } from "./employment-equity";

function emp(over: Partial<EquityEmployee>): EquityEmployee {
  return { foreignNational: false, hasDisability: false, annualGross: 300_000, ...over };
}

describe("buildEquityReport", () => {
  it("counts headcount by occupational level and race/gender", () => {
    const r = buildEquityReport([
      emp({ race: "african", gender: "female", level: "top_management", annualGross: 900_000 }),
      emp({ race: "white", gender: "male", level: "top_management", annualGross: 1_100_000 }),
      emp({ race: "african", gender: "male", level: "skilled_technical", annualGross: 300_000 }),
    ]);
    expect(r.headcount).toBe(3);
    const top = r.byLevel.find((l) => l.level === "top_management")!;
    expect(top.total).toBe(2);
    expect(top.male).toBe(1);
    expect(top.female).toBe(1);
    expect(top.avgGross).toBe(1_000_000);
    const african = r.byRace.find((x) => x.race === "african")!;
    expect(african.total).toBe(2);
  });

  it("tracks disability, foreign nationals and data completeness", () => {
    const r = buildEquityReport([
      emp({ race: "coloured", gender: "male", level: "unskilled", hasDisability: true }),
      emp({ foreignNational: true }), // missing race/gender/level -> unspecified
    ]);
    expect(r.disabilityCount).toBe(1);
    expect(r.foreignCount).toBe(1);
    expect(r.unspecifiedCount).toBe(1);
    expect(r.dataCompletePct).toBe(50);
  });

  it("computes median remuneration per level", () => {
    const r = buildEquityReport([
      emp({ level: "semi_skilled", gender: "male", race: "african", annualGross: 100_000 }),
      emp({ level: "semi_skilled", gender: "female", race: "african", annualGross: 200_000 }),
      emp({ level: "semi_skilled", gender: "male", race: "coloured", annualGross: 300_000 }),
    ]);
    const row = r.byLevel.find((l) => l.level === "semi_skilled")!;
    expect(row.medianGross).toBe(200_000);
    expect(row.avgGross).toBe(200_000);
  });
});
