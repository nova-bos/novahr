import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How NovaHR uses cookies and similar technologies on our website and application.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      effectiveDate="10 July 2026"
      intro="This Cookie Policy explains how NovaHR uses cookies and similar technologies on our website and application. It supplements our Privacy Policy."
      sections={[
        {
          heading: "What Cookies Are",
          paragraphs: [
            "Cookies are small text files placed on your device by a website. They allow the site to recognise your device, keep you logged in, and remember preferences.",
          ],
        },
        {
          heading: "Cookies We Use",
          paragraphs: ["2.1 Strictly necessary cookies (no consent required)"],
          table: {
            headers: ["Cookie", "Set by", "Purpose", "Duration"],
            rows: [
              [
                "sb-*-auth-token",
                "Supabase Auth (first-party)",
                "Keeps you securely logged in to your NovaHR account",
                "Session / refresh cycle",
              ],
              [
                "[CSRF / session cookies]",
                "NovaHR",
                "Security and session integrity",
                "Session",
              ],
            ],
          },
          paragraphsAfterTable: [
            "The Service cannot function without these. They are not used for tracking or advertising.",
            "2.2 Analytics cookies (consent required)",
            "We currently use cookieless, aggregated analytics that do not store cookies on your device and do not identify you. If we introduce cookie-based analytics, we will update this policy and request consent via a banner first.",
            "2.3 Marketing cookies",
            "We do not use advertising or third-party marketing cookies.",
          ],
        },
        {
          heading: "Managing Cookies",
          paragraphs: [
            "You can block or delete cookies in your browser settings. Blocking strictly necessary cookies will prevent you from logging in to NovaHR. Instructions: see your browser's help pages (Chrome, Edge, Firefox, Safari).",
          ],
        },
        {
          heading: "Changes",
          paragraphs: [
            "We will update this policy when our cookie usage changes and revise the effective date above.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: ["admin@novabos.co.za"],
        },
      ]}
    />
  );
}
