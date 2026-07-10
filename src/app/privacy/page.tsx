import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How NovaHR collects, uses, shares, and protects personal information in terms of POPIA.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="10 July 2026"
      intro='[NOVA BUSINESS OS (PTY) LTD], registration number [to be confirmed] ("NovaHR", "we", "us"), respects your privacy. This policy explains how we collect, use, share, and protect personal information in terms of the Protection of Personal Information Act 4 of 2013 ("POPIA") and, where applicable, other data protection laws.'
      sections={[
        {
          heading: "Who We Are",
          paragraphs: [
            "NovaHR provides a cloud-based HR and payroll platform for South African businesses.",
          ],
          bullets: [
            "Responsible Party: [NOVA BUSINESS OS (PTY) LTD], [registered address]",
            "Information Officer: [Name], hello@novahr.co.za",
            "Website: [novahr.co.za]",
          ],
        },
        {
          heading: "Two Roles: Read This First",
          paragraphs: [
            "We process personal information in two distinct capacities:",
            "(a) As a Responsible Party, for information we collect directly from you: when you sign up, contact support, subscribe to updates, or visit our website. This policy governs that processing.",
            "(b) As an Operator, for employee information that our business customers load into NovaHR (names, ID numbers, salaries, bank details, leave records). The employer is the Responsible Party for that data; we process it only on their instructions under a Data Processing Agreement. If you are an employee of a company that uses NovaHR and want to access or correct your data, contact your employer's HR department first. We will assist them in responding.",
          ],
        },
        {
          heading: "Information We Collect (as Responsible Party)",
          paragraphs: [],
          table: {
            headers: ["Category", "Examples", "Source"],
            rows: [
              ["Account data", "Name, work email, phone, company name, role", "You, at sign-up"],
              ["Billing data", "Billing contact, VAT number, payment references", "You"],
              ["Support data", "Correspondence, ticket contents", "You"],
              [
                "Usage data",
                "Log-ins, pages viewed, feature usage, IP address, browser type",
                "Automatically",
              ],
              ["Marketing data", "Email engagement, preferences", "You / automatically"],
            ],
          },
          paragraphsAfterTable: [
            "We do not intentionally collect special personal information (health, biometrics, religion) about our own contacts.",
          ],
        },
        {
          heading: "Why We Process It and Our Lawful Basis",
          paragraphs: [],
          table: {
            headers: ["Purpose", "Lawful basis (POPIA s 11)"],
            rows: [
              ["Creating and administering your account", "Performance of a contract"],
              [
                "Billing and collecting payment",
                "Performance of a contract; legal obligation (tax records)",
              ],
              ["Providing support", "Performance of a contract"],
              ["Securing the platform, preventing fraud and abuse", "Legitimate interests"],
              [
                "Service emails (payslips, notifications, system notices)",
                "Performance of a contract",
              ],
              [
                "Marketing emails to customers and people who opted in",
                "Consent / legitimate interest with opt-out (s 69)",
              ],
              ["Improving the product using aggregated usage data", "Legitimate interests"],
              ["Complying with law and lawful requests", "Legal obligation"],
            ],
          },
          paragraphsAfterTable: [
            "We do not sell personal information. We do not use customer payroll data for advertising.",
          ],
        },
        {
          heading: "Direct Marketing",
          paragraphs: [
            "We only send electronic marketing to existing customers about similar services (with an opt-out in every message) or to people who have consented, as required by POPIA section 69 and the Consumer Protection Act. Unsubscribe links appear in every marketing email; transactional emails (payslips, security notices) are not marketing and cannot be opted out of while you use the Service.",
          ],
        },
        {
          heading: "Who We Share Information With",
          paragraphs: ["We share personal information only with:"],
          table: {
            headers: ["Recipient", "Role", "Why"],
            rows: [
              [
                "Supabase Inc.",
                "Database, authentication, file storage",
                "Hosting the platform data",
              ],
              ["Vercel Inc.", "Application hosting and delivery", "Running the application"],
              ["Resend", "Transactional email", "Sending payslips, invites, notifications"],
              [
                "Accountants, attorneys, auditors",
                "Professional advisers",
                "Under confidentiality duties",
              ],
              ["Payment providers [to be confirmed]", "Billing", "Processing payments"],
              ["Authorities", "Regulators, courts, SARS", "Where required by law"],
            ],
          },
          paragraphsAfterTable: [
            "Each service provider is bound by contract to protect personal information. We do not permit them to use it for their own purposes.",
          ],
        },
        {
          heading: "Cross-Border Transfers",
          paragraphs: [
            "Some providers store or process data outside South Africa (see the regions in our Data Processing Agreement). We transfer personal information across borders only as permitted by POPIA section 72: to recipients bound by laws or binding agreements providing substantially similar protection, or with your consent, or as necessary to perform our contract with you.",
          ],
        },
        {
          heading: "How Long We Keep Information",
          paragraphs: [
            "We keep personal information only as long as needed for the purposes above, then delete or de-identify it. Key periods:",
          ],
          bullets: [
            "Account and billing records: duration of the relationship plus 5 years (tax and contract-claim periods);",
            "Support tickets: 3 years;",
            "Marketing data: until you unsubscribe or 2 years of inactivity;",
            "Customer tenant data after cancellation: 30-day export window, then deletion per our Data Retention Policy.",
          ],
        },
        {
          heading: "Security",
          paragraphs: [
            "We protect personal information with appropriate, reasonable measures including encryption in transit and at rest, tenant isolation, role-based access control, least-privilege administration with multi-factor authentication, audit logging, and daily backups. See our Security page for details. No system is perfectly secure; we will notify affected parties and the Information Regulator of breaches as POPIA requires.",
          ],
        },
        {
          heading: "Your Rights",
          paragraphs: ["Under POPIA you may:"],
          bullets: [
            "Access the personal information we hold about you (see also our PAIA Manual);",
            "Correct inaccurate or outdated information;",
            "Delete information we are not entitled to retain;",
            "Object to processing based on legitimate interests, and to direct marketing at any time;",
            "Withdraw consent where processing is based on consent;",
            "Complain to the Information Regulator.",
          ],
          paragraphsAfterTable: [
            'To exercise a right, use the request forms in our PAIA Manual or email hello@novahr.co.za with "Data Subject Request" in the subject. We respond within a reasonable time and in any event within the periods PAIA prescribes.',
            "Information Regulator (South Africa): JD House, 27 Stiemens Street, Braamfontein, Johannesburg; enquiries@inforegulator.org.za; inforegulator.org.za.",
          ],
        },
        {
          heading: "Cookies",
          paragraphs: [
            "We use cookies as described in our Cookie Policy: strictly necessary session cookies for login, and [analytics cookies, if any] which you can decline.",
          ],
        },
        {
          heading: "Children",
          paragraphs: [
            "NovaHR is a business tool and not directed at children under 18. We do not knowingly collect children's information, except employee records lawfully processed by employers (e.g. learnerships), for which the employer is the Responsible Party.",
          ],
        },
        {
          heading: "Changes to This Policy",
          paragraphs: [
            'We will post updates here and, for material changes, notify account holders by email at least 30 days in advance. The "Last Updated" date reflects the current version.',
          ],
        },
        {
          heading: "Contact",
          paragraphs: [
            "Privacy questions and requests: hello@novahr.co.za (attention: Information Officer), or write to [postal address].",
          ],
        },
      ]}
    />
  );
}
