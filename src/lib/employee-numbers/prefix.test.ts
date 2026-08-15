import { describe, it, expect } from "vitest";
import { deriveEmployeeNumberPrefix } from "./prefix";

describe("deriveEmployeeNumberPrefix", () => {
  it("takes the first three letters, uppercased", () => {
    expect(deriveEmployeeNumberPrefix("Ironwood Freight (Pty) Ltd")).toBe("IRO");
    expect(deriveEmployeeNumberPrefix("Ubuntu Community Health NPC")).toBe("UBU");
    expect(deriveEmployeeNumberPrefix("Edge Case Traders CC")).toBe("EDG");
  });

  it("skips punctuation and spaces at the start of the run", () => {
    expect(deriveEmployeeNumberPrefix("Thuli's Kitchen")).toBe("THU");
  });

  it("falls back to EMP when the name does not start with a letter", () => {
    expect(deriveEmployeeNumberPrefix("3M South Africa")).toBe("EMP");
    expect(deriveEmployeeNumberPrefix("@Home")).toBe("EMP");
    expect(deriveEmployeeNumberPrefix("  ")).toBe("EMP");
    expect(deriveEmployeeNumberPrefix("")).toBe("EMP");
  });

  it("falls back to EMP when there are too few letters", () => {
    expect(deriveEmployeeNumberPrefix("A")).toBe("EMP");
  });

  it("uses what is available for a two-letter name", () => {
    expect(deriveEmployeeNumberPrefix("Hi")).toBe("HI");
  });
});
