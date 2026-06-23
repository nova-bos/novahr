export interface PayrollConfig {
  tenantId: string;
  payeReferenceNumber: string;
  uifReferenceNumber: string;
  sdlReferenceNumber: string;
  taxYear: string;
  uifEnabled: boolean;
  sdlEnabled: boolean;
  defaultPensionPct: number;
}

// Returns the statutory defaults for any tenant.
// PAYE, UIF, and SDL reference numbers are now stored per-tenant in PayrollSettings
// and loaded from the DB in the settings UI. This function only provides the
// non-sensitive defaults (tax year, rates, pension %) used before settings load.
export function getPayrollConfig(tenantId: string): PayrollConfig {
  return {
    tenantId,
    payeReferenceNumber: "",
    uifReferenceNumber: "",
    sdlReferenceNumber: "",
    taxYear: "2026/2027",
    uifEnabled: true,
    sdlEnabled: true,
    defaultPensionPct: 7.5,
  };
}
