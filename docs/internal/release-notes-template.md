# Release Notes Template and Process

**Owner:** Engineering/Founder
**Audience:** customers (published) and internal history.
**Cadence:** published for every customer-visible change; batched fortnightly for minor items. March SARS updates always get a dedicated note.

---

## Process

1. Source: git history since the last note (`git log --oneline <last-tag>..HEAD`);
2. Translate commits into customer language: what changed *for them*, never internal refactors;
3. Classify: New / Improved / Fixed / Action required;
4. Publish to [changelog page / knowledge base ●] and include highlights in the monthly newsletter;
5. **Action-required items** (rare: settings to review, behaviour changes affecting payroll) additionally go by direct email to HR admins;
6. Tag the release in git; append to `docs/internal/version-history.md` [create on first release].

## Template

---

# NovaHR Release Notes: [Month Year] ([version/date])

## New

- **[Feature name].** [One sentence: what it does and where to find it.] [Screenshot if visual.]

## Improved

- [What got better, in outcome terms: "Payslip PDFs generate about twice as fast."]

## Fixed

- [Plain description: "Leave balances now display correctly for employees who joined mid-cycle." No blame, no internals.]

## Action Required

> [Only when true. What to check, by when, and what happens if not. Example: "New tax year tables apply from your first March payroll run. Verify one payslip against the prior month before publishing."]

## Coming Up

[Optional, one or two roadmap teasers already committed.]

Questions? hello@novahr.co.za

---

## Rules

- Payroll-affecting changes are never released silently: note + direct email + release outside the month-end freeze;
- Every note dated; archive stays public (trust signal);
- Write for the HR admin persona: no stack traces, branch names, or acronyms;
- If a release fixes an incident, the note links the post-incident summary where one was sent.
