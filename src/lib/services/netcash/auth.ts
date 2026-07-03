import {
  NIWS_NIF_ENDPOINT,
  NIWS_NAMESPACE,
  NETCASH_STATUS_MESSAGES,
  NetcashError,
  type NetcashStatus,
  soapCall,
  extractStringArray,
  escapeXml,
  logNetcash,
} from "./client";

export interface ServiceKeyCheckResult {
  valid: boolean;
  status: NetcashStatus;
  message: string;
}

// Contract per the live NIWS_NIF WSDL: IsValidServiceKey takes MethodKey,
// ServiceKey, InstructionCode and an optional SofwareVendorCode (Netcash's
// own spelling). NovaHR tenants hold a single account service key, so it is
// sent as both MethodKey and ServiceKey. The response is an array of
// "true"/"false" strings, one per submitted key.
export async function isValidServiceKey(
  serviceKey: string,
  instruction: string,
  environment: "production" | "uat" = "production"
): Promise<ServiceKeyCheckResult> {
  const key = escapeXml(serviceKey);
  const body = `<IsValidServiceKey xmlns="${NIWS_NAMESPACE}">
    <MethodKey>${key}</MethodKey>
    <ServiceKey>${key}</ServiceKey>
    <InstructionCode>${escapeXml(instruction)}</InstructionCode>
  </IsValidServiceKey>`;

  try {
    const xml = await soapCall(NIWS_NIF_ENDPOINT, "IsValidServiceKey", body, environment);
    const results = extractStringArray(xml, "IsValidServiceKeyResult");

    if (results.length === 0) {
      logNetcash("IsValidServiceKey unexpected response", { environment, instruction });
      return { valid: false, status: "server_error", message: NETCASH_STATUS_MESSAGES.server_error };
    }

    const valid = results.every((r) => r.toLowerCase() === "true");
    if (valid) {
      const status: NetcashStatus = "connected";
      const message =
        environment === "uat"
          ? "Testing environment connected. Service key is valid."
          : "Connected. Service key is valid.";
      return { valid: true, status, message };
    }

    return { valid: false, status: "invalid_key", message: NETCASH_STATUS_MESSAGES.invalid_key };
  } catch (err) {
    if (err instanceof NetcashError) {
      return { valid: false, status: err.status, message: err.message };
    }
    logNetcash("IsValidServiceKey failed", { environment, error: err instanceof Error ? err.message : String(err) });
    return { valid: false, status: "network_error", message: NETCASH_STATUS_MESSAGES.network_error };
  }
}
