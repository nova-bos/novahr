import { describe, expect, it } from "vitest";
import { saIdNumber, saPhone, bankAccountNumber, branchCode } from "./sa";

describe("saIdNumber", () => {
  // 8001015009087: born 1 Jan 1980, Luhn verified
  const VALID_ID = "8001015009087";

  it("accepts a valid SA ID", () => {
    expect(saIdNumber.safeParse(VALID_ID).success).toBe(true);
  });

  it("rejects an ID that is not 13 digits", () => {
    expect(saIdNumber.safeParse("800101500908").success).toBe(false);
    expect(saIdNumber.safeParse("80010150090870").success).toBe(false);
  });

  it("rejects an ID with an invalid month", () => {
    // Month 13 is invalid; date portion 800013
    expect(saIdNumber.safeParse("8013015009087").success).toBe(false);
  });

  it("rejects an ID with an invalid day", () => {
    // Day 00 is invalid; date portion 800100
    expect(saIdNumber.safeParse("8001005009087").success).toBe(false);
  });

  it("rejects an ID with a bad Luhn checksum", () => {
    // Last digit changed from 7 to 0
    expect(saIdNumber.safeParse("8001015009080").success).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(saIdNumber.safeParse("800101500908A").success).toBe(false);
  });
});

describe("saPhone", () => {
  it("accepts 071 format (10 digits starting with 0)", () => {
    expect(saPhone.safeParse("0712345678").success).toBe(true);
  });

  it("accepts +27 international format", () => {
    expect(saPhone.safeParse("+27712345678").success).toBe(true);
  });

  it("accepts the spaced format shown in the UI example", () => {
    expect(saPhone.safeParse("071 234 5678").success).toBe(true);
  });

  it("rejects spaced input whose digits are invalid", () => {
    expect(saPhone.safeParse("171 234 5678").success).toBe(false);
  });

  it("rejects a number that is too short", () => {
    expect(saPhone.safeParse("071234567").success).toBe(false);
  });

  it("rejects a number starting with 1", () => {
    expect(saPhone.safeParse("1712345678").success).toBe(false);
  });
});

describe("bankAccountNumber", () => {
  it("accepts a 10-digit account number", () => {
    expect(bankAccountNumber.safeParse("6201234567").success).toBe(true);
  });

  it("accepts a 6-digit account number", () => {
    expect(bankAccountNumber.safeParse("123456").success).toBe(true);
  });

  it("accepts an 11-digit account number", () => {
    expect(bankAccountNumber.safeParse("62012345678").success).toBe(true);
  });

  it("rejects a number that is too short", () => {
    expect(bankAccountNumber.safeParse("12345").success).toBe(false);
  });

  it("rejects a number that is too long", () => {
    expect(bankAccountNumber.safeParse("123456789012").success).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(bankAccountNumber.safeParse("6201234ABC").success).toBe(false);
  });
});

describe("branchCode", () => {
  it("accepts a 6-digit branch code", () => {
    expect(branchCode.safeParse("051001").success).toBe(true);
  });

  it("rejects fewer than 6 digits", () => {
    expect(branchCode.safeParse("05100").success).toBe(false);
  });

  it("rejects more than 6 digits", () => {
    expect(branchCode.safeParse("0510011").success).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(branchCode.safeParse("05100A").success).toBe(false);
  });
});
