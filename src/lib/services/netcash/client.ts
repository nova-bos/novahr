export const NIWS_NIF_ENDPOINT = "https://ws.netcash.co.za/NIWS/niws_nif.svc";
export const NIWS_VALIDATION_ENDPOINT = "https://ws.netcash.co.za/NIWS/niws_validation.svc";

export function getUatEndpoint(): string | null {
  return process.env.NETCASH_UAT_ENDPOINT ?? null;
}

export async function soapCall(
  endpoint: string,
  soapAction: string,
  body: string,
  environment: "production" | "uat" = "production"
): Promise<string> {
  const url = environment === "uat" ? (getUatEndpoint() ?? endpoint) : endpoint;
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"${soapAction}"`,
    },
    body: envelope,
  });

  if (!res.ok) {
    throw new Error(`Netcash HTTP ${res.status}: ${res.statusText}`);
  }

  return res.text();
}

export function extractResult(xml: string, tagName: string): string | null {
  const match = xml.match(new RegExp(`<${tagName}>([^<]*)<\/${tagName}>`));
  return match ? match[1].trim() : null;
}

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
