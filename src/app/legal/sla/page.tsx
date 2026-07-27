import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Service Level Agreement",
  description:
    "NovaHR's availability commitment, support response times, and service credits for paid subscriptions.",
};

export default function SlaPage() {
  return (
    <LegalPage
      title="Service Level Agreement (SLA)"
      effectiveDate="10 July 2026"
      intro="This Service Level Agreement forms part of the Terms of Service / Master Subscription Agreement. It applies to paid subscriptions only; trial accounts carry no SLA."
      sections={[
        {
          heading: "Availability Commitment",
          paragraphs: [
            '1.1 NovaHR will use commercially reasonable efforts to make the Service available 99.5% of the time, measured monthly ("Monthly Uptime Percentage").',
            "1.2 Monthly Uptime Percentage = (total minutes in month - Downtime minutes) / total minutes in month x 100.",
            "1.3 Downtime means the Service is unavailable to all of the Customer's Authorised Users, as measured by NovaHR's monitoring. Downtime excludes:",
          ],
          bullets: [
            "Scheduled maintenance announced at least 48 hours in advance and performed outside South African business hours (08:00-17:00 SAST, Monday to Friday) where practical, capped at 4 hours per month;",
            "Emergency maintenance reasonably necessary to protect security or data integrity;",
            "Failures of the Customer's own equipment, connectivity, or third-party services outside NovaHR's control;",
            "Suspension permitted under the Agreement (e.g. non-payment, AUP violation);",
            "Force majeure events;",
            "Beta or preview features expressly labelled as such.",
          ],
        },
        {
          heading: "Support Response Times",
          paragraphs: [
            "Support requests are submitted to support@novabos.co.za. Severity is assigned as follows:",
          ],
          table: {
            headers: ["Severity", "Definition", "First response", "Update cadence", "Target resolution"],
            rows: [
              [
                "P1 Critical",
                "Service down for all users, data breach, or payroll run blocked on pay day",
                "2 business hours",
                "Every 4 hours",
                "1 business day",
              ],
              [
                "P2 High",
                "Core feature (payroll, leave approval, payslips) unusable, workaround unavailable",
                "4 business hours",
                "Daily",
                "3 business days",
              ],
              [
                "P3 Medium",
                "Feature degraded, workaround available",
                "1 business day",
                "Every 2 business days",
                "10 business days",
              ],
              [
                "P4 Low",
                "Cosmetic issues, questions, feature requests",
                "2 business days",
                "As needed",
                "Roadmap-dependent",
              ],
            ],
          },
          paragraphsAfterTable: [
            "Business hours: 08:00-17:00 SAST, Monday to Friday, excluding South African public holidays. Priority support (Growth and Scale plans) extends P1 coverage to 07:00-19:00 SAST.",
            "Target resolution times are objectives, not guarantees; service credits attach to availability (clause 3) and P1 first-response only.",
          ],
        },
        {
          heading: "Service Credits",
          paragraphs: [
            "3.1 If the Monthly Uptime Percentage falls below the commitment, the Customer is entitled to a credit against future fees:",
          ],
          table: {
            headers: ["Monthly Uptime Percentage", "Credit (% of that month's fee)"],
            rows: [
              ["Below 99.5% but at least 99.0%", "10%"],
              ["Below 99.0% but at least 97.0%", "25%"],
              ["Below 97.0%", "50%"],
            ],
          },
          paragraphsAfterTable: [
            "3.2 If NovaHR misses the P1 first-response commitment more than twice in a month, the Customer is entitled to a 10% credit for that month, in addition to any availability credit, capped together at 50%.",
            "3.3 Claim process: Credits must be claimed in writing to support@novabos.co.za within 30 days of the end of the affected month, with dates and times of claimed Downtime. NovaHR will verify against its monitoring and apply approved credits to the next invoice.",
            "3.4 Credits are the Customer's sole and exclusive remedy for availability failures, are not redeemable for cash, and lapse on termination. Total credits in any month cannot exceed 50% of that month's fee.",
            "3.5 Termination right: If the Monthly Uptime Percentage falls below 97.0% in 3 consecutive months, the Customer may terminate on 30 days' notice with a pro-rata refund of prepaid unused fees.",
          ],
        },
        {
          heading: "Maintenance and Communication",
          paragraphs: [],
          bullets: [
            "Scheduled maintenance is announced by email and in-app notice at least 48 hours in advance.",
            "Incident status is communicated by email [and on the status page at status.novabos.co.za once live].",
            "A post-incident summary is provided for all P1 incidents within 5 business days.",
          ],
        },
        {
          heading: "Data Protection Service Levels",
          paragraphs: [],
          bullets: [
            "Backups: Automated daily database backups, retained for at least 7 days.",
            "Recovery Point Objective (RPO): 24 hours.",
            "Recovery Time Objective (RTO): 8 business hours for full service restoration after catastrophic failure.",
            "Breach notification: Within 72 hours of confirming unauthorised access to personal information, per the Data Processing Agreement.",
          ],
        },
        {
          heading: "Review",
          paragraphs: [
            "This SLA is reviewed annually. Changes take effect at the Customer's next renewal with at least 30 days' notice.",
          ],
        },
      ]}
    />
  );
}
