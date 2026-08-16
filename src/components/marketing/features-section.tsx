import {
  Wallet,
  FileCheck2,
  CalendarRange,
  Smartphone,
  Users,
  Building2,
} from "lucide-react";

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Wallet,
    title: "Payroll engine",
    description:
      "PAYE, UIF and SDL worked out for every employee on the current SARS tables. Monthly, fortnightly or weekly pay runs.",
  },
  {
    icon: FileCheck2,
    title: "Statutory filing",
    description:
      "EMP201, EMP501, IRP5 and IT3(a), ETI, COIDA and Employment Equity, prepared and ready for you to submit.",
  },
  {
    icon: CalendarRange,
    title: "Leave management",
    description:
      "BCEA leave out the box. Staff request, managers approve, and balances update on their own.",
  },
  {
    icon: Smartphone,
    title: "Employee self-service",
    description:
      "Payslips, tax certificates and leave in every employee's own login, so HR fields fewer requests.",
  },
  {
    icon: Users,
    title: "Employee records",
    description:
      "Full records with bank and tax details, bulk import, an org chart, and a documents vault for contracts.",
  },
  {
    icon: Building2,
    title: "Multi-company and roles",
    description:
      "Run several companies from one login, with HR, managers and staff each seeing only what they should.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">One place for payroll, people and compliance</h2>
        <p className="mt-3 text-muted-foreground">
          Onboarding, payroll, leave and statutory returns, without stitching separate tools together.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="rounded-xl border bg-card p-6 transition-colors hover:border-primary/30 hover:bg-accent/40"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
