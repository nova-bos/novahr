import "server-only";

import { prisma } from "@/lib/prisma";
import { decryptServiceKey } from "@/lib/crypto/service-keys";

/**
 * Returns a tenant's decrypted Netcash service keys.
 *
 * SECURITY: this is deliberately NOT a server action. It handles decrypted
 * payment credentials, so it must never be a callable endpoint. It is a
 * server-only internal helper; every caller is itself a server action that has
 * already authenticated and authorised the request (via requireTenant /
 * requireEmployeeScope) before reaching here.
 */
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
    try {
      return decryptServiceKey(val);
    } catch {
      return null;
    }
  }

  return {
    salaryKey: safeDecrypt(settings.netcashSalaryKey),
    accountServicesKey: safeDecrypt(settings.netcashAccountServicesKey),
    instruction: settings.netcashInstruction,
    environment: settings.netcashEnvironment as "production" | "uat",
  };
}
