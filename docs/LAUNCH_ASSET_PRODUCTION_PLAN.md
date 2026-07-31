# NovaHR Launch Asset Production Plan

**Owner:** Founder
**Created:** 2026-07-30
**Status:** Planning. Execution begins once the app is signed off (structurally complete; only tweaks remain).
**Source brief:** "NovaHR Launch Asset Production Master Prompt" (Nova Business OS creative team standard).
**Goal:** Produce the full launch asset library to a BambooHR / Rippling / Gusto / Xero / Linear standard, all from one unified NovaHR identity.

---

## 0. How to read this plan

Every item in the master prompt is triaged into one of three states:

- **KEEP** — pure text/legal docs that are current and correct. Leave as-is; light review only.
- **REBUILD** — exists as an outdated first draft. Rewrite to the current product, brand, and document template.
- **NEW** — does not exist yet. Produce from scratch.

Per the founder's instruction: everything except the pure legal/policy text docs is treated as an outdated first draft to be rebuilt. The existing user guides, manuals, sales, marketing, and customer-success drafts are **not** trusted as final.

---

## 1. Critical cross-reference findings (resolve before production)

### 1.1 Design-language conflict — BLOCKS EVERYTHING
The master brief specifies **Deep Nova Blue (primary) + White + Gold accent**.
The **shipped product** (`src/app/globals.css`, `docs/brand/brand-guidelines.md` v1) is **indigo/violet `#4F46E5`, no gold**, with the orbit-star logo.

These cannot both be true. Every asset (screenshots, decks, PDFs, web, social) inherits the palette, so this must be settled first. Options:
- **(A) Keep shipped indigo** (recommended): assets match the live product and existing brochure with zero rework; treat "Deep Nova Blue / gold" as superseded language in the brief.
- **(B) Rebrand to blue + gold**: requires re-theming the app first, then re-capturing all screenshots. Larger, and pointless if the product ships indigo.
- **(C) Hybrid**: indigo primary + gold as a sparing premium accent in print/marketing only (not UI).

**Decision — RESOLVED (2026-07-30): Option C, Hybrid.** Keep the shipped indigo `#4F46E5` as the UI/primary across all assets; use **gold as a sparing premium accent in print and marketing collateral only** (never in the app UI). Brand Guidelines v2 must define the exact gold token, and the rules for where gold is and is not allowed.

### 1.2 Brand guidelines are v1 and marked "codifies what exists"
`docs/brand/brand-guidelines.md` has placeholder markers (e.g. legal entity, exact hex confirmation). Promote to **v2 = single source of truth** as the first Phase-0 deliverable, resolving 1.1 inside it.

### 1.3 Content cadence conflict
The master brief asks for an ambitious **6-month, 6-platform** social calendar. The existing `content-strategy-and-calendar.md` is deliberately scoped to a **solo founder** (3 posts/week, 1 article/month). Reconcile: either resource the ambitious plan or keep the sustainable one. Recommend building the full 6-month calendar as a **library to draw from**, executed at the sustainable cadence.

### 1.4 Graphic-design deliverables need a boundary
Items like business cards, letterhead, roll-up banners, LinkedIn banner, infographics, invoice template are **final print/graphic artwork**.
**Decision — RESOLVED (2026-07-30): produce full HTML/SVG artwork** ready to export directly, accepting web-tool limits vs a pro design suite. Each piece ships at correct dimensions/bleed where relevant, with an export note. No mock-only placeholders.

### 1.5 Existing asset pipeline is good — reuse it
`marketing/capture.mjs` (Playwright → high-DPI screenshots of the live tenant) and the HTML→PDF brochure/deck approach already work. Standardise on this: **author in HTML/Markdown → render to PDF**, screenshots auto-captured from the production tenant. Do not hand-build one-off styles.

---

## 2. Inventory cross-reference (master prompt vs. what exists)

