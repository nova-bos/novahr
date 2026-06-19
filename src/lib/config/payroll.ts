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

export const payrollConfigs: PayrollConfig[] = [
  {
    tenantId: "novatech",
    payeReferenceNumber: "7480123456",
    uifReferenceNumber: "U123456789",
    sdlReferenceNumber: "L123456789",
    taxYear: "2026/2027",
    uifEnabled: true,
    sdlEnabled: true,
    defaultPensionPct: 7.5,
  },
  {
    tenantId: "apex",
    payeReferenceNumber: "7470987654",
    uifReferenceNumber: "U987654321",
    sdlReferenceNumber: "L987654321",
    taxYear: "2026/2027",
    uifEnabled: true,
    sdlEnabled: true,
    defaultPensionPct: 7.5,
  },
  {
    tenantId: "horizon",
    payeReferenceNumber: "7460456789",
    uifReferenceNumber: "U456789123",
    sdlReferenceNumber: "L456789123",
    taxYear: "2026/2027",
    uifEnabled: true,
    sdlEnabled: true,
    defaultPensionPct: 7.5,
  },
];

/**
 * Falls back to sensible defaults for tenants that don't have a configured
 * entry yet (e.g. a brand-new signup) - this is global static config until
 * it becomes tenant-configurable in a later phase.
 */
export function getPayrollConfig(tenantId: string): PayrollConfig {
  const config = payrollConfigs.find((c) => c.tenantId === tenantId);
  if (config) return config;

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
