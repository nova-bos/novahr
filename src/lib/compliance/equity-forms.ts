// Pure builders for the statutory Employment Equity forms EEA2 (workforce
// profile) and EEA4 (income differentials). Kept free of "use server" so they
// can be unit tested and rendered into a PDF. The occupational-level and
// race/gender categories follow the DoL EEA9 classification.
//
// NOTE: this produces the workforce-profile and income matrices that populate
// the EEA2/EEA4. The output should be checked against the current DoL form
// before official submission.
import type { EquityRace, EquityGender, OccupationalLevel } from "@/lib/types";
import { OCCUPATIONAL_LEVELS, OCCUPATIONAL_LEVEL_LABELS } from "./employment-equity";

export interface EquityPerson {
  race?: EquityRace | null;
  gender?: EquityGender | null;
  level?: OccupationalLevel | null;
  foreignNational: boolean;
  hasDisability: boolean;
  annualGross: number;
}

// The EEA form splits designated groups (African, Coloured, Indian, White) from
// foreign nationals. "Other"/unspecified race keeps everyone accounted for.
export type RaceColumn = "african" | "coloured" | "indian" | "white" | "other" | "foreign";
export const RACE_COLUMNS: RaceColumn[] = [
  "african",
  "coloured",
  "indian",
  "white",
  "other",
  "foreign",
];
export const RACE_COLUMN_LABELS: Record<RaceColumn, string> = {
  african: "African",
  coloured: "Coloured",
  indian: "Indian",
  white: "White",
  other: "Other",
  foreign: "Foreign",
};

type LevelKey = OccupationalLevel | "unspecified";

function raceColumnFor(p: EquityPerson): RaceColumn {
  if (p.foreignNational) return "foreign";
  switch (p.race) {
    case "african":
    case "coloured":
    case "indian":
    case "white":
      return p.race;
    default:
      return "other";
  }
}

function genderKeyFor(p: EquityPerson): "male" | "female" | null {
  if (p.gender === "male") return "male";
  if (p.gender === "female") return "female";
  return null;
}

function zeroRow(): Record<RaceColumn, number> {
  return { african: 0, coloured: 0, indian: 0, white: 0, other: 0, foreign: 0 };
}

export interface Eea2Cell {
  male: Record<RaceColumn, number>;
  female: Record<RaceColumn, number>;
  disability: number;
  total: number;
}

export interface Eea2Row {
  level: LevelKey;
  label: string;
  cell: Eea2Cell;
}

// Per occupational level: count and average annual remuneration by gender.
export interface Eea4Row {
  level: LevelKey;
  label: string;
  maleCount: number;
  maleAvg: number;
  femaleCount: number;
  femaleAvg: number;
  total: number;
  avg: number;
}

export interface EquityForms {
  headcount: number;
  asAt: string;
  eea2Rows: Eea2Row[];
  eea2Totals: Eea2Cell;
  eea4Rows: Eea4Row[];
  /** Average annual remuneration across the whole workforce by race column. */
  eea4ByRace: { column: RaceColumn; label: string; count: number; avg: number }[];
}

function emptyCell(): Eea2Cell {
  return { male: zeroRow(), female: zeroRow(), disability: 0, total: 0 };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Builds the EEA2 workforce-profile and EEA4 income matrices from employees. */
export function buildEquityForms(people: EquityPerson[], asAt = new Date().toISOString().slice(0, 10)): EquityForms {
  const levelKeys: LevelKey[] = [...OCCUPATIONAL_LEVELS, "unspecified"];

  const totals = emptyCell();
  const eea2Rows: Eea2Row[] = [];
  const eea4Rows: Eea4Row[] = [];

  for (const level of levelKeys) {
    const group = people.filter((p) => (p.level ?? "unspecified") === level);
    if (group.length === 0) continue;

    const cell = emptyCell();
    let maleSum = 0;
    let maleCount = 0;
    let femaleSum = 0;
    let femaleCount = 0;

    for (const person of group) {
      const col = raceColumnFor(person);
      const g = genderKeyFor(person);
      if (g === "male") {
        cell.male[col] += 1;
        maleSum += person.annualGross;
        maleCount += 1;
        totals.male[col] += 1;
      } else if (g === "female") {
        cell.female[col] += 1;
        femaleSum += person.annualGross;
        femaleCount += 1;
        totals.female[col] += 1;
      }
      if (person.hasDisability) {
        cell.disability += 1;
        totals.disability += 1;
      }
      cell.total += 1;
      totals.total += 1;
    }

    eea2Rows.push({
      level,
      label: level === "unspecified" ? "Unspecified" : OCCUPATIONAL_LEVEL_LABELS[level],
      cell,
    });

    const levelTotal = maleCount + femaleCount;
    eea4Rows.push({
      level,
      label: level === "unspecified" ? "Unspecified" : OCCUPATIONAL_LEVEL_LABELS[level],
      maleCount,
      maleAvg: maleCount > 0 ? round2(maleSum / maleCount) : 0,
      femaleCount,
      femaleAvg: femaleCount > 0 ? round2(femaleSum / femaleCount) : 0,
      total: group.length,
      avg: levelTotal > 0 ? round2((maleSum + femaleSum) / levelTotal) : 0,
    });
  }

  const eea4ByRace = RACE_COLUMNS.map((column) => {
    const group = people.filter((p) => raceColumnFor(p) === column);
    const avg =
      group.length > 0 ? round2(group.reduce((s, p) => s + p.annualGross, 0) / group.length) : 0;
    return { column, label: RACE_COLUMN_LABELS[column], count: group.length, avg };
  }).filter((r) => r.count > 0);

  return {
    headcount: people.length,
    asAt,
    eea2Rows,
    eea2Totals: totals,
    eea4Rows,
    eea4ByRace,
  };
}
