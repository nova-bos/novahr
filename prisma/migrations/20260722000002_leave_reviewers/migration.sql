CREATE TABLE "LeaveReviewer" (
  "id"                 TEXT NOT NULL,
  "tenantId"           TEXT NOT NULL,
  "reviewerEmployeeId" TEXT NOT NULL,
  "scope"              TEXT NOT NULL DEFAULT 'all',
  "scopeId"            TEXT,
  "label"              TEXT,
  CONSTRAINT "LeaveReviewer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeaveReviewer_tenantId_idx" ON "LeaveReviewer"("tenantId");
CREATE INDEX "LeaveReviewer_tenantId_reviewerEmployeeId_idx" ON "LeaveReviewer"("tenantId", "reviewerEmployeeId");

ALTER TABLE "LeaveReviewer"
  ADD CONSTRAINT "LeaveReviewer_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
