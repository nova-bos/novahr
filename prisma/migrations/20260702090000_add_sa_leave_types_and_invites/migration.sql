-- Add the remaining South African statutory leave types (BCEA ss 25-25C)
-- plus study leave, and the Invite table for the user-invite flow.

ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'maternity';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'parental';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'adoption';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'commissioning';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'study';

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'revoked');

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'employee',
    "employeeId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite"("tokenHash");
CREATE INDEX "Invite_tenantId_idx" ON "Invite"("tenantId");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-level security, consistent with the other tenant-scoped tables.
ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "Invite"
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR "tenantId" = current_setting('app.tenant_id', true)
  );
