const ITEMS = ["PAYE", "UIF", "SDL", "EMP201", "EMP501", "IRP5 / IT3(a)", "ETI", "Netcash payments", "POPIA"];

export function ComplianceStrip() {
  return (
    <section className="border-y bg-muted/30">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Built for South African payroll compliance
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-3">
          {ITEMS.map((item) => (
            <span
              key={item}
              className="rounded-full border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground/80"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
