import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Data Processing Agreement",
  description:
    "The Data Processing Agreement under which NovaHR processes personal information on behalf of customers as Operator under POPIA.",
};

export default function DpaPage() {
  return (
    <LegalPage
      title="Data Processing Agreement (DPA)"
      effectiveDate="10 July 2026"
      intro='This Data Processing Agreement ("DPA") forms part of the agreement between [NOVA BUSINESS OS (PTY) LTD] ("NovaHR", the "Operator") and the Customer (the "Responsible Party") for the NovaHR service (the "Agreement"). Terms defined in the Protection of Personal Information Act 4 of 2013 ("POPIA") have the meanings given there.'
      sections={[
        {
          heading: "Roles and Scope",
          paragraphs: [
            "1.1 For Personal Information contained in Customer Data, the Customer is the Responsible Party and NovaHR is the Operator as defined in POPIA section 1.",
            "1.2 This DPA applies to all Processing of Personal Information by NovaHR on behalf of the Customer in connection with the Service.",
            "1.3 For Personal Information NovaHR collects for its own purposes (account contacts, billing, marketing), NovaHR is itself a Responsible Party and its Privacy Policy applies; this DPA does not.",
          ],
        },
        {
          heading: "Details of Processing",
          paragraphs: [],
          table: {
            headers: ["Item", "Description"],
            rows: [
              [
                "Subject matter",
                "Provision of the NovaHR HR, payroll, leave, attendance, and reporting platform",
              ],
              [
                "Duration",
                "The term of the Agreement plus the Export Window and statutory retention periods",
              ],
              [
                "Nature and purpose",
                "Hosting, storage, computation (payroll calculations), display, transmission (payslip emails, notifications), backup, and deletion",
              ],
              [
                "Categories of data subjects",
                "The Customer's current and former employees, contractors, and system users",
              ],
              [
                "Categories of Personal Information",
                "Identity data (names, SA ID numbers, dates of birth), contact details, employment data (position, department, start and end dates), remuneration data (salaries, allowances, deductions, bank account details), tax data (income tax numbers), leave and attendance records, payslips, audit log entries",
              ],
              [
                "Special Personal Information",
                "None intended. The Customer must not upload health, biometric, religious, or criminal data unless a lawful basis exists and NovaHR is notified",
              ],
            ],
          },
        },
        {
          heading: "Operator Obligations (POPIA ss 20-21)",
          paragraphs: [
            "NovaHR will:",
            "3.1 Process Personal Information only on the Customer's documented instructions, as given through the Customer's use and configuration of the Service and the Agreement, and only with the Customer's knowledge or authorisation, unless required by law;",
            "3.2 Treat all Personal Information as confidential and not disclose it except as required to provide the Service or by law;",
            "3.3 Ensure all personnel with access are bound by confidentiality obligations;",
            "3.4 Implement and maintain the security measures in clause 5, securing the integrity and confidentiality of Personal Information as required by POPIA section 19;",
            "3.5 Notify the Customer immediately, and in any event within 72 hours, where there are reasonable grounds to believe that Personal Information has been accessed or acquired by an unauthorised person (POPIA section 22), providing sufficient information for the Customer to notify the Information Regulator and affected data subjects, and cooperating with remediation. The Customer, as Responsible Party, is responsible for regulator and data subject notification; NovaHR will assist;",
            "3.6 Assist the Customer, at reasonable cost, in responding to data subject requests (access, correction, deletion, objection) under POPIA and PAIA;",
            "3.7 Maintain records of Processing activities performed on the Customer's behalf and make them available on reasonable request;",
            "3.8 Not retain Personal Information longer than necessary per clause 7.",
          ],
        },
        {
          heading: "Sub-Operators",
          paragraphs: [
            "4.1 The Customer provides general authorisation for the sub-operators listed below. NovaHR will give at least 14 days' notice before adding or replacing a sub-operator; if the Customer reasonably objects on data protection grounds and no resolution is found, the Customer may terminate the affected service with a pro-rata refund.",
            "4.2 NovaHR will impose data protection obligations on each sub-operator no less protective than this DPA and remains liable for their performance.",
            "Current sub-operators:",
          ],
          table: {
            headers: ["Sub-operator", "Function", "Location of processing", "Assurance"],
            rows: [
              [
                "Supabase Inc.",
                "Database hosting, authentication, storage",
                "[Region: e.g. AWS eu-west / af-south]",
                "SOC 2 Type II",
              ],
              [
                "Vercel Inc.",
                "Application hosting, serverless compute, CDN",
                "Global edge, compute in [to be confirmed]",
                "SOC 2 Type II",
              ],
              [
                "Resend (Plus Five Five, Inc.)",
                "Transactional email (payslips, notifications, invites)",
                "United States",
                "SOC 2 Type II",
              ],
            ],
          },
        },
        {
          heading: "Security Measures",
          paragraphs: [
            "NovaHR maintains appropriate, reasonable technical and organisational measures, including:",
          ],
          bullets: [
            "Encryption in transit (TLS 1.2+) and at rest (AES-256 at the database and storage layer);",
            "Logical multi-tenant isolation enforced at the database layer (row-level security keyed on tenant ID) and application layer;",
            "Role-based access control within the Service (Employee, Manager, HR Admin, Executive roles);",
            "Authentication via Supabase Auth with hashed credentials; support for strong password policy;",
            "Least-privilege access to production systems, restricted to authorised NovaHR personnel with multi-factor authentication;",
            "Audit logging of administrative and payroll actions within the Service;",
            "Daily automated database backups with documented restoration procedures;",
            "Secure development practices: code review, automated testing (unit and integration), CI gates before deployment;",
            "Vendor due diligence for all sub-operators.",
          ],
          paragraphsAfterTable: [
            "Details are maintained in the NovaHR Information Security Policy set (encryption, access control, password, backup policies).",
          ],
        },
        {
          heading: "Cross-Border Transfers (POPIA s 72)",
          paragraphs: [
            "6.1 Some sub-operators process data outside South Africa. NovaHR will only transfer Personal Information across borders where the recipient is subject to a law, binding corporate rules, or a binding agreement providing an adequate level of protection substantially similar to POPIA, or where another lawful ground under section 72 applies.",
            "6.2 NovaHR will inform the Customer of the storage regions in use and of material changes.",
          ],
        },
        {
          heading: "Retention, Return, and Deletion",
          paragraphs: [
            "7.1 During the term, the Customer controls retention through the Service and the Data Retention Policy.",
            "7.2 On termination, the Customer may export Customer Data during the 30-day Export Window. Thereafter NovaHR will delete or de-identify all Personal Information within 60 days, including from backups per backup rotation, except where retention is required by law (e.g. SARS 5-year payroll record requirements apply to the Customer, not NovaHR; NovaHR retains only what the law requires of it).",
            "7.3 On written request, NovaHR will confirm deletion in writing.",
          ],
        },
        {
          heading: "Audit",
          paragraphs: [
            "8.1 NovaHR will make available information reasonably necessary to demonstrate compliance with this DPA, including summaries of sub-operator certifications and security policies.",
            "8.2 The Customer may audit compliance at most once per 12 months, on 30 days' notice, during business hours, at its own cost, without access to other customers' data or NovaHR trade secrets. A completed industry-standard security questionnaire or third-party report satisfies this right where reasonable.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "Liability under this DPA is subject to the limitations and exclusions in the Agreement, save that nothing limits liability that cannot be limited under POPIA.",
          ],
        },
        {
          heading: "Term",
          paragraphs: [
            "This DPA takes effect on acceptance of the Agreement and remains in force as long as NovaHR processes Personal Information on the Customer's behalf.",
          ],
        },
      ]}
      outro="This DPA is accepted by the Customer electronically during onboarding."
    />
  );
}
