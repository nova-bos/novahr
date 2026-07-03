import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidServiceKey } from "./auth";
import { extractStringArray, extractResult } from "./client";

function soapResponse(inner: string): Response {
  return new Response(
    `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>${inner}</s:Body></s:Envelope>`,
    { status: 200, headers: { "Content-Type": "text/xml" } }
  );
}

function validKeyResponse(values: string[]): Response {
  const items = values.map((v) => `<a:string>${v}</a:string>`).join("");
  return soapResponse(
    `<IsValidServiceKeyResponse xmlns="http://tempuri.org/"><IsValidServiceKeyResult xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays">${items}</IsValidServiceKeyResult></IsValidServiceKeyResponse>`
  );
}

const KEY = "7f9c2b4e-1a3d-4c5f-8e6a-9b0d1c2e3f4a";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isValidServiceKey", () => {
  it("sends the tempuri.org contract namespace and SOAPAction", async () => {
    const fetchMock = vi.fn(async () => validKeyResponse(["true", "true"]));
    vi.stubGlobal("fetch", fetchMock);

    await isValidServiceKey(KEY, "DatedSalaries");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://ws.netcash.co.za/NIWS/niws_nif.svc");
    expect((init.headers as Record<string, string>).SOAPAction).toBe(
      '"http://tempuri.org/INIWS_NIF/IsValidServiceKey"'
    );
    expect(init.body).toContain('<IsValidServiceKey xmlns="http://tempuri.org/">');
    expect(init.body).toContain(`<MethodKey>${KEY}</MethodKey>`);
    expect(init.body).toContain(`<ServiceKey>${KEY}</ServiceKey>`);
    expect(init.body).toContain("<InstructionCode>DatedSalaries</InstructionCode>");
  });

  it("reports connected when Netcash returns all true", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => validKeyResponse(["true", "true"])));
    const result = await isValidServiceKey(KEY, "DatedSalaries");
    expect(result.valid).toBe(true);
    expect(result.status).toBe("connected");
  });

  it("reports the testing environment when connected in UAT", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => validKeyResponse(["true", "true"])));
    const result = await isValidServiceKey(KEY, "DatedSalaries", "uat");
    expect(result.valid).toBe(true);
    expect(result.message).toContain("Testing environment connected");
  });

  it("reports invalid_key when Netcash returns false", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => validKeyResponse(["false", "false"])));
    const result = await isValidServiceKey(KEY, "DatedSalaries");
    expect(result.valid).toBe(false);
    expect(result.status).toBe("invalid_key");
  });

  it("maps an ActionNotSupported SOAP fault to server_error, not a raw HTTP message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            "<s:Envelope><s:Body><s:Fault><faultstring>ContractFilter mismatch</faultstring></s:Fault></s:Body></s:Envelope>",
            { status: 500 }
          )
      )
    );
    const result = await isValidServiceKey(KEY, "DatedSalaries");
    expect(result.valid).toBe(false);
    expect(result.status).toBe("server_error");
    expect(result.message).not.toContain("500");
  });

  it("maps fetch timeouts to a timeout status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("timed out");
        err.name = "TimeoutError";
        throw err;
      })
    );
    const result = await isValidServiceKey(KEY, "DatedSalaries");
    expect(result.status).toBe("timeout");
  });

  it("maps connection failures to network_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      })
    );
    const result = await isValidServiceKey(KEY, "DatedSalaries");
    expect(result.status).toBe("network_error");
  });

  it("maps 503 responses to server_unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    const result = await isValidServiceKey(KEY, "DatedSalaries");
    expect(result.status).toBe("server_unavailable");
  });
});

describe("extractStringArray", () => {
  it("parses namespaced WCF string arrays", () => {
    const xml = `<IsValidServiceKeyResult xmlns:a="ns"><a:string>true</a:string><a:string>false</a:string></IsValidServiceKeyResult>`;
    expect(extractStringArray(xml, "IsValidServiceKeyResult")).toEqual(["true", "false"]);
  });

  it("returns an empty array when the tag is missing", () => {
    expect(extractStringArray("<other/>", "IsValidServiceKeyResult")).toEqual([]);
  });
});

describe("extractResult", () => {
  it("reads plain and namespaced elements", () => {
    expect(extractResult("<AvailableBalance>1234.56</AvailableBalance>", "AvailableBalance")).toBe("1234.56");
    expect(extractResult("<b:LineLimit>500</b:LineLimit>", "LineLimit")).toBe("500");
  });
});
