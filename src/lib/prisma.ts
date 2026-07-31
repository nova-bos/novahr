import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { decryptField, encryptField } from "@/lib/crypto/field-crypto";

// PII fields on Employee that are encrypted at rest. Reads decrypt these
// transparently; writes encrypt them transparently. Decryption is
// plaintext-tolerant (see field-crypto.ts), so this is safe to deploy before
// any data is backfilled.
const EMPLOYEE_PII_FIELDS = ["idNumber", "taxNumber", "bankAccountNumber"] as const;

type PlainRecord = Record<string, unknown>;

function encryptDataObject(data: PlainRecord): void {
  for (const field of EMPLOYEE_PII_FIELDS) {
    const value = data[field];
    if (typeof value === "string") {
      data[field] = encryptField(value);
    }
    // If value is a Prisma field-update object (e.g. { set: "..." }),
    // encrypt the nested `set` string.
    else if (value && typeof value === "object" && "set" in (value as PlainRecord)) {
      const wrapped = value as PlainRecord;
      if (typeof wrapped.set === "string") {
        wrapped.set = encryptField(wrapped.set);
      }
    }
  }
}

function encryptWriteArgs(args: unknown): void {
  if (!args || typeof args !== "object") return;
  const a = args as PlainRecord;
  const data = a.data;
  if (!data) return;
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") encryptDataObject(item as PlainRecord);
    }
  } else if (typeof data === "object") {
    encryptDataObject(data as PlainRecord);
    // upsert carries both `create` and `update` under `data`? No: upsert has
    // top-level create/update. Handled separately below.
  }
  // upsert: create and update live at the top level of args, not under data.
  if (a.create && typeof a.create === "object") encryptDataObject(a.create as PlainRecord);
  if (a.update && typeof a.update === "object") encryptDataObject(a.update as PlainRecord);
}

// A "plain" object is one produced by the query engine as a row/relation, not
// a Date, Decimal, Buffer or other class instance. We only recurse into plain
// objects and arrays so we never touch Decimal/Date values.
function isPlainObject(value: unknown): value is PlainRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Recursively decrypt the PII fields anywhere they appear in a result tree.
// This is required because Employee rows are frequently loaded via nested
// `include`/`select` from other models (payroll runs, payslips, bank exports,
// compliance and UIF/IRP5 reads). Those nested rows never pass through the
// `employee` query hook, so a model-scoped decrypt would leak ciphertext into
// bank files and SARS submissions. The walk only descends into plain objects
// and arrays (never Decimal/Date), and only rewrites the three known PII keys.
const MAX_DECRYPT_DEPTH = 12;

function deepDecrypt(value: unknown, depth: number): void {
  if (depth > MAX_DECRYPT_DEPTH) return;
  if (Array.isArray(value)) {
    for (const item of value) deepDecrypt(item, depth + 1);
    return;
  }
  if (!isPlainObject(value)) return;
  for (const field of EMPLOYEE_PII_FIELDS) {
    if (typeof value[field] === "string") {
      value[field] = decryptField(value[field] as string);
    }
  }
  for (const key of Object.keys(value)) {
    const child = value[key];
    if (Array.isArray(child) || isPlainObject(child)) deepDecrypt(child, depth + 1);
  }
}

function decryptResult(result: unknown): void {
  deepDecrypt(result, 0);
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof buildPrismaClient> | undefined;
};

function buildPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  const base = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return base.$extends({
    query: {
      // Runs for EVERY model/operation. Encryption is scoped to direct Employee
      // writes; decryption walks the whole result tree so Employee rows loaded
      // via nested include/select from any model (payroll, bank exports,
      // compliance, UIF, IRP5) are decrypted too.
      async $allOperations({ model, operation, args, query }) {
        if (
          model === "Employee" &&
          (operation === "create" ||
            operation === "update" ||
            operation === "createMany" ||
            operation === "updateMany" ||
            operation === "upsert")
        ) {
          encryptWriteArgs(args);
        }

        const result = await query(args);

        // Decrypt PII anywhere it appears in the result. Counts/aggregates are
        // primitives and are left untouched by the walk.
        decryptResult(result);
        return result;
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// The extended client and its transaction-client type. Consumers (e.g.
// runAsTenant) should reference these rather than the bare PrismaClient /
// Prisma.TransactionClient so the encryption extension's types line up.
export type ExtendedPrismaClient = typeof prisma;
export type TenantTransactionClient = Parameters<
  Parameters<ExtendedPrismaClient["$transaction"]>[0]
>[0];

export default prisma;
