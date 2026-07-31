import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Transparent, plaintext-tolerant field encryption for PII columns.
//
// This module encrypts individual database field values at rest using
// AES-256-GCM, in the same "iv:tag:data" hex format used by
// service-keys.ts. It is designed to be deployed BEFORE any data is
// encrypted: decryptField() returns legacy plaintext values unchanged, so a
// read path can never surface ciphertext-looking garbage during the
// plaintext -> encrypted transition.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

// Matches exactly three colon-separated lowercase hex segments.
// A 12-byte IV is 24 hex chars and a GCM tag is 16 bytes (32 hex chars);
// the data segment is any non-empty hex. We keep the IV/tag lengths loose
// enough to stay robust but strict enough that ordinary plaintext (SA ID
// numbers, tax numbers, bank account numbers) never accidentally matches.
const CIPHERTEXT_SHAPE = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/;

function getKey(): Buffer {
  // Prefer a dedicated PII key; fall back to the Netcash key so environments
  // that only set the latter keep working. Never throw at import time.
  const hex = process.env.PII_ENCRYPTION_KEY || process.env.NETCASH_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "PII_ENCRYPTION_KEY (or NETCASH_ENCRYPTION_KEY) must be a 64-character hex string (32 bytes)."
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a single field value. Returns "iv:tag:data" hex ciphertext.
 * Empty or nullish input is returned unchanged so blank fields stay blank.
 */
export function encryptField(plaintext: string): string {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return plaintext;
  }
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Returns true only when `value` has the exact ciphertext shape produced by
 * encryptField. Legacy plaintext returns false.
 */
export function isEncrypted(value: string): boolean {
  return typeof value === "string" && CIPHERTEXT_SHAPE.test(value);
}

/**
 * Decrypt a stored field value, tolerating legacy plaintext.
 *
 * If `stored` does not have the exact ciphertext shape, it is returned
 * unchanged (it is plaintext that predates encryption). If it has the shape
 * but decryption fails for any reason (wrong key, tampering, malformed), the
 * original `stored` value is returned unchanged rather than throwing. This
 * guarantees read paths never fail and never surface ciphertext to a user.
 */
export function decryptField(stored: string): string {
  if (stored === null || stored === undefined || stored === "") {
    return stored;
  }
  if (!isEncrypted(stored)) {
    return stored;
  }
  try {
    const [ivHex, tagHex, dataHex] = stored.split(":");
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data).toString("utf8") + decipher.final("utf8");
  } catch {
    // Never throw on a read path; fall back to the stored value.
    return stored;
  }
}
