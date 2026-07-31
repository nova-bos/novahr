import { describe, it, expect, beforeAll } from "vitest";

// Ensure a key exists before the module reads env at encrypt time.
beforeAll(() => {
  if (!process.env.PII_ENCRYPTION_KEY && !process.env.NETCASH_ENCRYPTION_KEY) {
    // 64-char hex (32 bytes) test key.
    process.env.PII_ENCRYPTION_KEY = "a".repeat(64);
  }
});

// Import after the key is set. Static import is fine because the module does
// not read the key at import time.
import { encryptField, decryptField, isEncrypted } from "./field-crypto";

describe("field-crypto", () => {
  it("round-trips encrypt then decrypt", () => {
    const plaintext = "8202155800089";
    const ciphertext = encryptField(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(isEncrypted(ciphertext)).toBe(true);
    expect(decryptField(ciphertext)).toBe(plaintext);
  });

  it("produces different ciphertext each time (non-deterministic IV)", () => {
    const a = encryptField("1234567890");
    const b = encryptField("1234567890");
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe("1234567890");
    expect(decryptField(b)).toBe("1234567890");
  });

  it("returns legacy plaintext unchanged from decryptField", () => {
    // A raw SA ID number that was stored before encryption existed.
    expect(decryptField("8202155800089")).toBe("8202155800089");
    // A raw bank account number.
    expect(decryptField("62012345678")).toBe("62012345678");
    // Arbitrary plaintext with colons that is not valid ciphertext.
    expect(decryptField("not:a:ciphertext")).toBe("not:a:ciphertext");
  });

  it("returns input unchanged for malformed ciphertext-shaped values", () => {
    // Correct segment lengths but tampered/undecryptable data must not throw
    // and must not surface garbage.
    const iv = "0".repeat(24);
    const tag = "0".repeat(32);
    const data = "abcdef";
    const malformed = `${iv}:${tag}:${data}`;
    expect(isEncrypted(malformed)).toBe(true);
    expect(decryptField(malformed)).toBe(malformed);
  });

  it("handles empty and blank input", () => {
    expect(encryptField("")).toBe("");
    expect(decryptField("")).toBe("");
    // @ts-expect-error exercising nullish tolerance at runtime
    expect(encryptField(null)).toBe(null);
    // @ts-expect-error exercising nullish tolerance at runtime
    expect(decryptField(undefined)).toBe(undefined);
  });

  it("isEncrypted is false for plaintext and true for ciphertext", () => {
    expect(isEncrypted("8202155800089")).toBe(false);
    expect(isEncrypted("")).toBe(false);
    expect(isEncrypted(encryptField("hello"))).toBe(true);
  });
});
