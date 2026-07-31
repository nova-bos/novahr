"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import type { Prisma } from "@prisma/client";
import type { CustomFieldType, TenantCustomFieldDefinition } from "@/lib/types";

const FIELD_TYPES: CustomFieldType[] = ["text", "number", "date", "select"];

function mapDefinition(row: {
  id: string;
  tenantId: string;
  label: string;
  fieldType: string;
  options: Prisma.JsonValue | null;
  sortOrder: number;
  isActive: boolean;
}): TenantCustomFieldDefinition {
  return {
    id: row.id,
    tenantId: row.tenantId,
    label: row.label,
    fieldType: (FIELD_TYPES as string[]).includes(row.fieldType)
      ? (row.fieldType as CustomFieldType)
      : "text",
    options: Array.isArray(row.options) ? (row.options as string[]) : undefined,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

/**
 * All custom-field definitions for the tenant, ordered for display. Includes
 * inactive ones so the settings screen can show and re-activate them; the
 * employee form filters to active only.
 */
export async function listCustomFieldDefinitionsAction(): Promise<TenantCustomFieldDefinition[]> {
  const session = await requireRole("hr");
  return runAsTenant(session.tenantId, async (tx) => {
    const rows = await tx.tenantCustomFieldDefinition.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(mapDefinition);
  });
}

export interface CustomFieldInput {
  label: string;
  fieldType: CustomFieldType;
  options?: string[];
}

export async function createCustomFieldDefinitionAction(
  input: CustomFieldInput
): Promise<TenantCustomFieldDefinition> {
  const session = await requireRole("hr");
  const label = input.label.trim();
  if (!label) throw new Error("A field label is required.");
  const fieldType = FIELD_TYPES.includes(input.fieldType) ? input.fieldType : "text";
  const options =
    fieldType === "select" ? (input.options ?? []).map((o) => o.trim()).filter(Boolean) : undefined;
  if (fieldType === "select" && (!options || options.length === 0)) {
    throw new Error("A select field needs at least one option.");
  }

  return runAsTenant(session.tenantId, async (tx) => {
    const count = await tx.tenantCustomFieldDefinition.count({
      where: { tenantId: session.tenantId },
    });
    const created = await tx.tenantCustomFieldDefinition.create({
      data: {
        tenantId: session.tenantId,
        label,
        fieldType,
        options: options ? (options as unknown as Prisma.InputJsonValue) : undefined,
        sortOrder: count,
        isActive: true,
      },
    });
    return mapDefinition(created);
  });
}

export async function updateCustomFieldDefinitionAction(
  id: string,
  input: Partial<CustomFieldInput> & { isActive?: boolean }
): Promise<TenantCustomFieldDefinition> {
  const session = await requireRole("hr");
  const data: Prisma.TenantCustomFieldDefinitionUpdateInput = {};
  if (input.label !== undefined) {
    const label = input.label.trim();
    if (!label) throw new Error("A field label is required.");
    data.label = label;
  }
  if (input.fieldType !== undefined) {
    data.fieldType = FIELD_TYPES.includes(input.fieldType) ? input.fieldType : "text";
  }
  if (input.options !== undefined) {
    const options = input.options.map((o) => o.trim()).filter(Boolean);
    data.options = options as unknown as Prisma.InputJsonValue;
  }
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return runAsTenant(session.tenantId, async (tx) => {
    // The tenant filter guards against updating another tenant's definition.
    const existing = await tx.tenantCustomFieldDefinition.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) throw new Error("Custom field not found.");
    const updated = await tx.tenantCustomFieldDefinition.update({ where: { id }, data });
    return mapDefinition(updated);
  });
}

export async function deleteCustomFieldDefinitionAction(id: string): Promise<void> {
  const session = await requireRole("hr");
  await runAsTenant(session.tenantId, async (tx) => {
    await tx.tenantCustomFieldDefinition.deleteMany({
      where: { id, tenantId: session.tenantId },
    });
  });
}

/**
 * Persist a new display order for the tenant's custom fields. The ids array is
 * the desired top-to-bottom order.
 */
export async function reorderCustomFieldDefinitionsAction(ids: string[]): Promise<void> {
  const session = await requireRole("hr");
  await runAsTenant(session.tenantId, async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.tenantCustomFieldDefinition.updateMany({
        where: { id: ids[i], tenantId: session.tenantId },
        data: { sortOrder: i },
      });
    }
  });
}
