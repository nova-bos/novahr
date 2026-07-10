import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "Security | NovaHR",
  description:
    "How NovaHR protects ID numbers, salaries, and bank details: encryption, tenant isolation, least-privilege access, audit logs, and daily backups.",
};

export default function SecurityPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <article className="container mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-3xl font-semibold tracking-tight">Security at NovaHR</h1>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            You are trusting us with ID numbers, salaries, and bank details. Here is exactly how we
            protect them.
          </p>

          <div className="mt-10 flex flex-col gap-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">Encryption everywhere.</strong>{" "}
              All traffic is encrypted with TLS. Data is encrypted at rest with AES-256, including
              backups.
            </p>

            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">
                Your company&apos;s data is isolated.
              </strong>{" "}
              Every record is separated per company at the database level with row-level security,
              enforced on every query, not just in application code.
            </p>

            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">Least-privilege access.</strong>{" "}
              Employees see only their own data; managers their team; admins their company.
              Internally, production access is limited to named engineers with multi-factor
              authentication, and support works through application tools, not raw database access.
            </p>

            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">Everything is logged.</strong>{" "}
              Payroll runs, approvals, role changes, and exports are recorded in an audit log your
              administrators can view.
            </p>

            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">Backed up daily.</strong>{" "}
              Automated daily backups with tested restore procedures. Recovery objectives are
              published in our SLA.
            </p>

            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">
                Built on certified infrastructure.
              </strong>{" "}
              NovaHR runs on Vercel and Supabase (both SOC 2 Type II), with transactional email via
              Resend.
            </p>

            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">Found a vulnerability?</strong>{" "}
              We welcome good-faith research: read our{" "}
              <Link
                href="/legal/vulnerability-disclosure"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Vulnerability Disclosure Policy
              </Link>{" "}
              and email hello@novahr.co.za with subject &quot;SECURITY REPORT&quot;. We respond
              within 3 business days and will not pursue good-faith researchers.
            </p>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Questions from your IT or security team? Request our security pack:
              hello@novahr.co.za.
            </p>
          </div>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
