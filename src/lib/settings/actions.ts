"use server";

import { runAsTenant } from "@/lib/db-context";

export interface PayrollSettingsResult {
  id: string;
  sdlEnabled: boolean;
  sdlRate: number;
  uifEnabled: boolean;
  uifEmployeeRate: number;
  uifEmployerRate: number;
  uifCeiling: number;
  payslipCompanyName: string | null;
  payslipLogoUrl: string | null;
  netcashServiceKey: string | null;
  netcashInstruction: string;
  payeReferenceNumber: string | null;
  uifReferenceNumber: string | null;
  sdlReferenceNumber: string | null;
}

export async function getPayrollSettingsAction(
  tenantId: string
): Promise<PayrollSettingsResult> {
  return runAsTenant(tenantId, async (tx) => {
    const existing = await tx.payrollSettings.findUnique({ where: { tenantId } });
    if (existing) {
      return {
        id: existing.id,
        sdlEnabled: existing.sdlEnabled,
        sdlRate: existing.sdlRate,
        uifEnabled: existing.uifEnabled,
        uifEmployeeRate: existing.uifEmployeeRate,
        uifEmployerRate: existing.uifEmployerRate,
        uifCeiling: existing.uifCeiling,
        payslipCompanyName: existing.payslipCompanyName,
        payslipLogoUrl: existing.payslipLogoUrl,
        netcashServiceKey: existing.netcashServiceKey,
        netcashInstruction: existing.netcashInstruction,
        payeReferenceNumber: existing.payeReferenceNumber,
        uifReferenceNumber: existing.uifReferenceNumber,
        sdlReferenceNumber: existing.sdlReferenceNumber,
      };
    }
    // Create with defaults
    const created = await tx.payrollSettings.create({
      data: { tenantId },
    });
    return {
      id: created.id,
      sdlEnabled: created.sdlEnabled,
      sdlRate: created.sdlRate,
      uifEnabled: created.uifEnabled,
      uifEmployeeRate: created.uifEmployeeRate,
      uifEmployerRate: created.uifEmployerRate,
      uifCeiling: created.uifCeiling,
      payslipCompanyName: created.payslipCompanyName,
      payslipLogoUrl: created.payslipLogoUrl,
      netcashServiceKey: created.netcashServiceKey,
      netcashInstruction: created.netcashInstruction,
      payeReferenceNumber: created.payeReferenceNumber,
      uifReferenceNumber: created.uifReferenceNumber,
      sdlReferenceNumber: created.sdlReferenceNumber,
    };
  });
}

export async function updateTaxSettingsAction(
  tenantId: string,
  data: {
    sdlEnabled: boolean;
    sdlRate: number;
    uifEnabled: boolean;
    uifEmployeeRate: number;
    uifEmployerRate: number;
    uifCeiling: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await runAsTenant(tenantId, async (tx) => {
      return tx.payrollSettings.upsert({
        where: { tenantId },
        update: data,
        create: { tenantId, ...data },
      });
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateStatutoryReferencesAction(
  tenantId: string,
  data: {
    payeReferenceNumber: string | null;
    uifReferenceNumber: string | null;
    sdlReferenceNumber: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await runAsTenant(tenantId, async (tx) => {
      return tx.payrollSettings.upsert({
        where: { tenantId },
        update: data,
        create: { tenantId, ...data },
      });
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateNetcashSettingsAction(
  tenantId: string,
  data: {
    netcashServiceKey: string | null;
    netcashInstruction: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await runAsTenant(tenantId, async (tx) => {
      return tx.payrollSettings.upsert({
        where: { tenantId },
        update: data,
        create: { tenantId, ...data },
      });
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updatePayslipBrandingAction(
  tenantId: string,
  data: {
    payslipCompanyName: string | null;
    payslipLogoUrl: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await runAsTenant(tenantId, async (tx) => {
      return tx.payrollSettings.upsert({
        where: { tenantId },
        update: data,
        create: { tenantId, ...data },
      });
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
