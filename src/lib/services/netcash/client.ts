export const NIWS_NIF_ENDPOINT = "https://ws.netcash.co.za/NIWS/niws_nif.svc";
export const NIWS_VALIDATION_ENDPOINT = "https://ws.netcash.co.za/NIWS/niws_validation.svc";

// Netcash NIWS services are WCF endpoints whose contract namespace is
// http://tempuri.org/ (verified against the live WSDL). Using any other
// namespace or SOAPAction makes WCF reject the message with an
// ActionNotSupported fault, which surfaces as HTTP 500.
export const NIWS_NAMESPACE = "http://tempuri.org/";

const REQUEST_TIMEOUT_MS = 20_000;

export type NetcashStatus =
  | "connected"
  | "invalid_key"
  | "auth_failed"
  | "timeout"
  | "network_error"
  | "server_unavailable"
  | "server_error";

export class NetcashError extends Error {
  status: NetcashStatus;

  constructor(status: NetcashStatus, message: string) {
    super(message);
    this.name = "NetcashError";
    this.status = status;
  }
}

export const NETCASH_STATUS_MESSAGES: Record<NetcashStatus, string> = {
  connected: "Connected to Netcash.",
  invalid_key: "Netcash did not recognise this service key. Check that you copied the full key from your Netcash portal.",
  auth_failed: "Netcash rejected the credentials. Confirm the service is active on your Netcash account.",
  timeout: "Netcash took too long to respond. Please try again in a moment.",
  network_error: "Could not reach Netcash. Check your internet connection and try again.",
  server_unavailable: "The Netcash service is temporarily unavailable. Please try again later.",
  server_error: "Netcash returned an unexpected error. Please try again or contact support if it persists.",
};

export function getUatEndpoint(): string | null {
  return process.env.NETCASH_UAT_ENDPOINT ?? null;
}

export function logNetcash(context: string, detail: Record<string, unknown>): void {
  // Server-side diagnostic log. Never include service keys or envelopes here.
  console.error(`[netcash] ${context}`, JSON.stringify(detail));
}

function extractSoapFault(xml: string): string | null {
  const fault = xml.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i);
  return fault ? fault[1].trim() : null;
}

export async function soapCall(
  endpoint: string,
  operation: string,
  body: string,
  environment: "production" | "uat" = "production"
): Promise<string> {
  const url = environment === "uat" ? (getUatEndpoint() ?? endpoint) : endpoint;
  const service = endpoint === NIWS_VALIDATION_ENDPOINT ? "INIWS_Validation" : "INIWS_NIF";
  const soapAction = `${NIWS_NAMESPACE}${service}/${operation}`;
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `"${soapAction}"`,
      },
      body: envelope,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    logNetcash("request failed", { operation, environment, error: err instanceof Error ? err.name : String(err) });
    throw new NetcashError(
      isTimeout ? "timeout" : "network_error",
      NETCASH_STATUS_MESSAGES[isTimeout ? "timeout" : "network_error"]
    );
  }

  const text = await res.text();

  if (!res.ok) {
    const fault = extractSoapFault(text);
    logNetcash("http error", { operation, environment, httpStatus: res.status, fault });
    if (res.status === 401 || res.status === 403) {
      throw new NetcashError("auth_failed", NETCASH_STATUS_MESSAGES.auth_failed);
    }
    if (res.status === 503 || res.status === 502 || res.status === 504) {
      throw new NetcashError("server_unavailable", NETCASH_STATUS_MESSAGES.server_unavailable);
    }
    throw new NetcashError("server_error", NETCASH_STATUS_MESSAGES.server_error);
  }

  return text;
}

export function extractResult(xml: string, tagName: string): string | null {
  const match = xml.match(new RegExp(`<(?:\\w+:)?${tagName}[^>]*>([^<]*)</(?:\\w+:)?${tagName}>`));
  return match ? match[1].trim() : null;
}

// WCF serialises List<string> results as
// <a:string>...</a:string> items inside the result element.
export function extractStringArray(xml: string, resultTag: string): string[] {
  const container = xml.match(new RegExp(`<(?:\\w+:)?${resultTag}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${resultTag}>`));
  if (!container) return [];
  const items: string[] = [];
  const re = /<(?:\w+:)?string[^>]*>([^<]*)<\/(?:\w+:)?string>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(container[1])) !== null) items.push(m[1].trim());
  return items;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
