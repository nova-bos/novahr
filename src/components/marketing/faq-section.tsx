import { Plus } from "lucide-react";

const FAQS = [
  {
    question: "Is NovaHR aligned with SARS requirements?",
    answer:
      "Yes. Payroll is calculated against the current SARS tax tables for PAYE, UIF, and SDL, and NovaHR generates EMP201 submissions, IRP5 / IT3(a) certificates, and EMP501 reconciliations. You stay in control of final submissions to SARS.",
  },
  {
    question: "Can I pay salaries directly from NovaHR?",
    answer:
      "NovaHR integrates with Netcash so you can export a completed pay run and pay salaries straight to employee bank accounts, without re-capturing details in your banking portal.",
  },
  {
    question: "Does leave follow the Basic Conditions of Employment Act?",
    answer:
      "Annual leave accrues over the leave cycle in line with the BCEA, and sick and family responsibility leave follow the statutory entitlements. Employees request leave, managers approve, and balances update automatically.",
  },
  {
    question: "Is my data secure and POPIA compliant?",
    answer:
      "Every company's data is isolated, sensitive fields are encrypted, and access is scoped by role. NovaHR is built around POPIA principles, including data export and erasure for employee records.",
  },
  {
    question: "Can I move my existing employees across?",
    answer:
      "Yes. Import your team from a spreadsheet using the bulk CSV template, or add employees individually. NovaHR validates the data as it comes in so you start with clean records.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Plans start at R499 per month and scale with your headcount. Every plan includes a 14-day free trial with no credit card required. See the pricing section above for the full breakdown.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Common questions</h2>
        <p className="mt-3 text-muted-foreground">
          Everything you need to know before you get started.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl divide-y rounded-xl border bg-card">
        {FAQS.map((faq) => (
          <details key={faq.question} className="group px-6 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium">
              {faq.question}
              <Plus
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                aria-hidden="true"
              />
            </summary>
            <p className="pb-5 text-sm text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
