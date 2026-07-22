"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import type { CustomHoliday } from "@/lib/types";

export async function listCustomHolidaysAction(): Promise<CustomHoliday[]> {
  const session = await requireRole("hr", "manager", "employee", "exco");
  return runAsTenant(session.tenantId, async (tx) => {
    const rows = await tx.customHoliday.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { date: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      date: r.date,
      recurring: r.recurring,
    }));
  });
}

export async function createCustomHolidayAction(input: {
  name: string;
  date: string;
  recurring: boolean;
}): Promise<{ success: true; holiday: CustomHoliday } | { success: false; error: string }> {
  try {
    const session = await requireRole("hr");
    if (!input.name.trim()) return { success: false, error: "Holiday name is required." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { success: false, error: "Invalid date format." };

    const row = await runAsTenant(session.tenantId, (tx) =>
      tx.customHoliday.create({
        data: {
          tenantId: session.tenantId,
          name: input.name.trim(),
          date: input.date,
          recurring: input.recurring,
        },
      })
    );
    return {
      success: true,
      holiday: { id: row.id, tenantId: row.tenantId, name: row.name, date: row.date, recurring: row.recurring },
    };
  } catch {
    return { success: false, error: "Failed to create holiday." };
  }
}

export async function deleteCustomHolidayAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole("hr");
    await runAsTenant(session.tenantId, (tx) =>
      tx.customHoliday.deleteMany({ where: { id, tenantId: session.tenantId } })
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete holiday." };
  }
}
