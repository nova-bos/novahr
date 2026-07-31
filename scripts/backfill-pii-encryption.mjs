#!/usr/bin/env node
/**
 * One-off backfill: encrypt existing plaintext PII on Employee.
 *
 * Encrypts Employee.idNumber, Employee.taxNumber and Employee.bankAccountNumber
 * at rest using the same AES-256-GCM "iv:tag:data" format as
 * src/lib/crypto/field-crypto.ts.
 *
 * SAFETY / IDEMPOTENCY:
 *  - Uses a RAW PrismaClient WITHOUT the transparent encryption extension from
 *    src/lib/prisma.ts. This matters: the extended client would decrypt on read
 *    and re-encrypt on write, which would double-encrypt or hide already-stored
 *    ciphertext. The raw client reads the true stored bytes and writes ciphertext
 *    exactly once.
 *  - For each field, it only encrypts when isEncrypted(value) is false, so
 *    re-running the script skips rows that are already encrypted. Safe to run
 *    multiple times.
 *  - Blank / empty values are left untouched (encryptField returns them as-is).
 *
 * PREREQUISITES:
 *  - PII_ENCRYPTION_KEY (or NETCASH_ENCRYPTION_KEY) must be set to the SAME
 *    64-char hex key the app uses. If the key does not match, the app will not
 *    be able to decrypt the values afterwards.
 *  - DATABASE_URL must point at the target database.
 *
 * HOW TO RUN (from the repo root, do NOT run in CI):
 *   PII_ENCRYPTION_KEY=<64-hex> DATABASE_URL=<url> node scripts/backfill-pii-encryption.mjs
 *
 * Recommended: take a database backup first, and run once in a maintenance
 * window. Deploy the app WITH the encryption extension BEFORE running this so
 * reads stay correct throughout (the extension is plaintext-tolerant, so both
 * pre- and post-backfill rows read correctly).
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createCipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const CIPHERTEXT_SHAPE = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/;

const PII_FIELDS = ["idNumber", "taxNumber", "bankAccountNumber"];

function getKey() {
  const hex = process.env.PII_ENCRYPTION_KEY || process.env.NETCASH_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "PII_ENCRYPTION_KEY (or NETCASH_ENCRYPTION_KEY) must be a 64-character hex string (32 bytes)."
    );
  }
  return Buffer.from(hex, "hex");
}

function isEncrypted(value) {
  return typeof value === "string" && CIPHERTEXT_SHAPE.test(value);
}

function encryptField(plaintext, key) {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return plaintext;
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

async function main() {
  const key = getKey();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");

  // RAW client: no $extends. Reads and writes the true stored values.
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  let scanned = 0;
  let updated = 0;
  let alreadyEncrypted = 0;

  try {
    const employees = await prisma.employee.findMany({
      select: { id: true, idNumber: true, taxNumber: true, bankAccountNumber: true },
    });

    for (const emp of employees) {
      scanned += 1;
      const data = {};
      let touched = false;

      for (const field of PII_FIELDS) {
        const value = emp[field];
        if (typeof value !== "string" || value === "") continue;
        if (isEncrypted(value)) continue;
        data[field] = encryptField(value, key);
        touched = true;
      }

      if (!touched) {
        alreadyEncrypted += 1;
        continue;
      }

      await prisma.employee.update({ where: { id: emp.id }, data });
      updated += 1;
    }

    console.log(
      `Backfill complete. scanned=${scanned} updated=${updated} skipped(already-encrypted-or-blank)=${alreadyEncrypted}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