### 2.1 Legal & compliance policies — mostly KEEP
`docs/legal/` and `docs/compliance/` already hold: privacy-policy, terms-of-service, PAIA manual, POPIA statement, cookie-policy, master-subscription-agreement, acceptable-use-policy, SLA, DPA, plus a full compliance policy set (access-control, audit-log, backup, BCP, DR, encryption, incident-response, password, data-retention/deletion/breach, DSAR forms, information-officer appointment, vulnerability-disclosure).
**Action:** KEEP. Phase 8 does a legal accuracy + brand-header consistency pass only. Missing from brief: nothing material.

### 2.2 User Documentation
| Master prompt item | State | Notes |
|---|---|---|
| HR Administrator Guide | REBUILD | exists as `manuals/novahr-hr-admin-manual` |
| Employee Guide | REBUILD | `manuals/novahr-employee-manual` |
| Manager Guide | REBUILD | `manuals/novahr-manager-manual` |
| Executive Guide | REBUILD | `manuals/novahr-exco-manual` |
| Payroll Administrator Guide | NEW | overlaps `customer/payroll-setup-guide` |
| System Administrator Guide | NEW | |
| Recruiter Guide | NEW | confirm recruiting module exists first |
| Finance User Guide | NEW | |
| Quick Start Guide | REBUILD | `customer/quick-start-guide` |
| First Payroll Guide | NEW | |
| First Employee Guide | NEW | |
| Mobile User Guide | NEW | confirm mobile/PWA scope |
| Employee Self Service Guide | NEW | |
| Manager Self Service Guide | NEW | |
| Company Setup Guide | REBUILD | `customer/onboarding-guide` |
| Year End Payroll Guide | NEW | SARS tax-year-end (IRP5/EMP501) |
| Termination Guide | NEW | |
| Leave Administration Guide | NEW | |
| Performance Review Guide | NEW | confirm performance module depth |
| Reports Guide | NEW | |
| Documents Guide | NEW | |
| Compliance Guide | REBUILD | overlaps `payroll-compliance/*` + `customer/sars-compliance-calendar` |

### 2.3 Knowledge Base — REBUILD/NEW as structured library
Exists partially as `customer/faq` + `customer/how-to-guides`. The brief wants discrete KB sections (Getting Started, Company Setup, Employees, Payroll, Leave, Reports, Documents, Security, Permissions, Roles, Settings, Billing, Subscriptions, Troubleshooting, Integrations, FAQs, Release Notes, Known Issues). **Action:** design KB information architecture, then author articles in the Help Centre template (2.4).

### 2.4 Help Centre — NEW format
No searchable-article format exists. Define one article template (Purpose / Problem / Solution / Steps / Screenshots / Video / Related) and produce articles from the KB IA. Decide hosting: in-app help route vs. static site.

### 2.5 Internal / Engineering docs
| Item | State | Notes |
|---|---|---|
| Architecture | REBUILD | scattered in `APP_OVERVIEW`, `NOVA_BOS_ARCHITECTURE`, `data-layer`, `tenants` |
| Database | REBUILD | `docs/database.md`, `data-layer.md`, `seed-data.md` |
| API Documentation | NEW | generate from route handlers |
| Deployment Guide | REBUILD | parts in `LAUNCH_RUNBOOK`, `internal/operations-runbook` |
| Infrastructure | NEW | Vercel + Postgres + Sentry topology |
| Security | REBUILD | `docs/security.md` + compliance set |
| Monitoring / Backups / Incident Response / Disaster Recovery | KEEP/REBUILD | policies exist in `compliance/`; add engineering runbooks |
| Coding Standards / UI Standards / Design System | NEW | UI Standards tie to nova-ui (see scaling plan) |
| Brand Guidelines | REBUILD→v2 | Phase 0 |
| Release Process / Testing Standards / QA Process | REBUILD | `TESTING_ROADMAP`, `testing.md`, `release-notes-template` |
| Product Roadmap / Feature Specifications | NEW | |
| Engineering Handbook | NEW | consolidates the above |

