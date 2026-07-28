import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Subscription and Payment Terms",
  description:
    "The commercial mechanics of NovaHR subscriptions: plans, billing cycles, payment methods, VAT, and price changes.",
};

export default function SubscriptionTermsPage() {
  return (
    <LegalPage
      title="Subscription and Payment Terms"
      effectiveDate="10 July 2026"
      intro="These terms detail the commercial mechanics of NovaHR subscriptions. They are incorporated into the Terms of Service and read together with the Refund and Cancellation Policy and the current Pricing Schedule."
      sections={[
        {
          heading: "Plans and Pricing",
          paragraphs: [
            "1.1 NovaHR uses a single per-member pricing model. The monthly subscription fee (excl. VAT) is calculated as follows:",
            "Platform fee: R349 per month, plus R30 per active member per month.",
            "Example: an organisation with 10 active members pays R349 + (10 x R30) = R649 per month.",
          ],
          table: {
            headers: ["Active members", "Platform fee", "Member fee", "Monthly total"],
            rows: [
              ["1", "R349", "R30", "R379"],
              ["5", "R349", "R150", "R499"],
              ["10", "R349", "R300", "R649"],
              ["20", "R349", "R600", "R949"],
              ["50", "R349", "R1,500", "R1,849"],
              ["100", "R349", "R3,000", "R3,349"],
              ["150+", "Contact Sales", "Custom", "Custom"],
            ],
          },
          paragraphsAfterTable: [
            "1.2 The authoritative pricing at any time is the published Pricing Schedule on the NovaHR website. Customers who have received a written quote keep their contracted pricing for the stated period.",
            '1.3 "Active member" means any individual with a non-terminated record in your NovaHR tenant on the billing date: employees, directors, partners, contractors, and any other person whose records are managed in the system. Terminated members retained for record-keeping do not count toward the billable member count.',
            "1.4 Organisations with 150 or more active members are classified as Enterprise customers. Enterprise pricing is agreed separately with the NovaHR sales team.",
          ],
        },
        {
          heading: "Billing Cycle",
          paragraphs: [
            "2.1 Subscriptions are billed monthly on the same calendar day each month (the renewal date).",
            "2.2 The first invoice is issued on subscription start, covering the first billing month.",
            "2.3 The billable member count is determined by a snapshot taken on the renewal date. Members added or removed during the cycle do not affect the current invoice. There is no pro-rating for mid-cycle member changes.",
          ],
        },
        {
          heading: "Payment Methods",
          paragraphs: [
            "3.1 Accepted methods: EFT against invoice [and card / debit order via [payment provider] once enabled].",
            "3.2 Invoices are payable within 7 days of invoice date unless the Order states otherwise.",
            "3.3 The customer must keep billing contact details current. Invoices are delivered by email to the billing contact and are deemed received on sending.",
          ],
        },
        {
          heading: "VAT and Invoicing",
          paragraphs: [
            "4.1 Prices exclude VAT. Where NovaHR is a registered VAT vendor, VAT at the prevailing rate (currently 15%) is added and tax invoices compliant with section 20 of the VAT Act 89 of 1991 are issued, showing NovaHR's VAT number, the customer's VAT number if provided, a sequential invoice number, and the VAT amount.",
            '4.2 [Until VAT registration: invoices state "Not a registered VAT vendor; no VAT charged."]',
          ],
        },
        {
          heading: "Late Payment",
          paragraphs: [
            "5.1 Overdue amounts accrue interest at 2% per month, calculated daily.",
            "5.2 At 14 days overdue, NovaHR may suspend access after written notice. At 90 days, the subscription may be treated as cancelled per the Refund and Cancellation Policy.",
            "5.3 The customer is liable for reasonable collection costs on the attorney-and-client scale where recovery action is required.",
          ],
        },
        {
          heading: "Price Changes",
          paragraphs: [
            "6.1 NovaHR may change published pricing at any time for new customers.",
            "6.2 For existing customers, price changes take effect only from the next renewal, with at least 30 days' written notice (60 days for annual plans). If you do not accept a price change, you may cancel effective at the end of the current term.",
          ],
        },
        {
          heading: "Promotions and Discounts",
          paragraphs: [
            "Promotional pricing applies for the stated period only, after which standard pricing resumes. Discounts are not cumulative unless stated.",
          ],
        },
        {
          heading: "Currency",
          paragraphs: [
            "All pricing is in South African Rand (ZAR). The customer bears any bank charges on payment.",
          ],
        },
        {
          heading: "Disputes",
          paragraphs: [
            "Invoice disputes must be raised in writing within 14 days of invoice date, with reasons. Undisputed portions remain payable on time. The parties will resolve disputes in good faith before any suspension for the disputed portion.",
          ],
        },
      ]}
    />
  );
}
