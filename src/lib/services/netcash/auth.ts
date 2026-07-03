import { NIWS_NIF_ENDPOINT, soapCall, extractResult, escapeXml } from "./client";

export async function isValidServiceKey(
  serviceKey: string,
  instruction: string,
  environment: "production" | "uat" = "production"
): Promise<{ valid: boolean; error?: string }> {
  const body = `<IsValidServiceKey xmlns="http://ws.netcash.co.za/NIWS/">
    <ServiceKey>${escapeXml(serviceKey)}</ServiceKey>
    <Instruction>${escapeXml(instruction)}</Instruction>
  </IsValidServiceKey>`;

  try {
    const xml = await soapCall(
      NIWS_NIF_ENDPOINT,
      "http://ws.netcash.co.za/NIWS/INIWS_NIF/IsValidServiceKey",
      body,
      environment
    );
    const result = extractResult(xml, "IsValidServiceKeyResult");
    return { valid: result?.toLowerCase() === "true" };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Network error." };
  }
}
