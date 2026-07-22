"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole } from "@/lib/auth/require";
import type { LeaveReviewer } from "@/lib/types";

export async function createLeaveReviewerAction(input: {
  reviewerEmployeeId: string;
  scope: "all" | "department" | "employee";
  scopeId?: string;
  label?: string;
}): Promise<{ success: true; reviewer: LeaveReviewer } | { success: false; error: string }> {
  try {
    const session = await requireRole("hr");
    if (!input.reviewerEmployeeId) return { success: false, error: "Reviewer is required." };
    if ((input.scope === "department" || input.scope === "employee") && !input.scopeId) {
      return { success: false, error: "A specific department or employee must be selected for this scope." };
    }

    // Check the reviewer employee belongs to this tenant
    const row = await runAsTenant(session.tenantId, async (tx) => {
      const employee = await tx.employee.findFirst({
        where: { id: input.reviewerEmployeeId, tenantId: session.tenantId },
        select: { id: true },
      });
      if (!employee) throw new Error("Employee not found in this organisation.");

      return tx.leaveReviewer.create({
        data: {
          tenantId: session.tenantId,
          reviewerEmployeeId: input.reviewerEmployeeId,
          scope: input.scope,
          scopeId: input.scopeId ?? null,
          label: input.label?.trim() || null,
        },
      });
    });

    return {
      success: true,
      reviewer: {
        id: row.id,
        tenantId: row.tenantId,
        reviewerEmployeeId: row.reviewerEmployeeId,
        scope: row.scope as "all" | "department" | "employee",
        scopeId: row.scopeId ?? undefined,
        label: row.label ?? undefined,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add reviewer." };
  }
}

export async function deleteLeaveReviewerAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole("hr");
    await runAsTenant(session.tenantId, (tx) =>
      tx.leaveReviewer.deleteMany({ where: { id, tenantId: session.tenantId } })
    );
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove reviewer." };
  }
}
