import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export interface LegalTable {
  headers?: string[];
  rows: string[][];
}

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  table?: LegalTable;
  paragraphsAfterTable?: string[];
  blockquote?: string;
}

function LegalParagraph({ text }: { text: string }) {
  return <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>;
}

export function LegalPage({
  title,
  effectiveDate,
  intro,
  sections,
  outro,
}: {
  title: string;
  effectiveDate: string;
  intro: string | string[];
  sections: LegalSection[];
  outro?: string | string[];
}) {
  const introParagraphs = Array.isArray(intro) ? intro : [intro];
  const outroParagraphs = outro ? (Array.isArray(outro) ? outro : [outro]) : [];

  return (
    <div className="relative flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <article className="container mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Effective date: {effectiveDate}</p>
          {introParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mt-6 text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}

          <div className="mt-10 flex flex-col gap-8">
            {sections.map((section, index) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold tracking-tight">
                  {index + 1}. {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <LegalParagraph key={paragraph.slice(0, 40)} text={paragraph} />
                ))}
                {section.bullets ? (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                    {section.bullets.map((bullet) => (
                      <li key={bullet.slice(0, 40)}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.table ? (
                  <div className="mt-4 overflow-x-auto rounded-lg border">
                    <table className="w-full border-collapse text-sm">
                      {section.table.headers && section.table.headers.some((header) => header) ? (
                        <thead>
                          <tr className="border-b bg-muted/50">
                            {section.table.headers.map((header) => (
                              <th
                                key={header}
                                className="px-3 py-2 text-left font-medium text-foreground"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                      ) : null}
                      <tbody>
                        {section.table.rows.map((row) => (
                          <tr key={row.join("|").slice(0, 60)} className="border-b last:border-b-0">
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`${cellIndex}-${cell.slice(0, 40)}`}
                                className="px-3 py-2 align-top leading-relaxed text-muted-foreground"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {section.blockquote ? (
                  <blockquote className="mt-4 rounded-lg border-l-4 border-primary bg-muted/50 px-4 py-3 text-sm leading-relaxed text-foreground">
                    {section.blockquote}
                  </blockquote>
                ) : null}
                {section.paragraphsAfterTable?.map((paragraph) => (
                  <LegalParagraph key={paragraph.slice(0, 40)} text={paragraph} />
                ))}
              </section>
            ))}
          </div>

          {outroParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mt-10 text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
