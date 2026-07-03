import {
  NIWS_NIF_ENDPOINT,
  NIWS_NAMESPACE,
  NetcashError,
  soapCall,
  extractResult,
  escapeXml,
  logNetcash,
} from "./client";

export interface BalanceResult {
  balance: number | null;
  error?: string;
}

// GetAvailableBalance returns a GetAvailableBalanceResponse data contract
// with AvailableBalance and CurrentBalance as xs:decimal rand values, plus
// an ErrorCode inherited from NIWSResponseContainer.
export async function getAccountBalance(
  serviceKey: string,
  environment: "production" | "uat" = "production"
): Promise<BalanceResult> {
  const body = `<GetAvailableBalance xmlns="${NIWS_NAMESPACE}">
    <serviceKey>${escapeXml(serviceKey)}</serviceKey>
  </GetAvailableBalance>`;

  try {
    const xml = await soapCall(NIWS_NIF_ENDPOINT, "GetAvailableBalance", body, environment);

    const errorCode = extractResult(xml, "ErrorCode");
    if (errorCode) {
      logNetcash("GetAvailableBalance error code", { environment, errorCode });
      return { balance: null, error: "Netcash could not return the account balance. Check the service key configuration." };
    }

    const raw = extractResult(xml, "AvailableBalance");
    if (raw === null) return { balance: null, error: "Netcash did not return a balance." };
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) return { balance: null, error: "Netcash returned an unreadable balance." };
    return { balance: parsed };
  } catch (err) {
    if (err instanceof NetcashError) return { balance: null, error: err.message };
    return { balance: null, error: "Could not reach Netcash." };
  }
}
