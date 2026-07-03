import { NIWS_NIF_ENDPOINT, soapCall, extractResult, escapeXml } from "./client";

export interface LimitsResult {
  lineLimit: number | null;
  batchLimit: number | null;
  error?: string;
}

export async function getPaymentLimits(
  salaryKey: string,
  environment: "production" | "uat" = "production"
): Promise<LimitsResult> {
  const body = `<GetPaymentLimits xmlns="http://ws.netcash.co.za/NIWS/">
    <ServiceKey>${escapeXml(salaryKey)}</ServiceKey>
  </GetPaymentLimits>`;

  try {
    const xml = await soapCall(
      NIWS_NIF_ENDPOINT,
      "http://ws.netcash.co.za/NIWS/INIWS_NIF/GetPaymentLimits",
      body,
      environment
    );
    const lineRaw = extractResult(xml, "LineLimit");
    const batchRaw = extractResult(xml, "BatchLimit");
    return {
      lineLimit: lineRaw ? parseFloat(lineRaw) / 100 : null,
      batchLimit: batchRaw ? parseFloat(batchRaw) / 100 : null,
    };
  } catch (err) {
    return {
      lineLimit: null,
      batchLimit: null,
      error: err instanceof Error ? err.message : "Network error.",
    };
  }
}
