import type { Employee, Payslip } from "@/lib/types";
import type { PayslipYtd } from "@/lib/payroll/ytd";

// Sample data for the payslip studio's live preview. Only the fields the
// templates read are populated; the object is cast to Employee for convenience.
// Chosen to exercise every section: allowances, a taxable benefit, a loan
// closing balance, employer contributions, leave balances and the PAYE note.
export const SAMPLE_EMPLOYEE = {
  id: "sample-emp",
  tenantId: "sample",
  employeeNumber: "EMP001",
  firstName: "Thandi",
  lastName: "Nkosi",
  email: "thandi.nkosi@example.co.za",
  phone: "+27 71 000 0000",
  avatarColor: "#6366f1",
  initials: "TN",
  jobTitle: "Software Engineer",
  department: "Engineering",
  employmentType: "full_time",
  status: "active",
  startDate: "2023-03-01",
  location: "Sandton, Johannesburg",
  salary: { annualGross: 480000, currency: "ZAR", payFrequency: "monthly" },
  bankDetails: {
    bank: "First National Bank",
    accountNumber: "62000001234",
    branchCode: "250655",
    accountType: "Cheque",
    validated: true,
    validatedAt: null,
  },
  taxNumber: "0123456789",
  idNumber: "9001015800082",
  address: "12 Rivonia Road, Sandton, Johannesburg, 2196",
  emergencyContact: { name: "N/A", relationship: "N/A", phone: "N/A" },
  leaveBalances: [
    { type: "annual", total: 18, used: 4, accrued: 18 },
    { type: "sick", total: 30, used: 2, accrued: 30 },
    { type: "family", total: 3, used: 0, accrued: 3 },
  ],
  dateOfBirth: "1990-01-01",
} as unknown as Employee;

export const SAMPLE_PAYSLIP: Payslip = {
  id: "sample-payslip",
  tenantId: "sample",
  runId: "sample-run",
  employeeId: "sample-emp",
  period: "2026-06",
  payDate: "2026-06-25",
  basicSalary: 40000,
  earnings: [{ label: "Travel Allowance", amount: 2000 }],
  deductions: [
    { label: "PAYE (Income Tax)", amount: 8000 },
    { label: "UIF Contribution", amount: 177.12 },
    { label: "Staff loan", amount: 1500 },
  ],
  grossPay: 42000,
  totalDeductions: 9677.12,
  netPay: 32322.88,
  paye: 8000,
  uif: 177.12,
  employerUif: 177.12,
  employerSdl: 420,
  employerBenefits: [{ label: "Income Protection Policy (Employer-owned)", amount: 585, taxable: true }],
  closingBalances: [{ label: "Staff loan", balance: 13500 }],
  taxableIncomeAnnual: 509820,
  taxRebateAnnual: 17820,
};

export const SAMPLE_YTD: PayslipYtd = {
  basicSalary: 120000,
  grossPay: 126000,
  totalDeductions: 29031.36,
  netPay: 96968.64,
  paye: 24000,
  uif: 531.36,
  employerUif: 531.36,
  employerSdl: 1260,
  earnings: { "Travel Allowance": 6000 },
  deductions: { "PAYE (Income Tax)": 24000, "UIF Contribution": 531.36, "Staff loan": 4500 },
};
