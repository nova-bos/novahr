import { formatCurrency, formatDate, formatMonthYear } from "@/lib/format";
import type { Employee, Payslip } from "@/lib/types";

export function buildPayslipHtml(employee: Employee, payslip: Payslip): string {
  const period = formatMonthYear(payslip.period);
  const payDate = formatDate(payslip.payDate);
  const today = formatDate(new Date().toISOString().slice(0, 10));

  const earningsRows = [
    `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;">${"Basic salary"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;font-variant-numeric:tabular-nums;">${formatCurrency(payslip.basicSalary)}</td>
    </tr>`,
    ...payslip.earnings.map(
      (item) => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;">${item.label}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;font-variant-numeric:tabular-nums;">${formatCurrency(item.amount)}</td>
    </tr>`,
    ),
    `<tr style="background:#f5f5f5;">
      <td style="padding:6px 8px;font-weight:600;">Gross pay</td>
      <td style="padding:6px 8px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">${formatCurrency(payslip.grossPay)}</td>
    </tr>`,
  ].join("\n");

  const deductionRows = [
    ...payslip.deductions.map(
      (item) => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;">${item.label}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;text-align:right;font-variant-numeric:tabular-nums;">-${formatCurrency(item.amount)}</td>
    </tr>`,
    ),
    `<tr style="background:#f5f5f5;">
      <td style="padding:6px 8px;font-weight:600;">Total deductions</td>
      <td style="padding:6px 8px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">-${formatCurrency(payslip.totalDeductions)}</td>
    </tr>`,
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payslip - ${employee.firstName} ${employee.lastName} - ${period}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      background: #fff;
      padding: 32px;
      max-width: 780px;
      margin: 0 auto;
    }
    h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    h2 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #1a1a1a;
    }
    .header-left h1 { color: #1a1a1a; }
    .header-left p { color: #6b6b6b; margin-top: 2px; font-size: 11px; }
    .header-right { text-align: right; }
    .header-right .label { font-size: 11px; color: #6b6b6b; }
    .header-right .value { font-weight: 600; }
    .employee-block {
      margin-bottom: 24px;
      padding: 12px 16px;
      background: #f9f9f9;
      border-radius: 6px;
    }
    .employee-block .name { font-size: 14px; font-weight: 700; }
    .employee-block .meta { color: #6b6b6b; margin-top: 2px; }
    .section { margin-bottom: 24px; }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead tr {
      background: #f5f5f5;
    }
    thead th {
      padding: 7px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #555;
    }
    thead th:last-child { text-align: right; }
    .net-pay-box {
      background: rgba(37,99,235,0.08);
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }
    .net-pay-box .net-label { font-size: 14px; font-weight: 700; }
    .net-pay-box .net-amount { font-size: 20px; font-weight: 700; color: #16a34a; font-variant-numeric: tabular-nums; }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e5e5;
      font-size: 10px;
      color: #999;
      text-align: center;
    }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>NovaHR</h1>
      <p>Employee payslip</p>
    </div>
    <div class="header-right">
      <p class="label">Pay period</p>
      <p class="value">${period}</p>
      <p class="label" style="margin-top:6px;">Pay date</p>
      <p class="value">${payDate}</p>
    </div>
  </div>

  <div class="employee-block">
    <p class="name">${employee.firstName} ${employee.lastName}</p>
    <p class="meta">${employee.jobTitle} &middot; ${employee.department}</p>
  </div>

  <div class="section">
    <h2>Earnings</h2>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${earningsRows}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Deductions</h2>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${deductionRows}
      </tbody>
    </table>
  </div>

  <div class="net-pay-box">
    <span class="net-label">Net pay</span>
    <span class="net-amount">${formatCurrency(payslip.netPay)}</span>
  </div>

  <div class="footer">Generated by NovaHR &middot; ${today}</div>
</body>
</html>`;
}

export function printPayslip(employee: Employee, payslip: Payslip): void {
  const html = buildPayslipHtml(employee, payslip);
  const win = window.open("", "_blank", "width=820,height=960");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onafterprint = () => win.close();
  win.print();
}
