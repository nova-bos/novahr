CREATE TABLE "CustomHoliday" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "date"      TEXT NOT NULL,
  "recurring" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CustomHoliday_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomHoliday_tenantId_idx" ON "CustomHoliday"("tenantId");

ALTER TABLE "CustomHoliday" ADD CONSTRAINT "CustomHoliday_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
