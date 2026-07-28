import { UserPlus, Calculator, Landmark } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    title: "Add your team",
    description:
      "Import employees from a spreadsheet or add them one by one. NovaHR validates SA ID numbers, captures bank and tax details, and sets up leave balances automatically.",
  },
  {
    icon: Calculator,
    title: "Run payroll",
    description:
      "Process a pay run in minutes. PAYE, UIF, SDL, and net pay are calculated against the current SARS tables, and payslips are generated for every employee.",
  },
  {
    icon: Landmark,
    title: "Pay and stay compliant",
    description:
      "Pay salaries straight to the bank through Netcash, then generate EMP201, IRP5 certificates, and employment equity reports whenever you need them.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Up and running in three steps</h2>
        <p className="mt-3 text-muted-foreground">
          From onboarding to payday, NovaHR handles the heavy lifting.
        </p>
      </div>

      <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="relative rounded-xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                  Step {index + 1}
                </span>
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
