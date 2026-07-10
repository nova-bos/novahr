import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "NovaHR legal, privacy, and trust documents: terms, policies, agreements, and compliance information.",
};

const documents: { title: string; href: string; description: string }[] = [
  {
    title: "Terms of Service",
    href: "/terms",
    description: "The terms that govern access to and use of the NovaHR platform and services.",
  },
  {
    title: "Privacy Policy",
    href: "/privacy",
    description: "How we collect, use, share, and protect personal information under POPIA.",
  },
  {
    title: "Cookie Policy",
    href: "/cookies",
    description: "The cookies and similar technologies we use on our website and application.",
  },
  {
    title: "Acceptable Use Policy",
    href: "/legal/acceptable-use",
    description: "What you may and may not do on the NovaHR platform.",
  },
  {
    title: "Service Level Agreement",
    href: "/legal/sla",
    description: "Our availability commitment, support response times, and service credits.",
  },
  {
    title: "Support Policy",
    href: "/legal/support-policy",
    description: "Support channels, what support covers, and plan entitlements.",
  },
  {
    title: "Refund and Cancellation Policy",
    href: "/legal/refund-policy",
    description: "How to cancel your subscription and when refunds apply.",
  },
  {
    title: "Subscription and Payment Terms",
    href: "/legal/subscription-terms",
    description: "Plans, billing cycles, payment methods, VAT, and price changes.",
  },
  {
    title: "Data Processing Agreement",
    href: "/legal/dpa",
    description: "How NovaHR processes personal information on your behalf as Operator under POPIA.",
  },
  {
    title: "PAIA Manual",
    href: "/legal/paia-manual",
    description: "Our manual under section 51 of the Promotion of Access to Information Act.",
  },
  {
    title: "Payroll Compliance Disclaimer",
    href: "/legal/payroll-disclaimer",
    description: "What NovaHR is and is not, and the division of payroll compliance responsibility.",
  },
  {
    title: "Vulnerability Disclosure Policy",
    href: "/legal/vulnerability-disclosure",
    description: "How security researchers can report vulnerabilities responsibly.",
  },
  {
    title: "Security",
    href: "/security",
    description: "An overview of the technical and organisational measures that protect your data.",
  },
  {
    title: "Compliance",
    href: "/compliance",
    description: "Our POPIA and statutory compliance posture at a glance.",
  },
];

export default function LegalHubPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-3xl font-semibold tracking-tight">Legal</h1>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            The documents that govern your use of NovaHR and explain how we protect your data.
          </p>

          <ul className="mt-10 flex flex-col divide-y rounded-lg border">
            {documents.map((doc) => (
              <li key={doc.href}>
                <Link
                  href={doc.href}
                  className="block px-4 py-4 transition-colors hover:bg-muted/50"
                >
                  <span className="text-sm font-semibold tracking-tight">{doc.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {doc.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
