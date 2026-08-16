import { Plus } from "lucide-react";

const FAQS = [
  {
    question: "Is NovaHR aligned with SARS?",
    answer:
      "Yes. Payroll runs on the current SARS tax tables for PAYE, UIF and SDL, and NovaHR prepares your EMP201, EMP501, IRP5 and IT3(a) certificates and ETI schedule. The figures are worked out with exact decimal maths, not spreadsheet rounding.",
  },
  {
    question: "Does NovaHR file to SARS for me?",
    answer:
      "No, and that is on purpose. NovaHR prepares SARS-ready declarations and certificates for you to upload or capture on eFiling. Keeping the final submission in your hands means nothing is ever filed in your company's name without you.",
  },
  {
    question: "Which statutory returns does it prepare?",
    answer:
      "EMP201 monthly, EMP501 reconciliations, IRP5 and IT3(a) certificates, the ETI incentive, UIF declarations, the COIDA Return of Earnings, and Employment Equity EEA2 and EEA4. COIDA and Employment Equity come with a reminder to check the current Department of Labour form before you submit.",
  },
  {
    question: "How much does it cost?",
    answer:
      "R349 per month plus R30 per active member. Ten people works out to R649 a month, thirty people to R1,249. Businesses over 150 people move to a custom Enterprise plan. See the pricing section above for the full breakdown.",
  },
  {
    question: "How does the free trial work, and do I need a card?",
    answer:
      "Start free for 30 days with no credit card. That is a full month, so you can run a real pay run from start to finish before you decide. When you are ready you add a payment method and carry on; if you do not, the account simply pauses.",
  },
  {
    question: "How do I pay, and can I cancel anytime?",
    answer:
      "Pay by card through Paystack or by EFT against an invoice. You are billed monthly for the platform fee plus your active members, and you can cancel from the billing screen whenever you like. There is no lock-in contract.",
  },
  {
    question: "Can I pay salaries from NovaHR?",
    answer:
      "NovaHR builds a Netcash batch file, and standard bank EFT files, from a completed pay run. You upload that one file to Netcash or your bank to pay everyone at once. NovaHR prepares the file; the money only moves when you release it, so the software never touches your account.",
  },
  {
    question: "Does leave follow the BCEA?",
    answer:
      "Yes. Annual, sick and family responsibility leave follow the BCEA out the box, and you can adjust the policy to fit your company. Staff request leave, managers approve, and balances update on their own.",
  },
  {
    question: "Can employees see their own payslips and leave?",
    answer:
      "Yes. Every employee gets their own login for payslips, tax certificates, leave balances and personal details, so HR stops fielding requests for reprints and updates.",
  },
  {
    question: "Can I move my existing team across?",
    answer:
      "Import your whole team from a spreadsheet with the bulk template, or add people one at a time. NovaHR checks the data as it comes in, including SA ID numbers, so you start clean. Most teams are up and running the same day.",
  },
  {
    question: "Is my data secure and POPIA compliant?",
    answer:
      "Each company's data is isolated, sensitive fields are encrypted, and access is scoped by role. NovaHR is built around POPIA, including data export and erasure for employee records, and we can share our privacy policy and data-processing agreement.",
  },
  {
    question: "Does it work on a phone, and can I run more than one company?",
    answer:
      "NovaHR runs in any browser and works on a phone or tablet, so staff can check payslips and request leave anywhere. And yes, you can run several companies from one login, each with its own employees, payroll and settings.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Common questions</h2>
        <p className="mt-3 text-muted-foreground">
          The questions we hear most from South African employers, answered plainly.
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
