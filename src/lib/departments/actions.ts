"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireActiveSubscription } from "@/lib/auth/require";
import { mapDepartment } from "@/lib/workspace/mappers";
import type { Department } from "@/lib/types";

const DEPARTMENT_COLORS = [
  "#4C6FFF",
  "#0F9D8C",
  "#E08A3C",
  "#A855F7",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F43F5E",
];

export async function createDepartmentRecord(data: {
  name: string;
  description?: string;
  headId?: string;
}): Promise<Department> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);
  const name = data.name.trim();
  if (name.length < 2) throw new Error("Department name must be at least 2 characters.");

  return runAsTenant(session.tenantId, async (tx) => {
    const existing = await tx.department.findFirst({
      where: { tenantId: session.tenantId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) throw new Error("A department with this name already exists.");

    const count = await tx.department.count({ where: { tenantId: session.tenantId } });
    const row = await tx.department.create({
      data: {
        tenantId: session.tenantId,
        name,
        description: data.description?.trim() ?? "",
        headId: data.headId,
        color: DEPARTMENT_COLORS[count % DEPARTMENT_COLORS.length],
        budget: 0,
      },
    });
    return mapDepartment(row);
  });
}

export async function updateDepartmentRecord(
  id: string,
  data: { name?: string; description?: string; headId?: string | null }
): Promise<Department> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);

  return runAsTenant(session.tenantId, async (tx) => {
    const existing = await tx.department.findFirst({
      where: { id, tenantId: session.tenantId },
      select: { id: true },
    });
    if (!existing) throw new Error("Department not found.");
    const row = await tx.department.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        description: data.description?.trim(),
        headId: data.headId,
      },
    });
    return mapDepartment(row);
  });
}

export async function deleteDepartmentRecord(id: string): Promise<{ reassigned: number }> {
  const session = await requireRole("hr");
  await requireActiveSubscription(session.tenantId);

  return runAsTenant(session.tenantId, async (tx) => {
    const department = await tx.department.findFirstOrThrow({
      where: { id, tenantId: session.tenantId },
    });

    // Employees keep working when their department is removed: move them to
    // an unassigned state rather than blocking the delete.
    const reassigned = await tx.employee.updateMany({
      where: { tenantId: session.tenantId, department: department.name },
      data: { department: "Unassigned" },
    });

    await tx.department.delete({ where: { id } });
    return { reassigned: reassigned.count };
  });
}
