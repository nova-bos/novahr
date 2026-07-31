-- Deduplicate before adding unique constraints.
-- For employee numbers: append a suffix to duplicates (keep the oldest row intact).
WITH dupes AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "tenantId", "employeeNumber" ORDER BY "createdAt") AS rn
  FROM "Employee"
)
UPDATE "Employee" e
SET "employeeNumber" = e."employeeNumber" || '-' || d.rn
FROM dupes d
WHERE d.id = e.id AND d.rn > 1;

-- For invites: keep only the most recently created invite per (tenantId, email).
DELETE FROM "Invite"
WHERE id NOT IN (
  SELECT DISTINCT ON ("tenantId", email) id
  FROM "Invite"
  ORDER BY "tenantId", email, "createdAt" DESC
);

-- Add unique constraint: one employee number per tenant (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_tenantId_employeeNumber_key" ON "Employee"("tenantId", "employeeNumber");

-- Add unique constraint: one invite per email per tenant (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "Invite_tenantId_email_key" ON "Invite"("tenantId", email);
