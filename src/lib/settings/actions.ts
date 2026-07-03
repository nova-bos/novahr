"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireTenant } from "@/lib/auth/require";
import { encryptServiceKey, decryptServiceKey } from "@/lib/crypto/service-keys";
import { prisma } from "@/lib/prisma";
import { isValidServiceKey } from "@/lib/services/netcash/auth";
import { checkRateLimit } from "@/lib/security/rate-limit";

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
  hasSalaryKey: boolean;
  hasAccountServicesKey: boolean;
  netcashInstruction: string;
  netcashEnvironment: string;
  payeReferenceNumber: string | null;
  uifReferenceNumber: string | null;
  sdlReferenceNumber: string | null;
}

function toPayrollSettingsResult(s: {
  id: string;
  sdlEnabled: boolean;
  sdlRate: number;
  uifEnabled: boolean;
  uifEmployeeRate: number;
  uifEmployerRate: number;
  uifCeiling: number;
  payslipCompanyName: string | null;
  payslipLogoUrl: string | null;
  netcashSalaryKey: string | null;
  netcashAccountServicesKey: string | null;
  netcashInstruction: string;
  netcashEnvironment: string;
  payeReferenceNumber: string | null;
  uifReferenceNumber: string | null;
  sdlReferenceNumber: string | null;
}): PayrollSettingsResult {
  return {
    id: s.id,
    sdlEnabled: s.sdlEnabled,
    sdlRate: s.sdlRate,
    uifEnabled: s.uifEnabled,
    uifEmployeeRate: s.uifEmployeeRate,
    uifEmployerRate: s.uifEmployerRate,
    uifCeiling: s.uifCeiling,
    payslipCompanyName: s.payslipCompanyName,
    payslipLogoUrl: s.payslipLogoUrl,
    hasSalaryKey: !!s.netcashSalaryKey,
    hasAccountServicesKey: !!s.netcashAccountServicesKey,
    netcashInstruction: s.netcashInstruction,
    netcashEnvironment: s.netcashEnvironment,
    payeReferenceNumber: s.payeReferenceNumber,
    uifReferenceNumber: s.uifReferenceNumber,
    sdlReferenceNumber: s.sdlReferenceNumber,
  };
}

export async function getPayrollSettingsAction(
  tenantId: string
): Promise<PayrollSettingsResult> {
  await requireTenant(tenantId, "hr");
  return runAsTenant(tenantId, async (tx) => {
    const existing = await tx.payrollSettings.findUnique({ where: { tenantId } });
    if (existing) return toPayrollSettingsResult(existing);
    const created = await tx.payrollSettings.create({ data: { tenantId } });
    return toPayrollSettingsResult(created);
  });
}

export async function getNetcashServiceKeys(tenantId: string): Promise<{
  salaryKey: string | null;
  accountServicesKey: string | null;
  instruction: string;
  environment: "production" | "uat";
}> {
  const settings = await prisma.payrollSettings.findUnique({ where: { tenantId } });
  if (!settings) return { salaryKey: null, accountServicesKey: null, instruction: "DatedSalaries", environment: "production" };

  function safeDecrypt(val: string | null): string | null {
    if (!val) return null;
    try { return decryptServiceKey(val); } catch { return null; }
  }

  return {
    salaryKey: safeDecrypt(settings.netcashSalaryKey),
    accountServicesKey: safeDecrypt(settings.netcashAccountServicesKey),
    instruction: settings.netcashInstruction,
    environment: settings.netcashEnvironment as "production" | "uat",
  };
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
    salaryKey?: string | null;
    accountServicesKey?: string | null;
    netcashInstruction?: string;
    netcashEnvironment?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  await requireTenant(tenantId, "hr");
  try {
    const update: Record<string, string | null> = {};
    const changed: string[] = [];

    if (data.salaryKey !== undefined) {
      update.netcashSalaryKey = data.salaryKey ? encryptServiceKey(data.salaryKey) : null;
      changed.push("salary key");
    }
    if (data.accountServicesKey !== undefined) {
      update.netcashAccountServicesKey = data.accountServicesKey ? encryptServiceKey(data.accountServicesKey) : null;
      changed.push("account services key");
    }
    if (data.netcashInstruction !== undefined) update.netcashInstruction = data.netcashInstruction;
    if (data.netcashEnvironment !== undefined) update.netcashEnvironment = data.netcashEnvironment;

    await runAsTenant(tenantId, async (tx) => {
      await tx.payrollSettings.upsert({
        where: { tenantId },
        update,
        create: { tenantId, ...update },
      });
      if (changed.length > 0) {
        await tx.activityItem.create({
          data: {
            tenantId,
            type: "settings_updated",
            message: `Netcash credentials updated: ${changed.join(", ")}`,
            actor: "HR Admin",
          },
        });
      }
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function testNetcashKeyAction(
  tenantId: string,
  keyType: "salary" | "accountServices",
  rawKey: string
): Promise<{ valid: boolean; status: string; message: string }> {
  await requireTenant(tenantId, "hr");
  const rate = checkRateLimit(tenantId, { name: "netcash-key-test", limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rate.allowed) {
    return {
      valid: false,
      status: "server_error",
      message: "Too many key tests in a short time. Wait a few minutes and try again.",
    };
  }
  try {
    const settings = await prisma.payrollSettings.findUnique({ where: { tenantId } });
    const environment = (settings?.netcashEnvironment ?? "production") as "production" | "uat";
    const instruction = settings?.netcashInstruction ?? "DatedSalaries";
    const testInstruction = keyType === "salary" ? instruction : "BankAccountValidation";
    return await isValidServiceKey(rawKey, testInstruction, environment);
  } catch (err) {
    console.error("[netcash] testNetcashKeyAction failed", err instanceof Error ? err.message : err);
    return {
      valid: false,
      status: "server_error",
      message: "The key test could not be completed. Please try again.",
    };
  }
}
