import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description:
    "The Acceptable Use Policy that governs use of the NovaHR platform.",
};

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy (AUP)"
      effectiveDate="10 July 2026"
      intro="This Acceptable Use Policy governs use of the NovaHR platform and is incorporated into the Terms of Service and Master Subscription Agreement. Capitalised terms have the meanings given there."
      sections={[
        {
          heading: "Permitted Use",
          paragraphs: ["The Service may be used only:"],
          bullets: [
            "for the Customer's internal human resources, payroll, leave, attendance, and employee management purposes;",
            "to process the personal information of the Customer's own employees, contractors, and job applicants for lawful employment purposes;",
            "by Authorised Users acting within their assigned roles.",
          ],
        },
        {
          heading: "Prohibited Use",
          paragraphs: [
            "You must not use the Service to:",
            "2.1 Unlawful activity",
          ],
          bullets: [
            "Violate any law, including POPIA, the BCEA, tax legislation, or the Cybercrimes Act 19 of 2020;",
            "Process personal information without a lawful basis, or process the data of individuals who are not employees, contractors, or applicants of the Customer;",
            "Facilitate tax evasion, misrepresent remuneration to SARS, or generate payslips for fictitious employees;",
            "Launder money or disguise the proceeds of crime.",
          ],
          paragraphsAfterTable: [
            "2.2 Security violations: Probe, scan, or test the vulnerability of the Service without written authorisation (see the Vulnerability Disclosure Policy for the authorised route); Circumvent authentication, tenant isolation, plan limits, or access controls; Access another tenant's data or attempt to; Upload malware or malicious code; Interfere with the integrity or performance of the Service, including denial-of-service or automated scraping.",
            "2.3 Misuse of the platform: Share login credentials between individuals; each Authorised User must have their own account; Resell, sublicense, or provide the Service as a bureau to third parties without a written partner agreement; Reverse engineer, decompile, or copy the Service; Use the Service to build or benchmark a competing product; Send spam or unlawful communications through the Service's email features; Upload content that is defamatory, discriminatory, or infringes third-party rights.",
          ],
        },
        {
          heading: "Fair Use",
          paragraphs: [
            "Storage, email dispatch, and API usage (where enabled) are subject to fair use relative to the Customer's plan and employee count. NovaHR may contact the Customer to discuss usage that materially exceeds normal patterns before applying limits.",
          ],
        },
        {
          heading: "Enforcement",
          paragraphs: [
            "4.1 NovaHR may investigate suspected violations and may suspend or restrict access immediately where reasonably necessary to prevent harm to the Service, other customers, or data subjects.",
            "4.2 Where practical, NovaHR will notify the Customer and allow a reasonable period to cure before suspension. Repeated or material violations may lead to termination under the Agreement.",
            "4.3 NovaHR may report unlawful activity to authorities where required by law.",
          ],
        },
        {
          heading: "Reporting Violations",
          paragraphs: [
            'Report suspected violations or abuse to hello@novahr.co.za with the subject line "AUP Report". Reports are treated confidentially.',
          ],
        },
      ]}
    />
  );
}
