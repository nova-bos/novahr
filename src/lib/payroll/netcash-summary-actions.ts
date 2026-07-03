"use server";

import { requireTenant } from "@/lib/auth/require";
import { getNetcashServiceKeys } from "@/lib/settings/actions";
import { getAccountBalance } from "@/lib/services/netcash/accountBalance";
import { getPaymentLimits } from "@/lib/services/netcash/accountLimits";

export async function getNetcashAccountSummaryAction(tenantId: string) {
  await requireTenant(tenantId, "hr");
  try {
    const keys = await getNetcashServiceKeys(tenantId);
    const keyToUse = keys.accountServicesKey ?? keys.salaryKey;

    if (!keyToUse) {
      return { balance: null, lineLimit: null, batchLimit: null, environment: keys.environment, error: "No service key configured." };
    }

    const [balanceResult, limitsResult] = await Promise.all([
      getAccountBalance(keyToUse, keys.environment),
      getPaymentLimits(keyToUse, keys.environment),
    ]);

    return {
      balance: balanceResult.balance,
      lineLimit: limitsResult.lineLimit,
      batchLimit: limitsResult.batchLimit,
      environment: keys.environment,
      error: balanceResult.error ?? limitsResult.error,
    };
  } catch (err) {
    return { balance: null, lineLimit: null, batchLimit: null, environment: "production", error: err instanceof Error ? err.message : "Failed." };
  }
}
