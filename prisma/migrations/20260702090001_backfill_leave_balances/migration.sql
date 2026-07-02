-- Backfill leave balances for the new statutory leave types so existing
-- employees can request them, and align sick leave with the BCEA entitlement
-- of 30 working days per 36-month cycle (previously seeded as 10 per year).
--
-- Runs as a separate migration because Postgres cannot use enum values added
-- in the same transaction.

INSERT INTO "LeaveBalance" ("id", "employeeId", "type", "total", "used")
SELECT gen_random_uuid()::text, e."id", v."type"::"LeaveType", v."total", 0
FROM "Employee" e
CROSS JOIN (
  VALUES
    ('maternity', 88::double precision),
    ('parental', 10),
    ('adoption', 50),
    ('commissioning', 50),
    ('study', 5)
) AS v("type", "total")
WHERE NOT EXISTS (
  SELECT 1 FROM "LeaveBalance" lb
  WHERE lb."employeeId" = e."id" AND lb."type" = v."type"::"LeaveType"
);

UPDATE "LeaveBalance"
SET "total" = 30
WHERE "type" = 'sick' AND "total" < 30;