### 2.6 Sales Material
| Item | State |
|---|---|
| Sales Deck | REBUILD (`sales/sales-deck-outline` → full designed deck) |
| One Pager | REBUILD (`sales/one-pager`) |
| Brochure | REBUILD (`marketing/NovaHR_Brochure.pdf`) |
| Pricing Guide | REBUILD (`sales/pricing-sheet`) |
| Competitive Comparison | REBUILD (`sales/competitor-and-feature-comparison`, `marketing/competitor-analysis`) |
| ROI Calculator | REBUILD (`sales/roi-calculator`) |
| Proposal Template | REBUILD (`sales/proposal-template`) |
| Quotation Template | REBUILD (`sales/quotation-template`) |
| Demo Script | REBUILD (`sales/demo-checklist` → full script) |
| Sales Script / Discovery Questions / Objection Handling | REBUILD (`sales/discovery-and-sales-scripts`, `objection-handling-guide`) |
| Customer Personas | NEW |
| Value Proposition | NEW (formalise) |
| Case Study Template / Success Story Template | NEW |
| Partner Guide | REBUILD (`marketing/partner-deck`) |
| Reseller Guide / Referral Programme | NEW |

### 2.7 Customer Success
| Item | State |
|---|---|
| Onboarding Checklist / Implementation Guide | REBUILD (`customer-success/implementation-checklist`, `go-live-checklist`) |
| 30 / 60 / 90 Day Success Plans | NEW |
| Training Schedule | REBUILD (`customer-success/training-schedule`) |
| Customer Health Score | REBUILD (`customer-success/customer-health-check-process`) |
| Renewal Process | REBUILD (`customer-success/renewal-process`) |
| Customer Satisfaction Survey | REBUILD (`customer-success/exit-survey` + new CSAT/NPS) |
| Quarterly Business Review Template | REBUILD (`customer-success/monthly-review-template`) |
| Support Escalation Guide | NEW (have `support-contacts`, `support-ticket-guide`) |

### 2.8 Marketing
| Item | State |
|---|---|
| Brand Story / Mission / Vision / Core Values | NEW |
| Product Messaging / Elevator Pitch / Taglines / Value Prop | NEW |
| Website Copy / Landing Pages / SEO Pages | REBUILD (`marketing/website-content-plan` → live copy) |
| Press Kit / Media Kit | NEW |
| Brand Guidelines / Style Guide | REBUILD→v2 |
| Email Newsletter Templates / Email Campaigns | NEW |
| Lead Magnets / Whitepapers / HR+Payroll+Compliance Guides / eBooks / Checklists | REBUILD/NEW (`marketing/lead-magnets/*` exists — 7 checklists) |
| Infographics / Flyers / Roll-up Banners / Business Cards / LinkedIn Banner / Letterhead / Invoice Template / Email Signature / Presentation Template | NEW (graphic artwork — see 1.4) |

### 2.9 Social Media — REBUILD as 6-month library
Exists: `marketing/content-strategy-and-calendar.md` (solo-founder cadence). Expand into a 6-month calendar with post copy across LinkedIn / Facebook / Instagram / TikTok / X / YouTube. See 1.3.

### 2.10 Video Content — REBUILD scripts + storyboards
Exists: `marketing/video-library-plan.md` (production order + outlines). Write full scripts + storyboards for the ad set (15/30/60s), feature walkthroughs, tutorials, launch/brand videos.

### 2.11 Website
The live app is the source of truth. Do a page-by-page review pass: SEO, metadata, accessibility, performance, CTAs, copy, screenshots, trust signals, FAQ, pricing, blog structure. Feeds from Marketing (2.8) copy.

