import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "Compliance | NovaHR",
  description:
    "How NovaHR complies with POPIA, SARS payroll requirements, and the BCEA, including our full POPIA Compliance Statement.",
};

const EIGHT_CONDITIONS: { condition: string; how: string }[] = [
  {
    condition: "1. Accountability (s 8)",
    how: "A designated Information Officer is appointed and registered with the Information Regulator. A documented compliance programme (policies, ROPA, training) is maintained and reviewed annually.",
  },
  {
    condition: "2. Processing limitation (ss 9-12)",
    how: "We process personal information only as needed to provide the Service, on the lawful bases identified in our Privacy Policy, and under customer instruction for tenant data (Data Processing Agreement).",
  },
  {
    condition: "3. Purpose specification (ss 13-14)",
    how: "Purposes are defined in the Privacy Policy and DPA. Retention is limited per our Data Retention Policy, honouring statutory minimums (SARS 5 years for payroll records, BCEA 3 years for certain employment records).",
  },
  {
    condition: "4. Further processing limitation (s 15)",
    how: "Customer payroll data is never used for marketing, profiling, or sale. Aggregated, de-identified statistics only.",
  },
  {
    condition: "5. Information quality (s 16)",
    how: "Customers control and can correct their data directly in the app at any time. Validation rules reduce capture errors (ID number checksums, banking field validation).",
  },
  {
    condition: "6. Openness (ss 17-18)",
    how: "Privacy Policy and PAIA Manual are publicly available. Data subjects are informed of processing via their employer and our published notices.",
  },
  {
    condition: "7. Security safeguards (ss 19-22)",
    how: "Encryption in transit and at rest, database-level tenant isolation, role-based access, audit logs, daily backups, breach response plan with 72-hour notification, written contracts with all sub-operators.",
  },
  {
    condition: "8. Data subject participation (ss 23-25)",
    how: "Access, correction, and deletion request procedures with published forms; employees are routed via their employer (the Responsible Party), whom we assist.",
  },
];

export default function CompliancePage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <article className="container mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-3xl font-semibold tracking-tight">Compliance</h1>

          <div className="mt-10 flex flex-col gap-8">
            <section>
              <h2 className="text-lg font-semibold tracking-tight">POPIA</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                We process employee data as your Operator under a signed Data Processing Agreement,
                with a registered Information Officer, published{" "}
                <Link
                  href="/legal/paia-manual"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  PAIA Manual
                </Link>
                , breach response within 72 hours, and documented retention and deletion rules.
                Full detail: our{" "}
                <a
                  href="#popia-compliance-statement"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  POPIA Compliance Statement
                </a>{" "}
                below.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight">SARS payroll compliance</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The payroll engine implements the current tax year&apos;s PAYE tables, rebates,
                medical scheme fees tax credits, UIF ceiling, and SDL rules, verified against SARS
                publications, covered by 200+ automated tests, and updated every March. How we
                verify: our payroll calculations and auditing documentation (available on request).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight">BCEA</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Default leave policies meet BCEA minimums (annual, sick, family responsibility,
                maternity, parental), payslips carry the section 33 particulars, and records are
                retained beyond the 3-year requirement.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold tracking-tight">
                What stays your responsibility
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                NovaHR is software, not a tax practitioner: filing EMP201/EMP501, paying SARS, and
                UI-19 declarations remain yours, with our reports giving you the exact figures.
                Plain-language detail:{" "}
                <Link
                  href="/legal/payroll-disclaimer"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Compliance Disclaimer and Customer Responsibilities
                </Link>
                .
              </p>
            </section>
          </div>

          {/* Full POPIA Compliance Statement */}
          <section id="popia-compliance-statement" className="mt-16 scroll-mt-24 border-t pt-12">
            <h2 className="text-2xl font-semibold tracking-tight">
              NovaHR POPIA Compliance Statement
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Version: 1.0 (Draft, pending legal review)
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Effective date: [to be confirmed]
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Review cycle: Annual, and on any material change to processing
            </p>

            <div className="mt-10 flex flex-col gap-8">
              <section>
                <h3 className="text-lg font-semibold tracking-tight">1. Our Commitment</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  NovaHR processes some of the most sensitive information a business holds:
                  employee identity numbers, salaries, bank details, and leave records. We treat
                  compliance with the Protection of Personal Information Act 4 of 2013
                  (&quot;POPIA&quot;) as a core product requirement, not an afterthought.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold tracking-tight">
                  2. How the Eight Conditions Are Met
                </h3>
                <div className="mt-3 overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 font-semibold">POPIA condition</th>
                        <th className="px-4 py-3 font-semibold">How NovaHR complies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EIGHT_CONDITIONS.map((row) => (
                        <tr key={row.condition} className="border-b last:border-b-0 align-top">
                          <td className="whitespace-nowrap px-4 py-3 font-medium">
                            {row.condition}
                          </td>
                          <td className="px-4 py-3 leading-relaxed text-muted-foreground">
                            {row.how}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold tracking-tight">3. Roles</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                  <li>
                    For customer tenant data (employee records, payroll): the customer is the
                    Responsible Party; NovaHR is the Operator under a written Data Processing
                    Agreement (POPIA ss 20-21).
                  </li>
                  <li>
                    For our own account, billing, and marketing contacts: NovaHR is the Responsible
                    Party.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold tracking-tight">4. Sub-Operators</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  We use a small set of vetted infrastructure providers (Supabase, Vercel, Resend),
                  each SOC 2 Type II certified and bound by contract. Cross-border transfers comply
                  with POPIA section 72. The current list, regions, and roles are published in our
                  Data Processing Agreement.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold tracking-tight">5. Breach Response</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  We maintain a tested Data Breach Response Policy: containment, assessment, and
                  notification of the Information Regulator and affected Responsible Parties as
                  soon as reasonably possible, and in any event within 72 hours of confirming a
                  compromise (POPIA s 22).
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold tracking-tight">6. Data Subject Requests</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Requests may be submitted using the forms referenced in our PAIA Manual to
                  hello@novahr.co.za. Employees of NovaHR customers should contact their employer
                  first; we assist employers in fulfilling requests.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold tracking-tight">7. Governance</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                  <li>
                    Information Officer: [to be confirmed], registered with the Information
                    Regulator on [to be confirmed].
                  </li>
                  <li>
                    Policy suite: Privacy Policy, Data Processing Agreement, Data Retention Policy,
                    Data Deletion Policy, Data Breach Response Policy, Access Control Policy,
                    Encryption Policy, Password Policy, Backup Policy, Audit Log Policy.
                  </li>
                  <li>
                    Training: All personnel with data access complete POPIA awareness training on
                    joining and annually.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold tracking-tight">8. Contact</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Information Officer, NOVA BUSINESS OS (PTY) LTD, hello@novahr.co.za.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Complaints may also be lodged with the Information Regulator:
                  enquiries@inforegulator.org.za, inforegulator.org.za.
                </p>
              </section>
            </div>
          </section>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
