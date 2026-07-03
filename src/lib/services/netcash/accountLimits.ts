import {
  NIWS_NIF_ENDPOINT,
  NIWS_NAMESPACE,
  NetcashError,
  soapCall,
  extractResult,
  escapeXml,
  logNetcash,
} from "./client";

export interface LimitsResult {
  lineLimit: number | null;
  batchLimit: number | null;
  error?: string;
}

// GetPaymentLimits returns a LimitResponse data contract:
// Errors { ErrorCode } and Limits { DailyLimit, LineLimit } as xs:decimal
// rand values. The daily limit is surfaced as the batch limit.
export async function getPaymentLimits(
  serviceKey: string,
  environment: "production" | "uat" = "production"
): Promise<LimitsResult> {
  const body = `<GetPaymentLimits xmlns="${NIWS_NAMESPACE}">
    <ServiceKey>${escapeXml(serviceKey)}</ServiceKey>
  </GetPaymentLimits>`;

  try {
    const xml = await soapCall(NIWS_NIF_ENDPOINT, "GetPaymentLimits", body, environment);

    const errorCode = extractResult(xml, "ErrorCode");
    if (errorCode) {
      logNetcash("GetPaymentLimits error code", { environment, errorCode });
      return { lineLimit: null, batchLimit: null, error: "Netcash could not return payment limits. Check the service key configuration." };
    }

    const lineRaw = extractResult(xml, "LineLimit");
    const dailyRaw = extractResult(xml, "DailyLimit");
    return {
      lineLimit: lineRaw !== null && !isNaN(parseFloat(lineRaw)) ? parseFloat(lineRaw) : null,
      batchLimit: dailyRaw !== null && !isNaN(parseFloat(dailyRaw)) ? parseFloat(dailyRaw) : null,
    };
  } catch (err) {
    if (err instanceof NetcashError) return { lineLimit: null, batchLimit: null, error: err.message };
    return { lineLimit: null, batchLimit: null, error: "Could not reach Netcash." };
  }
}