### 2.12 Operations — SOPs
Exists: `internal/operations-runbook.md` (single doc). Break out discrete SOPs: Support, Sales, Marketing, Development, Release, Customer Onboarding, Incident Response, Security, Bug Management, Feature Request, Hiring, Offboarding, plus Meeting / Project / Documentation templates.

---

## 3. Phased execution plan

Sequenced so each phase unblocks the next. Phases 3–7 can run in parallel batches once Phase 0–1 land, and suit fan-out (one asset or asset-family per agent, all inheriting the Phase-0 kit).

### Phase 0 — Foundation (blocks all) 🔴 do first
1. Resolve design-language decision (§1.1) and publish **Brand Guidelines v2** as single source of truth.
2. Build the **asset production kit**: shared HTML/CSS template + design tokens, the standard **document template** (Cover, Revision History, TOC, Purpose, Audience, Prerequisites, Steps, Best Practices, Screenshots, Tips, Warnings, Troubleshooting, FAQs, Related Articles, Support Contact, Footer, Version), and the HTML→PDF render script.
3. **Refresh the screenshot library** from the current production UI via `capture.mjs` (existing shots may be stale after recent changes). Establish the canonical demo tenant + realistic seed data + consistent names.

### Phase 1 — Core user documentation
All items in §2.2 + KB IA (§2.3) + Help Centre template (§2.4). Highest launch value; drives support deflection. Batch by role (Employee, Manager, HR Admin, Payroll Admin, Executive, System Admin) then by task guides (First Employee, First Payroll, Year End, Termination, Leave, Performance, Reports, Documents).

### Phase 2 — Internal / engineering docs
§2.5. Consolidate scattered docs into Architecture, Database, API, Deployment, Infra, Security, Coding/UI Standards, Design System, Release/Testing/QA, Roadmap, Feature Specs → Engineering Handbook.

### Phase 3 — Sales enablement
§2.6. Deck, one-pager, brochure, pricing, competitive comparison, ROI calc, proposal/quotation, scripts, personas, value prop, case-study/success templates, partner/reseller/referral.

### Phase 4 — Customer success
§2.7. Onboarding→implementation→30/60/90 plans→QBR→renewal→health score→CSAT/NPS→escalation.

### Phase 5 — Marketing & brand collateral
§2.8. Brand story/mission/vision/values → messaging/pitch/taglines → website copy/landing/SEO → press+media kit → email templates → lead magnets/whitepapers/eBooks → graphic collateral (mockups + specs per §1.4).

### Phase 6 — Social & video
§2.9 + §2.10. 6-month content library + full video scripts/storyboards. Depends on messaging (Phase 5) and screenshots (Phase 0).

### Phase 7 — Operations SOPs
§2.12. Discrete SOPs + templates.

### Phase 8 — Website review & legal consistency pass
§2.11 + §2.1. Page-by-page website improvements; brand-header + accuracy sweep across the KEEP legal/compliance set.

---

## 4. Definition of done (every asset)

- Follows Brand Guidelines v2 (palette, type, spacing, logo, tone).
- Uses the standard document template where applicable (§Phase 0.2).
- Screenshots are current-production, realistic data, consistent names, sensitive data blurred, no lorem ipsum.
- South African English; no em/en dashes; words spelled out (no "org"); standard acronyms kept.
- Versioned with revision history and support contact/footer.
- Reads as one in-house creative team, not multiple freelancers.

---

## 5. Open decisions
1. ~~Design language~~ — **RESOLVED: Hybrid, indigo UI + gold print/marketing accent.** §1.1.
2. ~~Graphic artwork finishing~~ — **RESOLVED: full HTML/SVG artwork.** §1.4.
3. **Social cadence** — full 6-month execution vs. sustainable library. §1.3.
4. **Help Centre / KB hosting** — in-app route vs. static help site. §2.4.
5. **Module scope confirmation** — recruiting, mobile/PWA, performance depth (affects Recruiter/Mobile/Performance guides).

---

*Version 1.0 — NovaHR Launch Asset Production Plan.*
