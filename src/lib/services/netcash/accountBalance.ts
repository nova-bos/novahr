import { NIWS_NIF_ENDPOINT, soapCall, extractResult, escapeXml } from "./client";

export interface BalanceResult {
  balance: number | null;
  error?: string;
}

export async function getAccountBalance(
  salaryKey: string,
  environment: "production" | "uat" = "production"
): Promise<BalanceResult> {
  const body = `<GetAvailableBalance xmlns="http://ws.netcash.co.za/NIWS/">
    <ServiceKey>${escapeXml(salaryKey)}</ServiceKey>
  </GetAvailableBalance>`;

  try {
    const xml = await soapCall(
      NIWS_NIF_ENDPOINT,
      "http://ws.netcash.co.za/NIWS/INIWS_NIF/GetAvailableBalance",
      body,
      environment
    );
    const raw = extractResult(xml, "GetAvailableBalanceResult");
    if (!raw) return { balance: null, error: "No response from Netcash." };
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) return { balance: null, error: `Unexpected response: ${raw}` };
    return { balance: parsed / 100 };
  } catch (err) {
    return { balance: null, error: err instanceof Error ? err.message : "Network error." };
  }
}
