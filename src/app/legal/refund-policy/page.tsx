import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy",
  description:
    "How to cancel a NovaHR subscription, when refunds apply, and what happens to your data after cancellation.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund and Cancellation Policy"
      effectiveDate="10 July 2026"
      intro='This policy governs cancellation of NovaHR subscriptions and refunds. It is incorporated into the Terms of Service. Where the Consumer Protection Act 68 of 2008 ("CPA") applies to a customer, nothing in this policy limits rights that cannot be waived under the CPA.'
      sections={[
        {
          heading: "Cancelling Your Subscription",
          paragraphs: [
            "1.1 You may cancel at any time from Billing settings in the app or by emailing hello@novahr.co.za from your registered account email.",
            "1.2 Monthly plans: Cancellation takes effect at the end of the current billing month. You retain full access until then. No further invoices are raised.",
            "1.3 Annual plans: Cancellation takes effect at the end of the current annual term unless clause 3 applies. We will send a renewal reminder at least 30 days before each annual renewal.",
            "1.4 Cancellation of the subscription does not, by itself, delete your data. See clause 4.",
          ],
        },
        {
          heading: "Trials",
          paragraphs: [
            "Trials are free and end automatically; no cancellation is needed and no charges arise. Trial data is retained for 30 days after expiry, then deleted.",
          ],
        },
        {
          heading: "Refunds",
          paragraphs: [
            "3.1 14-day first-subscription guarantee: If you cancel within 14 days of your first paid subscription, we will refund the full amount paid, provided you have not run a live payroll in the period.",
            "3.2 Monthly fees are otherwise non-refundable once a billing month has started.",
            "3.3 Annual fees: If you cancel an annual plan early (outside clause 3.1), the unused months are not refundable, except where: (a) NovaHR materially breaches the agreement and fails to cure within 14 days of notice; (b) the SLA termination right is triggered (uptime below 97% for 3 consecutive months); (c) NovaHR discontinues the Service or materially removes core paid functionality; in which case unused whole months are refunded pro rata.",
            "3.4 Billing errors: Amounts charged in error are refunded in full within 10 business days of verification.",
            "3.5 Approved refunds are paid to the original payment method or by EFT within 10 business days.",
          ],
        },
        {
          heading: "Your Data After Cancellation",
          paragraphs: [
            "4.1 Export Window: For 30 days after your subscription ends, you may log in with read-only access to export your data (employee records, payslips as PDF, reports as CSV).",
            "4.2 After the Export Window, your data is deleted in accordance with the Data Retention Policy and Data Processing Agreement.",
            "4.3 Important: SARS requires employers to retain payroll records for 5 years. Export and store your payslips and payroll reports before the Export Window closes. NovaHR is not responsible for your statutory record retention after deletion.",
          ],
        },
        {
          heading: "Downgrades and Upgrades",
          paragraphs: [
            "5.1 Upgrades take effect immediately; the price difference is pro-rated for the remainder of the billing period.",
            "5.2 Downgrades take effect at the next billing date. You must reduce active employees to within the lower plan's limit before the downgrade takes effect.",
          ],
        },
        {
          heading: "Suspension for Non-Payment",
          paragraphs: [
            "Accounts more than 14 days overdue may be suspended after notice. Suspension is not cancellation: data is retained and access is restored on payment. Accounts more than 90 days overdue may be treated as cancelled, triggering the Export Window.",
          ],
        },
        {
          heading: "Cancellation by NovaHR",
          paragraphs: [
            "NovaHR may cancel as permitted in the Terms of Service (material breach, unlawful use, insolvency). Where NovaHR cancels other than for your breach, prepaid unused fees are refunded pro rata.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: ["Billing and cancellation queries: hello@novahr.co.za."],
        },
      ]}
    />
  );
}
