"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireTenant } from "@/lib/auth/require";

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
  await requireTenant(tenantId, "hr");
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
  await requireTenant(tenantId, "hr");
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
  await requireTenant(tenantId, "hr");
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

export interface PayslipSettingsResult {
  template: string;
  logoUrl: string | null;
  companyName: string | null;
  accentColor: string;
  footerNote: string | null;
  showBanking: boolean;
  showYtd: boolean;
}

export async function getPayslipSettingsAction(
  tenantId: string
): Promise<PayslipSettingsResult> {
  await requireTenant(tenantId, "hr");
  return runAsTenant(tenantId, async (tx) => {
    const s = await tx.payrollSettings.findUnique({ where: { tenantId } });
    return {
      template: s?.payslipTemplate ?? "classic",
      logoUrl: s?.payslipLogoUrl ?? null,
      companyName: s?.payslipCompanyName ?? null,
      accentColor: s?.payslipAccentColor ?? "#6366f1",
      footerNote: s?.payslipFooterNote ?? null,
      showBanking: s?.payslipShowBanking ?? false,
      showYtd: s?.payslipShowYtd ?? true,
    };
  });
}

export async function updatePayslipSettingsAction(
  tenantId: string,
  data: {
    template?: string;
    logoUrl?: string | null;
    companyName?: string | null;
    accentColor?: string;
    footerNote?: string | null;
    showBanking?: boolean;
    showYtd?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  await requireRole("hr");
  try {
    await runAsTenant(tenantId, async (tx) => {
      return tx.payrollSettings.upsert({
        where: { tenantId },
        update: {
          ...(data.template !== undefined ? { payslipTemplate: data.template as "classic" | "modern" | "corporate" | "branded" } : {}),
          ...(data.logoUrl !== undefined ? { payslipLogoUrl: data.logoUrl } : {}),
          ...(data.companyName !== undefined ? { payslipCompanyName: data.companyName } : {}),
          ...(data.accentColor !== undefined ? { payslipAccentColor: data.accentColor } : {}),
          ...(data.footerNote !== undefined ? { payslipFooterNote: data.footerNote } : {}),
          ...(data.showBanking !== undefined ? { payslipShowBanking: data.showBanking } : {}),
          ...(data.showYtd !== undefined ? { payslipShowYtd: data.showYtd } : {}),
        },
        create: {
          tenantId,
          ...(data.template ? { payslipTemplate: data.template as "classic" | "modern" | "corporate" | "branded" } : {}),
          ...(data.logoUrl !== undefined ? { payslipLogoUrl: data.logoUrl } : {}),
          ...(data.companyName !== undefined ? { payslipCompanyName: data.companyName } : {}),
          ...(data.accentColor ? { payslipAccentColor: data.accentColor } : {}),
          ...(data.footerNote !== undefined ? { payslipFooterNote: data.footerNote } : {}),
          ...(data.showBanking !== undefined ? { payslipShowBanking: data.showBanking } : {}),
          ...(data.showYtd !== undefined ? { payslipShowYtd: data.showYtd } : {}),
        },
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
  await requireTenant(tenantId, "hr");
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
  await requireTenant(tenantId, "hr");
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
