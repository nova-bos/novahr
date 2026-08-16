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
  companyRegistration?: string;
  employeeName: string;
  employeeNumber: string;
  employeeIdNumber?: string;
  jobTitle: string;
  department: string;
  placeOfWork?: string;
  employmentType?: string;
  payFrequency?: string;
  startDate: string;
  endDate?: string;
  salary: number;
  noticePeriodDays?: number;
  probationMonths?: number;
  reason?: string;
  today: string;
  signatory?: string;
}

const BASE_STYLE = `
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Helvetica Neue", Arial, Helvetica, sans-serif; font-size: 11.5pt; line-height: 1.6; color: #1a1a1a; margin: 48px; }
    h1 { font-size: 17pt; letter-spacing: .4px; margin: 0 0 6px; }
    h2 { font-size: 12pt; margin: 22px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #e5e7eb; color: #111; }
    p { margin: 8px 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 22px; }
    .company { font-weight: 700; font-size: 14pt; }
    .label { color: #6b7280; font-size: 9.5pt; }
    .muted { color: #6b7280; }
    .lead { margin: 10px 0 4px; }
    .signature-block { margin-top: 44px; }
    .sig-line { border-bottom: 1px solid #374151; width: 240px; height: 30px; margin-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    th { width: 220px; color: #4b5563; font-weight: 600; }
    @media print { body { margin: 20px; } h2 { break-after: avoid; } }
  </style>
`;

