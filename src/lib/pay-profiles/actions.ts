"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireTenant } from "@/lib/auth/require";
import type { PayFrequency } from "@prisma/client";

export interface PayrollProfileData {
  taxNumber?: string;
  uifNumber?: string;
  payFrequency?: PayFrequency;
  medicalAidDependants?: number;
  medicalAidScheme?: string;
  medicalAidNumber?: string;
  retirementFundName?: string;
  retirementFundNumber?: string;
  notes?: string;
}

export interface PayrollProfileResult {
  id: string;
  employeeId: string;
  taxNumber: string | null;
  uifNumber: string | null;
  payFrequency: PayFrequency;
  medicalAidDependants: number;
  medicalAidScheme: string | null;
  medicalAidNumber: string | null;
  retirementFundName: string | null;
  retirementFundNumber: string | null;
  notes: string | null;
}

export async function getPayrollProfileAction(
  tenantId: string,
  employeeId: string
): Promise<PayrollProfileResult | null> {
  await requireTenant(tenantId, "hr");
  try {
    const profile = await runAsTenant(tenantId, async (tx) => {
      return tx.payrollProfile.findUnique({ where: { employeeId } });
    });
    if (!profile) return null;
    return {
      id: profile.id,
      employeeId: profile.employeeId,
      taxNumber: profile.taxNumber,
      uifNumber: profile.uifNumber,
      payFrequency: profile.payFrequency,
      medicalAidDependants: profile.medicalAidDependants,
      medicalAidScheme: profile.medicalAidScheme,
      medicalAidNumber: profile.medicalAidNumber,
      retirementFundName: profile.retirementFundName,
      retirementFundNumber: profile.retirementFundNumber,
      notes: profile.notes,
    };
  } catch {
    return null;
  }
}

export async function upsertPayrollProfileAction(
  tenantId: string,
  employeeId: string,
  data: PayrollProfileData
): Promise<{ success: boolean; error?: string }> {
  await requireTenant(tenantId, "hr");
  try {
    await runAsTenant(tenantId, async (tx) => {
      return tx.payrollProfile.upsert({
        where: { employeeId },
        update: {
          taxNumber: data.taxNumber,
          uifNumber: data.uifNumber,
          payFrequency: data.payFrequency,
          medicalAidDependants: data.medicalAidDependants,
          medicalAidScheme: data.medicalAidScheme,
          medicalAidNumber: data.medicalAidNumber,
          retirementFundName: data.retirementFundName,
          retirementFundNumber: data.retirementFundNumber,
          notes: data.notes,
        },
        create: {
          tenantId,
          employeeId,
          taxNumber: data.taxNumber,
          uifNumber: data.uifNumber,
          payFrequency: data.payFrequency ?? "monthly",
          medicalAidDependants: data.medicalAidDependants ?? 0,
          medicalAidScheme: data.medicalAidScheme,
          medicalAidNumber: data.medicalAidNumber,
          retirementFundName: data.retirementFundName,
          retirementFundNumber: data.retirementFundNumber,
          notes: data.notes,
        },
      });
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
