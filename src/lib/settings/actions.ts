"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireTenant } from "@/lib/auth/require";
import { encryptServiceKey } from "@/lib/crypto/service-keys";
import { prisma } from "@/lib/prisma";
import { isValidServiceKey } from "@/lib/services/netcash/auth";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Prisma } from "@prisma/client";

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function uploadPayslipLogoAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const session = await requireRole("hr");
  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file provided." };
  if (file.size > MAX_LOGO_BYTES) return { success: false, error: "Logo must be under 2 MB." };
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return { success: false, error: "Unsupported file type. Use PNG, JPEG, GIF, WebP, or SVG." };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${session.tenantId}/logo.${ext}`;
  const bytes = await file.arrayBuffer();
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from("payslip-assets").upload(path, bytes, {
    upsert: true,
    contentType: file.type,
  });
  if (error) return { success: false, error: error.message };
  const { data } = supabase.storage.from("payslip-assets").getPublicUrl(path);
  await runAsTenant(session.tenantId, (tx) =>
    tx.payrollSettings.upsert({
      where: { tenantId: session.tenantId },
      update: { payslipLogoUrl: data.publicUrl },
      create: { tenantId: session.tenantId, payslipLogoUrl: data.publicUrl },
    })
  );
  return { success: true, url: data.publicUrl };
}

export async function deletePayslipLogoAction(): Promise<{ success: boolean; error?: string }> {
  const session = await requireRole("hr");
  const supabase = createAdminClient();
  const extensions = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
  await Promise.allSettled(
    extensions.map((ext) =>
      supabase.storage.from("payslip-assets").remove([`${session.tenantId}/logo.${ext}`])
    )
  );
  await runAsTenant(session.tenantId, (tx) =>
    tx.payrollSettings.upsert({
      where: { tenantId: session.tenantId },
      update: { payslipLogoUrl: null },
      create: { tenantId: session.tenantId },
    })
  );
  return { success: true };
}

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
  offersPension: boolean;
  offersMedicalAid: boolean;
  payrollConfiguredAt: string | null;
}

function toPayrollSettingsResult(s: {
  id: string;
  sdlEnabled: boolean;
  sdlRate: number;
  uifEnabled: boolean;
  uifEmployeeRate: number;
  uifEmployerRate: number;
  uifCeiling: Prisma.Decimal;
  payslipCompanyName: string | null;
  payslipLogoUrl: string | null;
  netcashSalaryKey: string | null;
  netcashAccountServicesKey: string | null;
  netcashInstruction: string;
  netcashEnvironment: string;
  payeReferenceNumber: string | null;
  uifReferenceNumber: string | null;
  sdlReferenceNumber: string | null;
  offersPension: boolean;
  offersMedicalAid: boolean;
  payrollConfiguredAt: Date | null;
}): PayrollSettingsResult {
  return {
    id: s.id,
    sdlEnabled: s.sdlEnabled,
    sdlRate: s.sdlRate,
    uifEnabled: s.uifEnabled,
    uifEmployeeRate: s.uifEmployeeRate,
    uifEmployerRate: s.uifEmployerRate,
    uifCeiling: s.uifCeiling.toNumber(),
    payslipCompanyName: s.payslipCompanyName,
    payslipLogoUrl: s.payslipLogoUrl,
    hasSalaryKey: !!s.netcashSalaryKey,
    hasAccountServicesKey: !!s.netcashAccountServicesKey,
    netcashInstruction: s.netcashInstruction,
    netcashEnvironment: s.netcashEnvironment,
    payeReferenceNumber: s.payeReferenceNumber,
    uifReferenceNumber: s.uifReferenceNumber,
    sdlReferenceNumber: s.sdlReferenceNumber,
    offersPension: s.offersPension,
    offersMedicalAid: s.offersMedicalAid,
    payrollConfiguredAt: s.payrollConfiguredAt?.toISOString() ?? null,
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

export async function updateTaxFlagsAction(
  tenantId: string,
  data: { uifEnabled: boolean; sdlEnabled: boolean }
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

export async function updateBenefitSettingsAction(
  tenantId: string,
  data: {
    offersPension: boolean;
    offersMedicalAid: boolean;
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
      const existing = await tx.payrollSettings.findUnique({ where: { tenantId }, select: { payrollConfiguredAt: true } });
      return tx.payrollSettings.upsert({
        where: { tenantId },
        update: { ...data, payrollConfiguredAt: existing?.payrollConfiguredAt ?? new Date() },
        create: { tenantId, ...data, payrollConfiguredAt: new Date() },
      });
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Fetches an image URL server-side and returns it as a base64 data URL. Done on
 * the server because @react-pdf/renderer's browser image loader (and a browser
 * fetch) fail on the storage URL's CORS, so the logo never embedded in the PDF.
 */
async function fetchLogoDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export interface PayslipSettingsResult {
  template: string;
  logoUrl: string | null;
  /** The logo pre-fetched as a base64 data URL, ready for PDF embedding. */
  logoDataUrl: string | null;
  logoAlignment: "left" | "center" | "right";
  companyName: string | null;
  accentColor: string;
  footerNote: string | null;
  showBanking: boolean;
  showYtd: boolean;
  payeReference: string | null;
  uifReference: string | null;
  sdlReference: string | null;
  taxYearStartMonth: number;
}

export async function getPayslipSettingsAction(
  tenantId: string
): Promise<PayslipSettingsResult> {
  // Any tenant member may read the payslip display settings: employees generate
  // their own payslip PDF, which needs the tenant's template, logo and branding.
  await requireTenant(tenantId);
  return runAsTenant(tenantId, async (tx) => {
    const s = await tx.payrollSettings.findUnique({ where: { tenantId } });
    return {
      template: s?.payslipTemplate ?? "classic",
      logoUrl: s?.payslipLogoUrl ?? null,
      logoDataUrl: await fetchLogoDataUrl(s?.payslipLogoUrl),
      logoAlignment: (s?.payslipLogoAlignment ?? "left") as "left" | "center" | "right",
      companyName: s?.payslipCompanyName ?? null,
      accentColor: s?.payslipAccentColor ?? "#6366f1",
      footerNote: s?.payslipFooterNote ?? null,
      showBanking: s?.payslipShowBanking ?? false,
      showYtd: s?.payslipShowYtd ?? true,
      payeReference: s?.payeReferenceNumber ?? null,
      uifReference: s?.uifReferenceNumber ?? null,
      sdlReference: s?.sdlReferenceNumber ?? null,
      taxYearStartMonth: s?.taxYearStart ? Number(s.taxYearStart) : 3,
    };
  });
}

export async function updatePayslipSettingsAction(
  tenantId: string,
  data: {
    template?: string;
    logoUrl?: string | null;
    logoAlignment?: "left" | "center" | "right";
    companyName?: string | null;
    accentColor?: string;
    footerNote?: string | null;
    showBanking?: boolean;
    showYtd?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  await requireTenant(tenantId, "hr");
  try {
    await runAsTenant(tenantId, async (tx) => {
      return tx.payrollSettings.upsert({
        where: { tenantId },
        update: {
          ...(data.template !== undefined ? { payslipTemplate: data.template as "classic" | "modern" | "corporate" | "branded" } : {}),
          ...(data.logoUrl !== undefined ? { payslipLogoUrl: data.logoUrl } : {}),
          ...(data.logoAlignment !== undefined ? { payslipLogoAlignment: data.logoAlignment } : {}),
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
          ...(data.logoAlignment !== undefined ? { payslipLogoAlignment: data.logoAlignment } : {}),
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
