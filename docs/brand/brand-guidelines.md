# NovaHR Brand Guidelines

**Version:** 1.0
**Owner:** Founder
**Note:** codifies what already exists in the product and brochure; extract exact colour tokens from the app's Tailwind theme before first external design handoff [●].

---

## 1. Brand Essence

- **What we are:** the HR and payroll platform SA small businesses can actually run themselves;
- **Personality:** competent, plain-speaking, local, calm. The trusted bookkeeper, not the flashy consultant;
- **We sound:** clear, concrete, quietly confident. We explain compliance without jargon and never scaremonger;
- **We never sound:** corporate-vague, hype-driven, or condescending about small businesses.

## 2. Naming and Suite

- Product: **NovaHR** (one word, capital N and HR). Never "Nova HR" or "NOVAHR";
- Suite: **Nova Business OS**: NovaHR, NovaPOS, NovaBooks, NovaCRM, NovaLend (NovaPilot is the AI copilot inside the suite);
- Company legal name in legal contexts: [NOVA BUSINESS OS (PTY) LTD ●].

## 3. Logo

- Primary mark: the **orbit-star icon** (`public/logo-icon.png`) plus the NovaHR wordmark;
- Clear space: at least the height of the icon on all sides; minimum size: 24px icon height on screen;
- Use on solid backgrounds only; light and dark variants exist (dark asset set in `marketing/shots-dark`);
- Never: stretch, recolour outside the palette, add effects, or place on busy imagery.

## 4. Colour

[Extract exact hex values from the app theme and brochure and record here ●]

| Role | Token | Hex | Usage |
|---|---|---|---|
| Primary | [●] | [●] | Buttons, links, brand accents |
| Primary dark | [●] | [●] | Dark surfaces (brochure dark theme) |
| Neutral text | [●] | [●] | Body copy |
| Surface | [●] | [●] | Backgrounds, cards |
| Success / Warning / Error | [●] | [●] | Status only, never decoration |

Rule: one primary accent per composition; status colours are functional, not decorative.

## 5. Typography

- App and web: [record the app's font stack ●];
- Documents and PDFs: same family for headings; system serif acceptable for long legal text;
- Hierarchy: bold weight and size, never underline for emphasis; sentence case for headings (not Title Case).

## 6. Writing Rules (apply everywhere: UI, docs, marketing)

- **No em dashes or en dashes, ever.** Use commas, colons, or full stops;
- Sentence case headings; plain-language legal summaries alongside formal documents;
- ZAR amounts: "R499" (no space, no decimals unless cents matter);
- Dates: "7 March 2026" in prose; ISO (2026-03-07) in tables and technical docs;
- SA English spelling (organisation, licence as noun);
- Compliance content always footed with the not-advice disclaimer;
- Numbers with sources: any tax figure carries its year ("2026/27").

## 7. Imagery and Illustration

- Product screenshots are the primary imagery: real UI on the demo tenant, realistic SA data, never lorem ipsum or "Test123";
- Light and dark screenshot sets maintained per release (`marketing/` capture scripts);
- Photography (when used): real SA workplaces, natural light, no glossy stock-photo handshakes;
- Icons: the app's icon set (consistent stroke weight); no mixed icon families in one asset.

## 8. Asset Applications (templates to produce from these rules)

| Asset | Status |
|---|---|
| Presentation template (sales deck master) | To build from `docs/sales/sales-deck-outline.md` [●] |
| Email signature | [Name] / NovaHR / novahr.co.za / hello@novahr.co.za + logo, no banners [●] |
| Letterhead (quotes, legal letters) | Logo top-left, company details footer with reg number [●] |
| Invoice and quotation templates | Per `docs/sales/quotation-template.md` + accounting system config [●] |
| Business cards | Name, role, phone, email, site; icon on reverse [●] |
| Social templates (Canva) | Post, carousel, and infographic masters in brand colours [●] |

## 9. File Naming and Storage

`novahr-[asset]-[variant]-v[n].[ext]`, masters in [Drive/Figma ●]; exported PDFs in the repo where they pair with markdown sources.
