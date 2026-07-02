import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export function LegalPage({
  title,
  effectiveDate,
  intro,
  sections,
}: {
  title: string;
  effectiveDate: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <article className="container mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Effective date: {effectiveDate}</p>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{intro}</p>

          <div className="mt-10 flex flex-col gap-8">
            {sections.map((section, index) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold tracking-tight">
                  {index + 1}. {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {section.bullets.map((bullet) => (
                      <li key={bullet.slice(0, 40)}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
