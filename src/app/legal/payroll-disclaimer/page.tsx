import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Payroll Compliance Disclaimer",
  description:
    "The compliance disclaimer and customer responsibilities that apply to payroll processing in NovaHR.",
};

export default function PayrollDisclaimerPage() {
  return (
    <LegalPage
      title="Compliance Disclaimer and Customer Responsibilities"
      effectiveDate="10 July 2026"
      intro="Incorporated by reference into the Terms of Service and Master Subscription Agreement. Shown to customers during payroll onboarding."
      sections={[
        {
          heading: "What NovaHR Is",
          paragraphs: [
            "NovaHR is software that helps you administer HR and payroll: it stores records, computes statutory amounts using published SARS and BCEA parameters, generates payslips, and produces reports.",
          ],
        },
        {
          heading: "What NovaHR Is Not",
          paragraphs: ["NovaHR is not:"],
          bullets: [
            "a registered tax practitioner, accountant, auditor, or law firm;",
            "a payroll bureau or outsourced payroll service;",
            "a substitute for professional advice on tax, employment law, or accounting;",
            "the party responsible for your statutory filings.",
          ],
          paragraphsAfterTable: [
            "Nothing in the Service, its outputs, documentation, or support communications constitutes tax, legal, accounting, or financial advice.",
          ],
        },
        {
          heading: "Division of Responsibility",
          paragraphs: [],
          table: {
            headers: ["Area", "NovaHR's responsibility", "Your responsibility (the employer)"],
            rows: [
              [
                "Tax tables and statutory rates",
                "Maintain published SARS parameters in the engine, updated after each Budget",
                "Verify the configuration fits your circumstances",
              ],
              [
                "Calculations",
                "Compute PAYE, UIF, SDL, and leave correctly from the data you enter",
                "Enter correct data: salaries, allowances, dates of birth, dependants, pension rates, working patterns",
              ],
              [
                "Payslips",
                "Generate BCEA-compliant payslips from your data",
                "Review before publishing; deliver any required printed copies",
              ],
              [
                "SARS submissions",
                "Provide the figures and reports",
                "File and pay EMP201 by the 7th, EMP501 reconciliations, and issue IRP5s",
              ],
              [
                "UIF declarations",
                "Provide contribution amounts",
                "Register with UIF; submit UI-19/uFiling declarations",
              ],
              [
                "Employment law",
                "Provide BCEA-minimum defaults",
                "Configure policies per your contracts, sector rules, and bargaining councils; obtain advice where needed",
              ],
              [
                "Record retention",
                "Retain data per the Data Retention Policy while you subscribe; provide exports",
                "Export and retain statutory records (SARS 5 years, BCEA 3 years), especially before cancellation",
              ],
              [
                "Data protection",
                "Operator duties under the DPA",
                "Responsible Party duties under POPIA toward your employees",
              ],
            ],
          },
        },
        {
          heading: "Your Warranties",
          paragraphs: [
            "By using the payroll module you warrant that:",
            "1. You are authorised to process your employees' personal information and have met your POPIA notification duties toward them;",
            "2. The data you enter is accurate and current;",
            "3. You will review each payroll run before approving and publishing it;",
            "4. You will meet all filing and payment deadlines with SARS and the Department of Employment and Labour;",
            "5. You will seek professional advice for unusual arrangements (directives, expatriates, share schemes, retrenchments) rather than relying on the Service's standard treatment.",
          ],
        },
        {
          heading: "Limitation",
          paragraphs: [
            "To the extent permitted by law, NovaHR is not liable for penalties, interest, assessments, or losses arising from: data you entered incorrectly; runs you approved without review; filings you made late or not at all; configuration choices contrary to this documentation; or reliance on the Service as professional advice. This clause operates with, and does not expand, the liability provisions of the Terms of Service.",
          ],
        },
        {
          heading: "Where NovaHR Gets It Wrong",
          paragraphs: [
            "If a defect in NovaHR's calculation engine (as opposed to your data or configuration) produces incorrect statutory amounts, we will: correct the defect, notify affected customers with corrected figures, assist with corrected payslips, and cooperate with your practitioner on remediation, per the Incident Response Plan and the remedies in the Terms of Service.",
          ],
        },
        {
          heading: "Acknowledgement",
          paragraphs: [
            "Onboarding requires an HR Administrator to acknowledge this document before the first payroll run:",
          ],
          blockquote:
            '"I understand that NovaHR is a software tool, that my company remains responsible for the accuracy of its payroll data and all statutory submissions, and that NovaHR does not provide tax, legal, or accounting advice."',
          paragraphsAfterTable: [
            "The acknowledgement is recorded with user, tenant, version, and timestamp.",
          ],
        },
      ]}
    />
  );
}
