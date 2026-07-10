import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Support Policy",
  description:
    "How NovaHR provides customer support: channels, coverage, plan entitlements, and escalation.",
};

export default function SupportPolicyPage() {
  return (
    <LegalPage
      title="Support Policy"
      effectiveDate="10 July 2026"
      intro="This Support Policy describes how NovaHR provides customer support. It is incorporated into the Terms of Service and Master Subscription Agreement. Response time commitments and service credits are set out in the Service Level Agreement."
      sections={[
        {
          heading: "Support Channels",
          paragraphs: [],
          table: {
            headers: ["Channel", "Availability", "Notes"],
            rows: [
              [
                "Email: hello@novahr.co.za",
                "24/7 submission; responses in business hours",
                "Primary channel; creates a ticket",
              ],
              ["In-app help and knowledge base", "24/7", "Self-service guides and FAQs"],
              ["WhatsApp: [to be confirmed]", "Business hours", "Growth and Scale plans"],
              ["Scheduled video call", "By appointment", "Scale plan and onboarding"],
            ],
          },
          paragraphsAfterTable: [
            "Business hours: 08:00-17:00 SAST, Monday to Friday, excluding South African public holidays.",
          ],
        },
        {
          heading: "What Support Covers",
          paragraphs: [],
          bullets: [
            "How-to questions about NovaHR features;",
            "Investigation of suspected bugs and errors;",
            "Guidance on configuration (payroll setup, leave policies, roles);",
            "Assistance with data exports;",
            "Account and billing queries;",
            "Incident communication during outages.",
          ],
        },
        {
          heading: "What Support Does Not Cover",
          paragraphs: [],
          bullets: [
            "Tax, legal, or accounting advice. We explain what NovaHR calculates and how; we cannot advise on your tax position, employment law disputes, or SARS matters. Consult a registered tax practitioner or attorney.",
            "Performing your payroll for you (NovaHR is self-service software, not a payroll bureau);",
            "Custom development, custom reports, or integrations outside your plan;",
            "Support for third-party software, networks, or devices;",
            "Recovery of data deleted by your own users beyond the standard backup window;",
            "Training beyond the included onboarding sessions for your plan (additional training is available at [R, to be confirmed] per hour).",
          ],
        },
        {
          heading: "Plan Entitlements",
          paragraphs: [],
          table: {
            headers: ["Entitlement", "Starter", "Growth", "Scale"],
            rows: [
              ["Email support", "Yes", "Yes", "Yes"],
              ["Priority queue", "No", "Yes", "Yes"],
              ["WhatsApp support", "No", "Yes", "Yes"],
              ["Onboarding sessions", "Self-serve guides", "1 live session", "Dedicated onboarding"],
              ["Named contact", "No", "No", "Yes"],
            ],
          },
        },
        {
          heading: "How to Get the Fastest Resolution",
          paragraphs: ["Include in your request:"],
          bullets: [
            "1. Your company name and the email address of your NovaHR account;",
            "2. What you were trying to do, what you expected, and what happened instead;",
            "3. The page or module (e.g. Payroll, Leave, Reports);",
            "4. Screenshots where possible (redact ID numbers and bank details);",
            "5. Whether the issue blocks a payroll run or pay day (this triggers P1 handling).",
          ],
        },
        {
          heading: "Escalation",
          paragraphs: [
            'If a ticket is not progressing, reply with "ESCALATE" in the subject line or email [founder escalation address]. P1 payroll-blocking issues are escalated automatically.',
          ],
        },
        {
          heading: "Feature Requests",
          paragraphs: [
            "Feature requests are welcome via hello@novahr.co.za and are logged, reviewed monthly, and prioritised on the product roadmap. Logging a request is not a commitment to build it.",
          ],
        },
        {
          heading: "Supported Environments",
          paragraphs: [
            "NovaHR supports the latest two major versions of Chrome, Edge, Firefox, and Safari on desktop and mobile. Issues specific to unsupported browsers may not be fixed.",
          ],
        },
        {
          heading: "Changes",
          paragraphs: ["We may update this policy with 30 days' notice for material changes."],
        },
      ]}
    />
  );
}
