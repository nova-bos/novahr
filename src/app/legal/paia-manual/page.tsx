import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "PAIA Manual",
  description:
    "NovaHR's manual in terms of section 51 of the Promotion of Access to Information Act 2 of 2000, read with POPIA.",
};

export default function PaiaManualPage() {
  return (
    <LegalPage
      title="PAIA Manual"
      effectiveDate="10 July 2026"
      intro={[
        'Manual in terms of Section 51 of the Promotion of Access to Information Act 2 of 2000 ("PAIA"), read with POPIA.',
        "Private body: [NOVA BUSINESS OS (PTY) LTD], registration number [to be confirmed], trading as NovaHR.",
        "Review: Annually or on material change.",
      ]}
      sections={[
        {
          heading: "Contact Details (s 51(1)(a))",
          paragraphs: [],
          table: {
            rows: [
              ["Head of private body", "[Director name]"],
              ["Information Officer", "[Name]"],
              ["Postal address", "[to be confirmed]"],
              ["Physical address", "[to be confirmed]"],
              ["Telephone", "[to be confirmed]"],
              ["Email", "sales@novabos.co.za"],
              ["Website", "novabos.co.za"],
            ],
          },
        },
        {
          heading: "The Regulator's Guide (s 51(1)(b))",
          paragraphs: [
            "The Information Regulator has published a Guide on how to use PAIA (s 10), available in all official languages from the Information Regulator: inforegulator.org.za, enquiries@inforegulator.org.za, JD House, 27 Stiemens Street, Braamfontein, Johannesburg.",
          ],
        },
        {
          heading: "Records Available Without a PAIA Request (s 51(1)(c))",
          paragraphs: [
            "Available freely on our website: Privacy Policy, Cookie Policy, Terms of Service, POPIA Compliance Statement, product documentation, pricing.",
          ],
        },
        {
          heading: "Records Held (s 51(1)(d) and (e))",
          paragraphs: [
            "4.1 Company and statutory records: Incorporation documents, memorandum of incorporation, share register, board resolutions, statutory returns (CIPC), tax records (SARS), B-BBEE documentation.",
            "4.2 Financial records: Annual financial statements, management accounts, invoices, bank records, asset registers.",
            "4.3 Personnel records (NovaHR's own staff): Employment contracts, remuneration records, leave and attendance, performance records, disciplinary records, PAYE/UIF/SDL records.",
            "4.4 Customer and operational records: Customer contracts (MSA, Order Forms, DPAs), support correspondence, billing records.",
            "4.5 Customer tenant data (held as Operator): Employee master data, payroll and payslip records, leave and attendance records processed on behalf of customers. Requests for these records must be directed to the relevant employer (the Responsible Party); NovaHR will refer such requests to the employer and assist them.",
            "4.6 Information technology records: Source code, system documentation, security logs, audit logs, backups.",
          ],
        },
        {
          heading: "Processing of Personal Information (POPIA disclosures)",
          paragraphs: [],
          table: {
            headers: ["Item", "Description"],
            rows: [
              [
                "Purpose of processing",
                "Providing HR and payroll software; account administration; billing; support; security",
              ],
              [
                "Categories of data subjects",
                "Customer contacts; customers' employees (as Operator); own personnel; suppliers",
              ],
              [
                "Categories of personal information",
                "Identity and contact details; employment and remuneration data; tax numbers; bank details; usage data",
              ],
              [
                "Recipients",
                "Sub-operators (Supabase, Vercel, Resend), professional advisers, authorities where required",
              ],
              [
                "Cross-border flows",
                "To sub-operator infrastructure regions as disclosed in the Data Processing Agreement, per POPIA s 72",
              ],
              [
                "Security measures",
                "Encryption in transit and at rest, tenant isolation, role-based access control, MFA for administrators, audit logging, daily backups; see POPIA Compliance Statement",
              ],
            ],
          },
        },
        {
          heading: "How to Request Access to a Record",
          paragraphs: [
            "1. Complete Form 02 (Request for Access to Record) prescribed under PAIA, available from the Information Regulator's website or from us on request.",
            "2. Submit it to the Information Officer at the contact details above.",
            "3. Identify the record, the right you seek to exercise or protect, and why the record is required for that right (s 50(1)(a)).",
            "4. Pay the prescribed request fee (currently R140 for requesters other than personal requesters, per the PAIA fee regulations; personal requesters pay no request fee). Access and reproduction fees may apply per the regulations.",
            "5. We will decide within 30 days, extendable once by up to 30 days where permitted (s 56, s 57).",
            "Data subjects exercising POPIA rights (access to their own personal information) may use our simpler Data Subject Request forms (available from the Information Officer); no PAIA fee applies to a POPIA section 23 request for confirmation, and a prescribed fee may apply to copies.",
          ],
        },
        {
          heading: "Grounds of Refusal",
          paragraphs: [
            "Access may be refused on the grounds in Chapter 4 of Part 3 of PAIA, including: protection of third-party privacy (s 63), commercial information of a third party (s 64), confidential information (s 65), safety of individuals (s 66), privileged records (s 67), and commercial information of the private body (s 68). Mandatory disclosure in the public interest (s 70) overrides where applicable.",
          ],
        },
        {
          heading: "Remedies",
          paragraphs: [
            "If a request is refused, the requester may apply to the Information Regulator (complaint under s 77A) or to court (s 78).",
          ],
        },
        {
          heading: "Availability of This Manual",
          paragraphs: [
            "This manual is available on our website, at our registered office during business hours, and from the Information Officer on request, free of charge.",
          ],
        },
      ]}
    />
  );
}
