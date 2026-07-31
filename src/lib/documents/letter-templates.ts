/**
 * Letter and contract template generation (Phase 6 HR outputs).
 *
 * All templates return an HTML string suitable for printing or download as a
 * PDF via the browser's print dialog. They are pure functions with no DB
 * access; callers supply the data (already tenant-scoped by the server action).
 *
 * Templates use inline styles so they render correctly across email clients and
 * plain print targets without an external stylesheet.
 */

export interface LetterData {
  companyName: string;
  companyAddress?: string;
  companyLegalName?: string;
  employeeName: string;
  employeeNumber: string;
  jobTitle: string;
  department: string;
  startDate: string;
  endDate?: string;
  salary: number;
  noticePeriodDays?: number;
  reason?: string;
  today: string;
  signatory?: string;
}

const BASE_STYLE = `
  <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.6; color: #111; margin: 40px; }
    h1 { font-size: 16pt; margin-bottom: 4px; }
    h2 { font-size: 13pt; margin-top: 24px; }
    p { margin: 8px 0; }
    .header { margin-bottom: 32px; }
    .company { font-weight: bold; font-size: 14pt; }
    .label { color: #555; font-size: 10pt; }
    .signature-block { margin-top: 48px; }
    .sig-line { border-bottom: 1px solid #555; width: 240px; margin-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; }
    @media print { body { margin: 20px; } }
  </style>
`;

