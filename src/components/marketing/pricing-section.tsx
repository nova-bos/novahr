import Link from "next/link";
import { appLink } from "@/lib/marketing/app-link";
import { Button } from "@/components/ui/button";
import { PLATFORM_FEE, MEMBER_FEE, ENTERPRISE_THRESHOLD } from "@/lib/marketing/pricing";

const EXAMPLES = [
  { members: 1, memberFee: 30, total: 379 },
  { members: 5, memberFee: 150, total: 499 },
  { members: 10, memberFee: 300, total: 649 },
  { members: 20, memberFee: 600, total: 949 },
  { members: 50, memberFee: 1500, total: 1849 },
  { members: 100, memberFee: 3000, total: 3349 },
];

const FEATURES = [
  "Payroll processing",
  "Leave management",
  "Compliance tracking",
  "Netcash integration",
  "EMP201 returns",
  "Employment equity",
  "Reports and analytics",
  "Role-based access",
  "14-day free trial",
];

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          One plan. Every feature. Priced by the number of people you manage.
        </p>
      </div>

      {/* Formula */}
      <div className="rounded-2xl border bg-card p-8 mt-12 mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-bold">R{PLATFORM_FEE}</span>
            <span className="text-sm text-muted-foreground">platform fee / month</span>
          </div>
          <span className="text-2xl text-muted-foreground font-light">+</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-bold">R{MEMBER_FEE}</span>
            <span className="text-sm text-muted-foreground">per member / month</span>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          A &ldquo;member&rdquo; is anyone onboarded in NovaHR: employees, directors, partners, or contractors.
        </p>
      </div>

      {/* Examples table */}
      <div className="rounded-2xl border overflow-x-auto mb-8">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Active members</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Platform fee</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Member fee</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Monthly total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {EXAMPLES.map((row) => (
              <tr key={row.members} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{row.members} {row.members === 1 ? "member" : "members"}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">R{PLATFORM_FEE}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">R{row.memberFee}</td>
                <td className="px-4 py-3 text-right font-semibold">R{row.total.toLocaleString("en-ZA")}</td>
              </tr>
            ))}
            <tr className="bg-muted/30">
              <td className="px-4 py-3 font-medium text-muted-foreground" colSpan={3}>{ENTERPRISE_THRESHOLD}+ members</td>
              <td className="px-4 py-3 text-right font-semibold">Contact Sales</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* What is included */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Every paying customer gets the complete NovaHR platform. No feature restrictions.
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground mb-8">
          {FEATURES.map((f) => (
            <span key={f} className="rounded-full border px-3 py-1">{f}</span>
          ))}
        </div>
        <Button asChild>
          <Link href={appLink("/signup")}>Start your free trial</Link>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">14-day free trial. No credit card required.</p>
      </div>
    </section>
  );
}
