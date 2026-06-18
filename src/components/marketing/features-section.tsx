import {
  Wallet,
  CalendarRange,
  Users,
  ShieldCheck,
  Building2,
  FileText,
} from "lucide-react";

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Wallet,
    title: "Payroll Engine",
    description:
      "Run South African payroll in minutes. PAYE, UIF, and SDL calculated automatically for every employee.",
  },
  {
    icon: CalendarRange,
    title: "Leave Management",
    description:
      "Submit, approve, and track annual, sick, and family leave across your whole team.",
  },
  {
    icon: Users,
    title: "Employee Profiles",
    description:
      "Complete employee records with emergency contacts, bank details, and onboarding checklists.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    description:
      "Employees, managers, and HR each see exactly what they need. Nothing more.",
  },
  {
    icon: Building2,
    title: "Multi-Company",
    description:
      "Manage multiple subsidiaries from a single Exco login with consolidated reporting.",
  },
  {
    icon: FileText,
    title: "Payslip Delivery",
    description:
      "Payslips are generated automatically on payroll completion and accessible to employees instantly.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Everything your HR team needs</h2>
        <p className="mt-3 text-muted-foreground">
          NovaHR covers the full employee lifecycle, from onboarding to payslips.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="rounded-xl border bg-card p-6"
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
