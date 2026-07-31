import { beforeEach, describe, expect, it, vi } from "vitest";

// Cross-tenant isolation regression tests for the employee document vault.
// These assert that every Prisma query on a tenant table carries an explicit
// tenantId predicate, so a query can never span tenants even though the DB role
// has BYPASSRLS and isolation is enforced in application code only.

const mockPrisma = vi.hoisted(() => ({
  employeeDocument: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn(),
  },
}));

const mockCreateSignedUrl = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ createSignedUrl: mockCreateSignedUrl }) },
  }),
}));

const mockSession = vi.hoisted(() => ({
  current: {
    id: "user-a",
    tenantId: "tenant-a",
    role: "hr",
    name: "HR Admin",
    email: "hr@tenant-a.co.za",
    employeeId: undefined as string | undefined,
  },
}));

vi.mock("@/lib/auth/require", () => ({
  requireUser: vi.fn(async () => mockSession.current),
  requireRole: vi.fn(async () => mockSession.current),
  requireActiveSubscription: vi.fn(async () => {}),
  requireEmployeeScope: vi.fn(async () => mockSession.current),
  requireTenant: vi.fn(async () => mockSession.current),
}));

import { getEmployeeDocumentUrl, listEmployeeDocuments } from "./documents";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.employeeDocument.findMany.mockResolvedValue([]);
});

describe("listEmployeeDocuments isolation", () => {
  it("scopes the findMany by the caller's tenantId (never spans tenants)", async () => {
    await listEmployeeDocuments("emp-1");

    expect(mockPrisma.employeeDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employeeId: "emp-1", tenantId: "tenant-a" }),
      })
    );
  });
});

describe("getEmployeeDocumentUrl isolation", () => {
  it("refuses to return a URL for a document belonging to another tenant", async () => {
    // The lookup is scoped by tenantId in the query, so a document from another
    // tenant is simply not found (findFirst returns null for a tenant-a caller).
    mockPrisma.employeeDocument.findFirst.mockResolvedValue(null);

    const result = await getEmployeeDocumentUrl("doc-from-tenant-b");

    expect(result.error).toBe("Document not found.");
    expect(result.url).toBeUndefined();
    // The tenantId predicate must be present so the query never spans tenants.
    expect(mockPrisma.employeeDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "doc-from-tenant-b", tenantId: "tenant-a" }),
      })
    );
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns a signed URL for a document in the caller's own tenant", async () => {
    mockPrisma.employeeDocument.findFirst.mockResolvedValue({
      employeeId: "emp-1",
      storagePath: "tenant-a/emp-1/file.pdf",
    });
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed" }, error: null });

    const result = await getEmployeeDocumentUrl("doc-1");

    expect(result.url).toBe("https://signed");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("tenant-a/emp-1/file.pdf", expect.any(Number));
  });
});
