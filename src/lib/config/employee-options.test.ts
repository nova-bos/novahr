import { describe, it, expect } from "vitest";
import {
  GENDER_OPTIONS,
  MARITAL_OPTIONS,
  QUALIFICATION_TYPES,
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_LABELS,
  MARITAL_LABELS,
  QUALIFICATION_LABELS,
  EMPLOYMENT_TYPE_LABELS,
} from "./employee-options";

function values(options: readonly { value: string }[]): string[] {
  return options.map((o) => o.value);
}

describe("employee option catalogues", () => {
  it("have unique values within each list", () => {
    for (const list of [GENDER_OPTIONS, MARITAL_OPTIONS, QUALIFICATION_TYPES, EMPLOYMENT_TYPE_OPTIONS]) {
      const vals = values(list);
      expect(new Set(vals).size).toBe(vals.length);
    }
  });

  it("preserve the historic values that existing rows may hold", () => {
    // These must never be renamed or removed (data compatibility).
    expect(values(MARITAL_OPTIONS)).toEqual(expect.arrayContaining(["single", "married", "life_partner"]));
    expect(values(QUALIFICATION_TYPES)).toEqual(
      expect.arrayContaining(["degree", "diploma", "certificate", "licence"])
    );
    expect(values(EMPLOYMENT_TYPE_OPTIONS)).toEqual(
      expect.arrayContaining(["full_time", "part_time", "contract"])
    );
  });

  it("include the SA-context additions", () => {
    expect(values(MARITAL_OPTIONS)).toEqual(expect.arrayContaining(["customary_marriage", "civil_union"]));
    expect(values(QUALIFICATION_TYPES)).toEqual(expect.arrayContaining(["masters", "doctorate", "honours"]));
    expect(values(EMPLOYMENT_TYPE_OPTIONS)).toEqual(
      expect.arrayContaining(["temporary", "casual", "learnership", "internship"])
    );
  });

  it("derive label maps covering every option", () => {
    for (const [list, labels] of [
      [GENDER_OPTIONS, GENDER_LABELS],
      [MARITAL_OPTIONS, MARITAL_LABELS],
      [QUALIFICATION_TYPES, QUALIFICATION_LABELS],
      [EMPLOYMENT_TYPE_OPTIONS, EMPLOYMENT_TYPE_LABELS],
    ] as const) {
      for (const opt of list) {
        expect(labels[opt.value]).toBe(opt.label);
      }
    }
  });
});
