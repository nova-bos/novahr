#!/usr/bin/env node
/**
 * CI guard: every direct prisma.MODEL.OP() call on a tenant-scoped model
 * must include `tenantId` somewhere in its argument block.
 *
 * Queries that go through runAsTenant use `tx.` not `prisma.` and are
 * already pre-scoped, so they are not checked here.
 *
 * Suppress a specific call with a trailing comment:  // tenant-isolation-skip
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const TENANT_SCOPED_MODELS = new Set([
  "employee",
  "leaveRequest",
  "payrollRun",
  "payslip",
  "department",
  "activityItem",
  "notificationItem",
  "bankExport",
  "payrollProfile",
  "payrollSettings",
  "earningType",
  "deductionType",
  "employeeDocument",
  "employeeDeduction",
  "etiClaim",
  "complianceRecord",
  "payrollItem",
  "salaryHistory",
  "invite",
  "customHoliday",
  "leaveReviewer",
  "tenantLeavePolicy",
  "employeeNumberConfig",
]);

// Operations where the where clause must be scoped to a tenant.
// findUnique is excluded because it commonly targets globally unique PKs.
const SCOPED_OPS = [
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "create",
  "upsert",
];

// Files where cross-tenant queries are intentional.
const SKIP_FILES = [
  "src/lib/auth/require.ts",    // auth lookups are deliberately cross-tenant
  "scripts/",
  ".test.",
  "seed.",
];

function walk(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, results);
    } else if (extname(full) === ".ts" || extname(full) === ".tsx") {
      results.push(full);
    }
  }
  return results;
}

/** Extract the full argument block starting at the opening `(`. */
function extractBlock(source, openParen) {
  let depth = 0;
  for (let i = openParen; i < source.length; i++) {
    if (source[i] === "(") depth++;
    else if (source[i] === ")") {
      depth--;
      if (depth === 0) return source.slice(openParen, i + 1);
    }
  }
  return source.slice(openParen);
}

function lineNumber(source, idx) {
  return source.slice(0, idx).split("\n").length;
}

const root = process.cwd();
const files = walk(join(root, "src"));
const violations = [];

for (const file of files) {
  const rel = file.replace(root + "/", "");
  if (SKIP_FILES.some((s) => rel.includes(s))) continue;

  const source = readFileSync(file, "utf-8");

  for (const model of TENANT_SCOPED_MODELS) {
    for (const op of SCOPED_OPS) {
      const needle = `prisma.${model}.${op}(`;
      let from = 0;
      while (true) {
        const idx = source.indexOf(needle, from);
        if (idx === -1) break;
        from = idx + 1;

        const line = lineNumber(source, idx);
        const lineText = source.split("\n")[line - 1];

        // Honour inline suppression comment.
        if (lineText.includes("tenant-isolation-skip")) continue;

        const block = extractBlock(source, idx + needle.length - 1);

        if (!block.includes("tenantId")) {
          violations.push(`${rel}:${line}  prisma.${model}.${op}() — tenantId not found in arguments`);
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error("\n[tenant-isolation] Missing tenantId filters:\n");
  violations.forEach((v) => console.error(`  ✗ ${v}`));
  console.error(
    `\n${violations.length} violation(s). Add tenantId to the where/data clause, ` +
    `or add // tenant-isolation-skip to suppress a known-safe call.\n`
  );
  process.exit(1);
} else {
  console.log("[tenant-isolation] All scoped prisma calls include tenantId. ✓");
}
