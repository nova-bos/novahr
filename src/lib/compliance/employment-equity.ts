import type { EquityGender, EquityRace, OccupationalLevel } from "@/lib/types";

/**
 * Employment Equity reporting (EEA2 workforce profile and EEA4 income
 * differentials) under the SA Employment Equity Act. Designated employers
 * (50+ employees, or over the turnover threshold) must report headcount and
 * remuneration by race, gender and occupational level.
 *
 * The occupational-level and race/gender categories follow the EEA9 form.
 * Verify against the current Department of Employment and Labour templates
 * before submitting a real EEA2/EEA4.
 */

export const OCCUPATIONAL_LEVELS: OccupationalLevel[] = [
  "top_management",
  "senior_management",
  "professional_mid",
  "skilled_technical",
  "semi_skilled",
  "unskilled",
];

export const OCCUPATIONAL_LEVEL_LABELS: Record<OccupationalLevel, string> = {
  top_management: "Top management",
  senior_management: "Senior management",
  professional_mid: "Professionally qualified / mid-management",
  skilled_technical: "Skilled technical",
  semi_skilled: "Semi-skilled",
  unskilled: "Unskilled",
};

export const RACE_LABELS: Record<EquityRace, string> = {
  african: "African",
  coloured: "Coloured",
  indian: "Indian",
  white: "White",
  other: "Other",
};

export interface EquityEmployee {
  race?: EquityRace;
  gender?: EquityGender;
  level?: OccupationalLevel;
  foreignNational: boolean;
  hasDisability: boolean;
  annualGross: number;
}

export interface LevelProfileRow {
  level: OccupationalLevel | "unspecified";
  label: string;
  male: number;
  female: number;
  foreign: number;
  disability: number;
  total: number;
  avgGross: number;
  medianGross: number;
}

export interface RaceProfileRow {
  race: EquityRace | "unspecified";
  label: string;
  male: number;
  female: number;
  total: number;
  avgGross: number;
}

export interface EquityReport {
  headcount: number;
  byLevel: LevelProfileRow[];
  byRace: RaceProfileRow[];
  disabilityCount: number;
  foreignCount: number;
  /** Employees missing race, gender or level, as a data-completeness signal. */
  unspecifiedCount: number;
  dataCompletePct: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const m = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(m * 100) / 100;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100;
}

/**
 * Builds the EEA2 (headcount by level and race/gender) and EEA4 (average and
 * median remuneration) views from a tenant's employees.
 */
export function buildEquityReport(employees: EquityEmployee[]): EquityReport {
  const levelKeys: (OccupationalLevel | "unspecified")[] = [...OCCUPATIONAL_LEVELS, "unspecified"];
  const raceKeys: (EquityRace | "unspecified")[] = ["african", "coloured", "indian", "white", "other", "unspecified"];

  const byLevel: LevelProfileRow[] = levelKeys.map((level) => {
    const group = employees.filter((e) => (e.level ?? "unspecified") === level);
    const gross = group.map((e) => e.annualGross);
    return {
      level,
      label: level === "unspecified" ? "Unspecified" : OCCUPATIONAL_LEVEL_LABELS[level],
      male: group.filter((e) => e.gender === "male").length,
      female: group.filter((e) => e.gender === "female").length,
      foreign: group.filter((e) => e.foreignNational).length,
      disability: group.filter((e) => e.hasDisability).length,
      total: group.length,
      avgGross: avg(gross),
      medianGross: median(gross),
    };
  });

  const byRace: RaceProfileRow[] = raceKeys.map((race) => {
    const group = employees.filter((e) => (e.race ?? "unspecified") === race);
    return {
      race,
      label: race === "unspecified" ? "Unspecified" : RACE_LABELS[race],
      male: group.filter((e) => e.gender === "male").length,
      female: group.filter((e) => e.gender === "female").length,
      total: group.length,
      avgGross: avg(group.map((e) => e.annualGross)),
    };
  });

  const unspecifiedCount = employees.filter(
    (e) => !e.race || !e.gender || !e.level
  ).length;
  const headcount = employees.length;

  return {
    headcount,
    byLevel: byLevel.filter((r) => r.total > 0),
    byRace: byRace.filter((r) => r.total > 0),
    disabilityCount: employees.filter((e) => e.hasDisability).length,
    foreignCount: employees.filter((e) => e.foreignNational).length,
    unspecifiedCount,
    dataCompletePct: headcount === 0 ? 0 : Math.round(((headcount - unspecifiedCount) / headcount) * 100),
  };
}
