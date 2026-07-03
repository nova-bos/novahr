import {
  NIWS_VALIDATION_ENDPOINT,
  NIWS_NAMESPACE,
  soapCall,
  extractResult,
  escapeXml,
} from "./client";

export interface BankValidationResult {
  valid: boolean;
  code: number;
  message: string;
}

const VALIDATION_MESSAGES: Record<number, string> = {
  0: "Valid bank account.",
  1: "Invalid branch code.",
  2: "Account number failed check digit validation.",
  3: "Invalid account type.",
  4: "Incorrect input data.",
  100: "Authentication failure. Check the bank validation service key.",
  200: "Netcash web service error.",
};

export async function validateBankAccount(
  accountServicesKey: string,
  accountNumber: string,
  branchCode: string,
  accountType: "1" | "2",
  environment: "production" | "uat" = "production"
): Promise<BankValidationResult> {
  const body = `<ValidateBankAccount xmlns="${NIWS_NAMESPACE}">
    <ServiceKey>${escapeXml(accountServicesKey)}</ServiceKey>
    <AccountNumber>${escapeXml(accountNumber)}</AccountNumber>
    <BranchCode>${escapeXml(branchCode)}</BranchCode>
    <AccountType>${accountType}</AccountType>
  </ValidateBankAccount>`;

  const xml = await soapCall(
    NIWS_VALIDATION_ENDPOINT,
    "ValidateBankAccount",
    body,
    environment
  );

  const raw = extractResult(xml, "ValidateBankAccountResult");
  const code = raw !== null ? parseInt(raw, 10) : 200;
  return {
    valid: code === 0,
    code,
    message: VALIDATION_MESSAGES[code] ?? `Unknown code ${code}`,
  };
}
