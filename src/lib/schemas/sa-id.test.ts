import { describe, expect, it } from "vitest";
import {
  dobFromSaId,
  genderFromSaId,
  hasValidCitizenshipDigit,
  readSaId,
} from "./sa-id";

describe("dobFromSaId", () => {
  it("derives the date of birth from a 1900s ID", () => {
    // 800101... -> 1 Jan 1980 (80 is above the current 2-digit year window)
    expect(dobFromSaId("8001015009087")).toBe("1980-01-01");
  });

  it("derives the date of birth from a 2000s ID", () => {
    // 050101... -> 1 Jan 2005
    expect(dobFromSaId("0501015009087")).toBe("2005-01-01");
  });

  it("pads single-digit months and days", () => {
    expect(dobFromSaId("900312")).toBe("1990-03-12");
  });

  it("returns null for an impossible calendar date", () => {
    // 29 Feb 1901 is not a leap year
    expect(dobFromSaId("010229")).toBeNull();
    // month 13
    expect(dobFromSaId("901301")).toBeNull();
  });

  it("returns null when there are fewer than six digits", () => {
    expect(dobFromSaId("9001")).toBeNull();
  });
});

describe("genderFromSaId", () => {
  it("reads a female sequence (0000-4999)", () => {
    expect(genderFromSaId("9001010480084")).toBe("female");
  });

  it("reads a male sequence (5000-9999)", () => {
    expect(genderFromSaId("9001015800088")).toBe("male");
  });

  it("returns null when the sequence digits are missing", () => {
    expect(genderFromSaId("900101")).toBeNull();
  });
});

describe("hasValidCitizenshipDigit", () => {
  it("accepts a citizen (0) and permanent resident (1)", () => {
    expect(hasValidCitizenshipDigit("8001015009087")).toBe(true);
    expect(hasValidCitizenshipDigit("8001015009186")).toBe(true);
  });

  it("rejects any other citizenship digit", () => {
    expect(hasValidCitizenshipDigit("8001015009285")).toBe(false);
  });
});

describe("readSaId", () => {
  it("returns both derived facts", () => {
    expect(readSaId("9001015800088")).toEqual({
      dateOfBirth: "1990-01-01",
      gender: "male",
    });
  });
});
