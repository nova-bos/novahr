// Netcash Integration File (NIF) generator and BatchFileUpload API client.
// Format spec: https://api.netcash.co.za/netcash-programmers-guide-v2/
//
// NIF is a tab-delimited, LF-terminated text file with four record types:
//   H - header (service key, instruction, batch name, action date, SVK)
//   K - key row declaring which field numbers the T rows contain
//   T - one transaction row per employee
//   F - footer with transaction count and total cents

const DEFAULT_SVK = "24ade73c-98cf-47b3-99be-cc7b867b3080";
const NIWS_NIF_ENDPOINT = "https://ws.netcash.co.za/NIWS/niws_nif.svc";

export type NifInstruction =
  | "PaySalaries"
  | "DatedSalaries"
  | "Realtime"
  | "DatedPayments"
  | "RTCSalaries"
  | "RTCPayments";

export interface NifEmployee {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  bankAccountNumber: string;
  bankBranchCode: string;
  bankAccountType: string;
  netPay: number;
}

export interface NifOptions {
  serviceKey: string;
  instruction: NifInstruction;
  batchName: string;
  actionDate: Date | string;
  employees: NifEmployee[];
  softwareVendorKey?: string;
}

// Netcash only allows: A-Z a-z 0-9 - _ . ( ) : / \ space
function sanitize(value: string, maxLen: number): string {
  return value.replace(/[^A-Za-z0-9\-_.():\/\\ ]/g, "").slice(0, maxLen);
}

// CCYYMMDD format required by Netcash
function formatActionDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// Netcash numeric codes: 1=Current/Cheque, 2=Savings, 3=Transmission, 9=Public
function mapAccountType(raw: string): "1" | "2" | "3" | "9" {
  const t = raw.toLowerCase();
  if (t.includes("savings")) return "2";
  if (t.includes("transmission")) return "3";
  if (t.includes("public")) return "9";
  return "1";
}

export function generateNifFile(opts: NifOptions): string {
  const svk = opts.softwareVendorKey ?? DEFAULT_SVK;
  const batchName = sanitize(opts.batchName, 50).replace(/ /g, "_");
  const actionDate = formatActionDate(opts.actionDate);

  const header = ["H", opts.serviceKey, "1", opts.instruction, batchName, actionDate, svk].join("\t");
  const keyLine = ["K", "101", "102", "131", "132", "133", "134", "135", "136", "162", "252"].join("\t");

  let totalCents = 0;
  const rows: string[] = [];

  for (const emp of opts.employees) {
    const cents = Math.round(emp.netPay * 100);
    totalCents += cents;

    const ref = sanitize(emp.employeeNumber, 22);
    const name = sanitize(`${emp.firstName} ${emp.lastName}`, 25);
    const bankName = sanitize(`${emp.firstName} ${emp.lastName}`, 30);
    const accType = mapAccountType(emp.bankAccountType);
    const branch = emp.bankBranchCode.replace(/\D/g, "").padStart(6, "0").slice(0, 6);
    const accNum = emp.bankAccountNumber.replace(/\D/g, "").slice(0, 11);
    // Field 252 min 4 chars; prefix with "SAL " to guarantee it
    const statRef = sanitize(`SAL ${ref}`, 20);

    rows.push(["T", ref, name, "1", bankName, accType, branch, "0", accNum, cents, statRef].join("\t"));
  }

  const footer = ["F", opts.employees.length, totalCents, "9999"].join("\t");

  return [header, keyLine, ...rows, footer].join("\n") + "\n";
}

export interface NetcashSubmitResult {
  token: string;
  error?: string;
}

// Submits a NIF file to the Netcash BatchFileUpload SOAP endpoint.
// Returns a file token that can be used with RequestFileUploadReport to poll
// for the load report. Netcash also sends the report by email automatically.
//
// The NIWS_NIF contract namespace is http://tempuri.org/ (verified against
// the live WSDL); any other namespace triggers an ActionNotSupported fault.
export async function submitNifBatch(
  serviceKey: string,
  nifContent: string
): Promise<NetcashSubmitResult> {
  const escaped = nifContent
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <BatchFileUpload xmlns="http://tempuri.org/">
      <ServiceKey>${serviceKey}</ServiceKey>
      <File>${escaped}</File>
    </BatchFileUpload>
  </soap:Body>
</soap:Envelope>`;

  try {
    const res = await fetch(NIWS_NIF_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: '"http://tempuri.org/INIWS_NIF/BatchFileUpload"',
      },
      body: soapEnvelope,
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error("[netcash] BatchFileUpload http error", res.status);
      return { token: "", error: "Netcash could not accept the batch right now. Please try again shortly." };
    }

    const xml = await res.text();
    const match = xml.match(/<BatchFileUploadResult[^>]*>([^<]+)<\/BatchFileUploadResult>/);
    if (!match) {
      console.error("[netcash] BatchFileUpload unexpected response", xml.slice(0, 300));
      return { token: "", error: "Netcash returned an unexpected response. The batch was not confirmed; please retry." };
    }
    // Netcash error codes start with 1xx; a valid token is a GUID or alphanumeric string
    const value = match[1].trim();
    if (/^1\d{2}$/.test(value)) {
      const codeMessages: Record<string, string> = {
        "100": "Authentication failure. Check the service key.",
        "101": "Date format error. Expected CCYYMMDD.",
        "102": "Parameter error in the request.",
        "200": "General Netcash exception.",
      };
      return { token: "", error: codeMessages[value] ?? `Netcash error code ${value}` };
    }
    return { token: value };
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    console.error("[netcash] BatchFileUpload failed", err instanceof Error ? err.name : err);
    return {
      token: "",
      error: isTimeout
        ? "Netcash took too long to respond. The batch may not have been received; please check before retrying."
        : "Could not reach Netcash. Check your connection and try again.",
    };
  }
}
