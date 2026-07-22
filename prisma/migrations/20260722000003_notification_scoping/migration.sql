-- Add audience scoping fields to NotificationItem.
-- audienceRole: "hr" = hr+exco only; "manager" = hr+exco+manager; NULL = personal/broadcast
-- recipientEmployeeId: personal notification for exactly one employee
ALTER TABLE "NotificationItem" ADD COLUMN "audienceRole" TEXT;
ALTER TABLE "NotificationItem" ADD COLUMN "recipientEmployeeId" TEXT;

-- Index for fast per-employee notification lookups
CREATE INDEX "NotificationItem_tenantId_recipientEmployeeId_idx" ON "NotificationItem"("tenantId", "recipientEmployeeId");
