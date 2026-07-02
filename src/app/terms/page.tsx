import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | NovaHR",
  description: "The terms that govern your use of NovaHR.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      effectiveDate="1 July 2026"
      intro="These Terms of Service (the Terms) govern access to and use of the NovaHR platform, websites and related services (the Service). By creating an account or using the Service you agree to these Terms on behalf of yourself and, where applicable, the company you represent (the Customer)."
      sections={[
        {
          heading: "The Service",
          paragraphs: [
            "NovaHR provides cloud-based human resources and payroll software for South African businesses, including employee records, leave management, payroll calculation, payslip generation and statutory compliance tracking.",
            "NovaHR is a software tool. It does not provide legal, tax or accounting advice, and it does not submit returns to SARS, the UIF or any other authority on your behalf. The Customer remains responsible for reviewing payroll output and for its own statutory filings and payments.",
          ],
        },
        {
          heading: "Accounts and responsibilities",
          paragraphs: [
            "You must provide accurate registration information and keep your credentials confidential. You are responsible for all activity under your account and for managing which of your staff are invited into your workspace and with which role.",
          ],
          bullets: [
            "Only authorised representatives of the Customer may create or administer a workspace.",
            "You will ensure the personal information of employees you load into the Service was collected lawfully.",
            "You will not use the Service for any unlawful purpose or attempt to access another customer's data.",
          ],
        },
        {
          heading: "Trials, fees and payment",
          paragraphs: [
            "New workspaces receive a 14-day free trial with full functionality. After the trial ends, continued use requires a paid subscription on one of the published plans. Fees are billed in South African Rand, in advance, and are non-refundable except where required by law.",
            "We may change pricing with at least 30 days' written notice; changes apply from your next billing cycle.",
          ],
        },
        {
          heading: "Customer data",
          paragraphs: [
            "As between the parties, the Customer owns all employee and payroll data loaded into the Service. We process that data only to provide the Service, as described in our Privacy Policy, and in accordance with the Protection of Personal Information Act, 2013 (POPIA).",
            "On written request within 30 days of termination, we will provide an export of the Customer's data in a machine-readable format, after which we may delete it.",
          ],
        },
        {
          heading: "Availability and support",
          paragraphs: [
            "We aim to keep the Service available continuously but do not guarantee uninterrupted availability. Planned maintenance will be communicated in advance where practical. Support is provided by email during South African business hours.",
          ],
        },
        {
          heading: "Limitation of liability",
          paragraphs: [
            "To the maximum extent permitted by law, NovaHR's total liability arising out of or related to the Service in any 12-month period is limited to the fees paid by the Customer in that period. NovaHR is not liable for indirect, consequential or special damages, or for penalties, interest or losses arising from incorrect statutory filings, except to the extent caused by our gross negligence or wilful misconduct.",
          ],
        },
        {
          heading: "Termination",
          paragraphs: [
            "Either party may terminate at the end of a billing cycle with written notice. We may suspend or terminate access immediately for material breach of these Terms, non-payment, or where required by law.",
          ],
        },
        {
          heading: "General",
          paragraphs: [
            "These Terms are governed by the laws of the Republic of South Africa. If any provision is found unenforceable, the remainder stays in effect. We may update these Terms from time to time; material changes will be notified in the app or by email, and continued use after the effective date constitutes acceptance.",
            "Questions about these Terms can be sent to mtshwenewesley@gmail.com.",
          ],
        },
      ]}
    />
  );
}