function formatCurrencyZar(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateEmploymentContract(data: LetterData): string {
  const gross = formatCurrencyZar(data.salary);
  const monthlyGross = formatCurrencyZar(data.salary / 12);
  const notice = data.noticePeriodDays ?? 30;
  const probation = data.probationMonths ?? 3;
  const employer = data.companyLegalName ?? data.companyName;
  const placeOfWork = data.placeOfWork || data.companyAddress || "the Employer's premises";
  const payFrequency = data.payFrequency ?? "monthly";
  const employerLine = [
    `<strong>${employer}</strong>`,
    data.companyRegistration ? `(registration number ${data.companyRegistration})` : "",
    data.companyAddress ? `of ${data.companyAddress}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const employeeLine = [
    `<strong>${data.employeeName}</strong>`,
    data.employeeIdNumber ? `(identity number ${data.employeeIdNumber})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Contract of Employment</title>${BASE_STYLE}</head><body>
<div class="header">
  <div>
    <p class="company">${employer}</p>
    ${data.companyRegistration ? `<p class="label">Registration number ${data.companyRegistration}</p>` : ""}
    ${data.companyAddress ? `<p class="label">${data.companyAddress}</p>` : ""}
  </div>
  <p class="label">Date: ${data.today}</p>
</div>

<h1>CONTRACT OF EMPLOYMENT</h1>
<p class="muted">Entered into in terms of the Basic Conditions of Employment Act 75 of 1997</p>

<p class="lead">This Contract of Employment ("<strong>Agreement</strong>") is entered into between:</p>
<p>${employerLine} ("<strong>Employer</strong>"); and</p>
<p>${employeeLine} ("<strong>Employee</strong>").</p>
<p>The parties agree that the Employee is employed on the terms and conditions set out below, which are read together with the Employer's workplace policies and the provisions of the Basic Conditions of Employment Act 75 of 1997 ("BCEA"), the Labour Relations Act 66 of 1995 ("LRA") and the Employment Equity Act 55 of 1998.</p>

<h2>1. Commencement and duration</h2>
<p>The Employee's employment commences on <strong>${data.startDate}</strong>. ${
    data.endDate
      ? `This is a fixed-term contract that terminates automatically on <strong>${data.endDate}</strong>, unless ended earlier in accordance with this Agreement or the law.`
      : "Employment is for an indefinite period and continues until terminated in accordance with clause 8 or applicable law."
  }</p>

<h2>2. Probation</h2>
<p>The first <strong>${probation} months</strong> of employment are a period of probation, during which the Employee's performance and suitability will be assessed. The Employer may extend probation for a fair reason, or confirm, or terminate employment during or at the end of probation following a fair procedure in terms of the LRA Code of Good Practice: Dismissal.</p>

<h2>3. Position and duties</h2>
<table>
  <tr><th>Job title</th><td>${data.jobTitle}</td></tr>
  <tr><th>Department</th><td>${data.department}</td></tr>
  <tr><th>Employee number</th><td>${data.employeeNumber}</td></tr>
  <tr><th>Employment type</th><td>${data.employmentType ?? "Full-time"}</td></tr>
  <tr><th>Place of work</th><td>${placeOfWork}</td></tr>
</table>
<p>The Employee will perform the duties reasonably associated with the position and any other lawful and reasonable duties assigned by the Employer, and will devote proper attention and diligence to the Employer's business. The Employer may reasonably vary the Employee's duties and place of work in accordance with operational requirements.</p>

<h2>4. Remuneration</h2>
<table>
  <tr><th>Annual gross remuneration</th><td>${gross}</td></tr>
  <tr><th>Monthly gross remuneration</th><td>${monthlyGross}</td></tr>
  <tr><th>Payment frequency</th><td>Paid ${payFrequency} by electronic funds transfer</td></tr>
</table>
<p>Remuneration is paid in arrears and is subject to statutory deductions (PAYE, UIF and, where applicable, SDL) and any other deduction the Employee authorises in writing or that is permitted or required by law.</p>

<h2>5. Hours of work and overtime</h2>
<p>The Employee's ordinary hours of work will not exceed 45 hours per week (9 hours per day for a five-day week, or 8 hours per day for a six-day week), in line with the BCEA. Any overtime must be agreed in advance and is remunerated, or compensated with time off, in accordance with the BCEA and any applicable sectoral determination.</p>

<h2>6. Leave</h2>
<p>The Employee is entitled to leave in terms of the BCEA, namely: annual leave of at least 15 working days per annual leave cycle; sick leave of 30 working days in every 36-month cycle (limited during the first six months to one day for every 26 days worked); family responsibility leave of 3 days per annual cycle (after four months of service, working at least four days a week); and maternity, parental, adoption and commissioning parental leave as provided by the BCEA. Leave is taken in accordance with the Employer's leave policy.</p>

<h2>7. Deductions</h2>
<p>The Employer may deduct from the Employee's remuneration any amount the Employee has authorised in writing, any amount required or permitted by law or a court order, and, subject to the BCEA, any amount to reimburse loss or damage caused by the Employee where a fair procedure has been followed.</p>

<h2>8. Termination and notice</h2>
<p>Either party may terminate this Agreement on written notice of <strong>${notice} calendar days</strong>, or the Employer may pay the Employee in lieu of notice. The statutory minimum notice under the BCEA is one week during the first six months of service, two weeks between six and twelve months, and four weeks thereafter; where the notice stated above is shorter than the statutory minimum for the Employee's length of service, the statutory minimum applies. Nothing in this clause limits the Employer's right to dismiss without notice for a fair reason related to misconduct or the Employee's right to challenge a dismissal under the LRA.</p>

<h2>9. Confidentiality and company property</h2>
<p>During and after employment the Employee will keep the Employer's confidential information (including client, financial, pricing and personnel information) strictly confidential and will not use it other than for the Employer's benefit. On termination the Employee will return all company property, documents, equipment and access cards.</p>

<h2>10. Protection of personal information</h2>
<p>The Employee consents to the Employer processing the Employee's personal information for employment, payroll, statutory and administrative purposes in accordance with the Protection of Personal Information Act 4 of 2013 and the Employer's privacy policy.</p>

<h2>11. Discipline and grievances</h2>
<p>The Employee is subject to the Employer's disciplinary and grievance procedures, which are applied in accordance with the LRA Codes of Good Practice. The Employee may raise any grievance in writing with the Employer.</p>

<h2>12. Governing law and disputes</h2>
<p>This Agreement is governed by the laws of the Republic of South Africa. Any dispute that cannot be resolved internally may be referred to the Commission for Conciliation, Mediation and Arbitration (CCMA) or the relevant bargaining council in terms of the LRA.</p>

<h2>13. Entire agreement</h2>
<p>This Agreement, together with the Employer's policies, records the entire agreement between the parties in respect of the Employee's employment and replaces any prior arrangement. Any variation must be recorded in writing and signed by both parties. The Employee confirms having read and understood this Agreement and having had the opportunity to ask questions before signing.</p>

<div class="signature-block">
  <p>Signed at _____________________ on ${data.today}.</p>
  <br>
  <div style="display:flex;gap:80px">
    <div>
      <div class="sig-line"></div>
      <p><strong>For and on behalf of the Employer</strong><br>${employer}<br>${data.signatory ?? "Duly authorised representative"}</p>
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
<p>Having considered all the facts and circumstances, it has been found that the conduct described above constitutes a disciplinary offence. This <strong>${typeLabel}</strong> is accordingly issued.</p>
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
