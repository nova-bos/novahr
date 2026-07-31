"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireTenant, requireActiveSubscription } from "@/lib/auth/require";
import type { EarningCategory, DeductionCategory } from "@prisma/client";

export interface EarningTypeRow {
  id: string;
  name: string;
  category: EarningCategory;
  isTaxable: boolean;
  isActive: boolean;
  sortOrder: number;
  description: string | null;
}

export interface DeductionTypeRow {
  id: string;
  name: string;
  category: DeductionCategory;
  isEmployer: boolean;
  isStatutory: boolean;
  isActive: boolean;
  sortOrder: number;
  description: string | null;
}

// ---- Earning Types ----

export async function getEarningTypesAction(tenantId: string): Promise<EarningTypeRow[]> {
  await requireTenant(tenantId, "hr");
  return runAsTenant(tenantId, async (tx) => {
    const rows = await tx.earningType.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      isTaxable: r.isTaxable,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
      description: r.description,
    }));
  });
}

export async function createEarningTypeAction(
  tenantId: string,
  data: { name: string; category: EarningCategory; isTaxable: boolean; description?: string }
): Promise<{ id: string; error?: string }> {
  await requireTenant(tenantId, "hr");
  await requireActiveSubscription(tenantId);
  try {
    const row = await runAsTenant(tenantId, async (tx) => {
      const count = await tx.earningType.count({ where: { tenantId } });
      return tx.earningType.create({
        data: {
          tenantId,
          name: data.name,
          category: data.category,
          isTaxable: data.isTaxable,
          description: data.description,
          sortOrder: count,
        },
      });
    });
    return { id: row.id };
  } catch (err) {
    return { id: "", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateEarningTypeAction(
  tenantId: string,
  id: string,
  data: { name?: string; category?: EarningCategory; isTaxable?: boolean; description?: string }
): Promise<{ success: boolean; error?: string }> {
  await requireTenant(tenantId, "hr");
  await requireActiveSubscription(tenantId);
  try {
    const updated = await runAsTenant(tenantId, async (tx) => {
      return tx.earningType.updateMany({ where: { id, tenantId }, data });
    });
    if (updated.count === 0) return { success: false, error: "Earning type not found." };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function toggleEarningTypeAction(
  tenantId: string,
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireTenant(tenantId, "hr");
  await requireActiveSubscription(tenantId);
  try {
    const updated = await runAsTenant(tenantId, async (tx) => {
      return tx.earningType.updateMany({ where: { id, tenantId }, data: { isActive } });
    });
    if (updated.count === 0) return { success: false, error: "Earning type not found." };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteEarningTypeAction(
  tenantId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireTenant(tenantId, "hr");
  await requireActiveSubscription(tenantId);
  try {
    const deleted = await runAsTenant(tenantId, async (tx) => {
      return tx.earningType.deleteMany({ where: { id, tenantId } });
    });
    if (deleted.count === 0) return { success: false, error: "Earning type not found." };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function ensureDefaultEarningTypes(tenantId: string): Promise<void> {
  await requireTenant(tenantId, "hr");
  await runAsTenant(tenantId, async (tx) => {
    const count = await tx.earningType.count({ where: { tenantId } });
    if (count > 0) return;

    const defaults: Array<{ name: string; category: EarningCategory; isTaxable: boolean; description: string; sortOrder: number }> = [
      { name: "Basic Salary", category: "basic_salary", isTaxable: true, description: "Monthly basic salary", sortOrder: 0 },
      { name: "Overtime", category: "overtime", isTaxable: true, description: "Overtime pay", sortOrder: 1 },
      { name: "Performance Bonus", category: "bonus", isTaxable: true, description: "Discretionary performance bonus", sortOrder: 2 },
      { name: "Travel Allowance", category: "travel_allowance", isTaxable: false, description: "Monthly travel reimbursement", sortOrder: 3 },
      { name: "Housing Allowance", category: "housing_allowance", isTaxable: true, description: "Housing subsidy", sortOrder: 4 },
      { name: "Commission", category: "commission", isTaxable: true, description: "Sales commission", sortOrder: 5 },
    ];

    await tx.earningType.createMany({ data: defaults.map((d) => ({ ...d, tenantId })) });
  });
}

// ---- Deduction Types ----

export async function getDeductionTypesAction(tenantId: string): Promise<DeductionTypeRow[]> {
  await requireTenant(tenantId, "hr");
  return runAsTenant(tenantId, async (tx) => {
    const rows = await tx.deductionType.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      isEmployer: r.isEmployer,
      isStatutory: r.isStatutory,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
      description: r.description,
    }));
  });
}

export async function createDeductionTypeAction(
  tenantId: string,
  data: { name: string; category: DeductionCategory; isEmployer: boolean; isStatutory: boolean; description?: string }
): Promise<{ id: string; error?: string }> {
  await requireTenant(tenantId, "hr");
  await requireActiveSubscription(tenantId);
  try {
    const row = await runAsTenant(tenantId, async (tx) => {
      const count = await tx.deductionType.count({ where: { tenantId } });
      return tx.deductionType.create({
        data: {
          tenantId,
          name: data.name,
          category: data.category,
          isEmployer: data.isEmployer,
          isStatutory: data.isStatutory,
          description: data.description,
          sortOrder: count,
        },
      });
    });
    return { id: row.id };
  } catch (err) {
    return { id: "", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateDeductionTypeAction(
  tenantId: string,
  id: string,
  data: { name?: string; category?: DeductionCategory; isEmployer?: boolean; description?: string }
): Promise<{ success: boolean; error?: string }> {
  await requireTenant(tenantId, "hr");
  await requireActiveSubscription(tenantId);
  try {
    const updated = await runAsTenant(tenantId, async (tx) => {
      return tx.deductionType.updateMany({ where: { id, tenantId }, data });
    });
    if (updated.count === 0) return { success: false, error: "Deduction type not found." };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function toggleDeductionTypeAction(
  tenantId: string,
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireTenant(tenantId, "hr");
  await requireActiveSubscription(tenantId);
  try {
    const updated = await runAsTenant(tenantId, async (tx) => {
      return tx.deductionType.updateMany({ where: { id, tenantId }, data: { isActive } });
    });
    if (updated.count === 0) return { success: false, error: "Deduction type not found." };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteDeductionTypeAction(
  tenantId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireTenant(tenantId, "hr");
  await requireActiveSubscription(tenantId);
  try {
    return await runAsTenant(tenantId, async (tx) => {
      const existing = await tx.deductionType.findFirst({
        where: { id, tenantId },
        select: { isStatutory: true },
      });
      if (!existing) return { success: false, error: "Deduction type not found." };
      if (existing.isStatutory) {
        return { success: false, error: "Statutory deduction types cannot be deleted." };
      }
      await tx.deductionType.deleteMany({ where: { id, tenantId } });
      return { success: true };
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function ensureDefaultDeductionTypes(tenantId: string): Promise<void> {
  await requireTenant(tenantId, "hr");
  await runAsTenant(tenantId, async (tx) => {
    const count = await tx.deductionType.count({ where: { tenantId } });
    if (count > 0) return;

    const defaults: Array<{ name: string; category: DeductionCategory; isStatutory: boolean; isEmployer: boolean; description: string; sortOrder: number }> = [
      { name: "PAYE", category: "paye", isStatutory: true, isEmployer: false, description: "Pay As You Earn income tax withheld by employer", sortOrder: 0 },
      { name: "UIF Employee Contribution", category: "uif", isStatutory: true, isEmployer: false, description: "Employee UIF contribution at 1% of remuneration", sortOrder: 1 },
      { name: "Medical Aid", category: "medical_aid", isStatutory: false, isEmployer: false, description: "Employee medical aid premium", sortOrder: 2 },
      { name: "Retirement Fund", category: "retirement_fund", isStatutory: false, isEmployer: false, description: "Pension or provident fund contribution", sortOrder: 3 },
    ];

    await tx.deductionType.createMany({ data: defaults.map((d) => ({ ...d, tenantId })) });
  });
}
