-- Multi-company: a user's access to a tenant. Additive. Every existing user is
-- backfilled with a membership mirroring their current tenant/role, so nothing
-- changes for single-tenant users.
CREATE TABLE IF NOT EXISTS "TenantMembership" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "tenantId"      TEXT NOT NULL,
    "role"          "UserRole" NOT NULL DEFAULT 'hr',
    "employeeId"    TEXT,
    "branchScopeId" TEXT,
    "title"         TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantMembership_userId_tenantId_key" ON "TenantMembership"("userId", "tenantId");
CREATE INDEX IF NOT EXISTS "TenantMembership_userId_idx" ON "TenantMembership"("userId");
CREATE INDEX IF NOT EXISTS "TenantMembership_tenantId_idx" ON "TenantMembership"("tenantId");
ALTER TABLE "TenantMembership"
    ADD CONSTRAINT "TenantMembership_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembership"
    ADD CONSTRAINT "TenantMembership_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one membership per existing user (their current tenant/role).
INSERT INTO "TenantMembership" ("id", "userId", "tenantId", "role", "employeeId", "branchScopeId", "title", "createdAt")
SELECT gen_random_uuid()::text, "id", "tenantId", "role", "employeeId", "branchScopeId", "title", "createdAt"
FROM "User"
ON CONFLICT ("userId", "tenantId") DO NOTHING;