function formatCurrencyZar(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateEmploymentContract(data: LetterData): string {
  const gross = formatCurrencyZar(data.salary);
  const monthlyGross = formatCurrencyZar(data.salary / 12);
  const notice = data.noticePeriodDays ?? 30;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Employment Contract</title>${BASE_STYLE}</head><body>
<div class="header">
  <p class="company">${data.companyLegalName ?? data.companyName}</p>
  ${data.companyAddress ? `<p class="label">${data.companyAddress}</p>` : ""}
</div>
<p class="label">Date: ${data.today}</p>
<h1>EMPLOYMENT CONTRACT</h1>
<p>This Employment Contract ("<strong>Agreement</strong>") is entered into between <strong>${data.companyLegalName ?? data.companyName}</strong> ("<strong>Employer</strong>") and <strong>${data.employeeName}</strong> ("<strong>Employee</strong>") and is governed by the Basic Conditions of Employment Act 75 of 1997 and the Labour Relations Act 66 of 1995.</p>

<h2>1. Commencement</h2>
<p>The Employee's employment commences on <strong>${data.startDate}</strong>.</p>
${data.endDate ? `<p>This is a fixed-term contract ending on <strong>${data.endDate}</strong>.</p>` : "<p>This contract is of indefinite duration unless terminated in accordance with this Agreement or applicable law.</p>"}

<h2>2. Position</h2>
<table>
  <tr><th>Job title</th><td>${data.jobTitle}</td></tr>
  <tr><th>Department</th><td>${data.department}</td></tr>
  <tr><th>Employee number</th><td>${data.employeeNumber}</td></tr>
</table>

<h2>3. Remuneration</h2>
<table>
  <tr><th>Annual gross salary</th><td>${gross}</td></tr>
  <tr><th>Monthly gross salary</th><td>${monthlyGross}</td></tr>
</table>
<p>Remuneration is subject to applicable statutory deductions (PAYE, UIF, SDL) and any voluntary deductions authorised by the Employee in writing.</p>

<h2>4. Working hours</h2>
<p>The Employee's ordinary hours of work are governed by the BCEA and any applicable sectoral determination. Ordinary working hours shall not exceed 45 hours per week or 9 hours per day for a five-day working week.</p>

<h2>5. Leave</h2>
<p>The Employee is entitled to leave as provided by the BCEA: annual leave (minimum 15 working days per annual cycle), sick leave (30 working days per 36-month cycle after the first 6 months of service), and family responsibility leave (3 days per year after 4 months of service and 4 days worked per week).</p>

<h2>6. Notice period</h2>
<p>Either party may terminate this Agreement by giving <strong>${notice} calendar days</strong> written notice, or pay in lieu thereof, subject to any greater notice period prescribed by the LRA for unfair dismissal purposes.</p>

<h2>7. Confidentiality</h2>
<p>The Employee agrees to keep all confidential information of the Employer strictly confidential during and after employment.</p>

<h2>8. Governing law</h2>
<p>This Agreement is governed by the laws of the Republic of South Africa. Any disputes arising from this Agreement shall first be referred to conciliation at the CCMA in terms of the LRA.</p>

<div class="signature-block">
  <p>Signed at _________________ on ${data.today}.</p>
  <br>
  <div style="display:flex;gap:80px">
    <div>
      <div class="sig-line"></div>
      <p><strong>For and on behalf of</strong><br>${data.companyName}<br>${data.signatory ?? "HR Representative"}</p>
    </div>
    <div>
      <div class="sig-line"></div>
      <p><strong>Employee</strong><br>${data.employeeName}</p>
    </div>
  </div>
</div>
</body></html>`;
}

export function generateTerminationLetter(data: LetterData): string {
  const reason = data.reason ?? "mutual agreement";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Termination Letter</title>${BASE_STYLE}</head><body>
<div class="header">
  <p class="company">${data.companyLegalName ?? data.companyName}</p>
  ${data.companyAddress ? `<p class="label">${data.companyAddress}</p>` : ""}
</div>
<p class="label">Date: ${data.today}</p>
<p><strong>Private and Confidential</strong></p>
<p>${data.employeeName}<br>Employee number: ${data.employeeNumber}</p>
<h1>TERMINATION OF EMPLOYMENT</h1>
<p>Dear ${data.employeeName.split(" ")[0]},</p>
<p>We write to confirm that your employment with <strong>${data.companyName}</strong> as <strong>${data.jobTitle}</strong> in the <strong>${data.department}</strong> department has been terminated with effect from <strong>${data.endDate ?? data.today}</strong>, on the basis of: <strong>${reason}</strong>.</p>
<p>Your final remuneration, including any outstanding leave pay and any amounts owed to you by law, will be paid on or before the final pay date and will be processed in accordance with the applicable payroll run.</p>
<p>You are required to return all company property, access cards, equipment, and confidential information by your last working day. Your obligations of confidentiality and non-disclosure remain in force after the termination of your employment.</p>
<p>Should you have any questions, please contact HR.</p>
<p>We thank you for your contribution to ${data.companyName} and wish you well in your future endeavours.</p>
<div class="signature-block">
  <p>Yours sincerely,</p>
  <br>
  <div class="sig-line"></div>
  <p>${data.signatory ?? "HR Representative"}<br>${data.companyName}</p>
</div>
</body></html>`;
}

export function generateWarningLetter(
  data: LetterData,
  warningType: "verbal" | "written" | "final",
  offence: string,
  hearing?: { date: string; attendees?: string }
): string {
  const typeLabel =
    warningType === "final"
      ? "Final Written Warning"
      : warningType === "written"
        ? "Written Warning"
        : "Verbal Warning";
  const validity = warningType === "verbal" ? "3 months" : warningType === "written" ? "6 months" : "12 months";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${typeLabel}</title>${BASE_STYLE}</head><body>
<div class="header">
  <p class="company">${data.companyLegalName ?? data.companyName}</p>
  ${data.companyAddress ? `<p class="label">${data.companyAddress}</p>` : ""}
</div>
<p class="label">Date: ${data.today}</p>
<p><strong>Private and Confidential</strong></p>
<p>${data.employeeName}<br>Employee number: ${data.employeeNumber}<br>Position: ${data.jobTitle}</p>
<h1>${typeLabel.toUpperCase()}</h1>
<p>Dear ${data.employeeName.split(" ")[0]},</p>
${hearing ? `<p>A disciplinary hearing was held on <strong>${hearing.date}</strong>${hearing.attendees ? ` in the presence of ${hearing.attendees}` : ""}.</p>` : ""}
<h2>Offence</h2>
<p>${offence}</p>
<h2>Finding</h2>
<p>Having considered all the facts and circumstances, it has been found that the above constitutes <strong>${offence}</strong>, which is a disciplinary offence. This <strong>${typeLabel}</strong> is accordingly issued.</p>
<h2>Validity</h2>
<p>This warning is valid for a period of <strong>${validity}</strong> from the date of this letter.</p>
${warningType === "final" ? `<h2>Consequence</h2><p>You are advised that any further offence of a similar or different nature during the validity period of this warning may result in your summary dismissal.</p>` : ""}
<h2>Right of appeal</h2>
<p>You have the right to appeal this warning within 5 working days of receipt. To appeal, submit a written notice to HR stating the grounds of appeal.</p>
<div class="signature-block">
  <p>Signed at _________________ on ${data.today}.</p>
  <br>
  <div style="display:flex;gap:80px">
    <div>
      <div class="sig-line"></div>
      <p>${data.signatory ?? "HR Representative"}<br>${data.companyName}</p>
    </div>
    <div>
      <div class="sig-line"></div>
      <p>Employee acknowledgement<br>${data.employeeName}</p>
    </div>
  </div>
</div>
</body></html>`;
}
