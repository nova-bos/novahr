# NovaHR Legal and Policy Document Map

**Purpose:** which document applies in which situation, how they fit together, and their current state. The full register with owners and priorities: `docs/BUSINESS_DOCUMENT_REGISTER.md`.

---

## The Stack (how documents relate)

```
Self-serve customer (in-app acceptance at onboarding):
  Terms of Service
    incorporates: Acceptable Use Policy, SLA, Support Policy,
                  Refund and Cancellation Policy, Subscription and Payment Terms
    + Data Processing Agreement (POPIA: mandatory for every customer)
    + Privacy Policy (acknowledged) and Cookie Policy (site-wide)
    + Compliance Disclaimer (acknowledged before first payroll run)

Enterprise / negotiated customer (signed PDFs):
  Master Subscription Agreement + Order Form
    schedules: SLA, DPA, AUP, Support Policy
  (MSA supersedes ToS for that customer; keep both aligned when editing)
```

**Note on names:** the "Customer Agreement" is the MSA; the "Software License Agreement" is the licence grant inside ToS clause 3 / MSA clause 2 (SaaS is licensed by subscription, not by a separate perpetual licence document). The "Confidentiality Agreement" exists in two forms: mutual and one-way NDA.

## Which Document, When

| Situation | Document(s) |
|---|---|
| Anyone signs up (trial or paid) | ToS + DPA acceptance in-app; Privacy Policy acknowledged |
| First payroll run | Compliance Disclaimer acknowledgement |
| Enterprise deal / procurement | MSA + Order Form + schedules, countersigned |
| Prospect wants a demo of unreleased features or security detail | One-way NDA |
| Investor, partner, contractor conversations | Mutual NDA |
| Customer asks "what if you miss uptime" | SLA (credits, claim process) |
| Customer cancels | Refund and Cancellation Policy; then Offboarding Checklist (customer-success) |
| Security researcher reports a bug | Vulnerability Disclosure Policy (compliance folder) |
| Data subject wants access/correction/deletion | PAIA Manual + DSAR forms (compliance folder) |
| Regulator, auditor, or due-diligence questionnaire | POPIA Compliance Statement + policy suite (compliance folder) |

## In-App Integration Plan

1. **Onboarding acceptance flow:** first login of an account owner requires ticking ToS + DPA (single screen, two checkboxes, links to full texts), recorded with user, tenant, version, timestamp, IP (see User Consent Policy section 3);
2. **Payroll gate:** first payroll run blocked behind the Compliance Disclaimer acknowledgement;
3. **Footer links (marketing site + app):** Terms, Privacy, Cookies, PAIA Manual, Security;
4. **Re-acceptance:** material version changes prompt on next login;
5. **`/legal` hub page** lists all public documents with version and date.

## Status and Review State

| Document | File | Legal review needed | Status |
|---|---|---|---|
| Terms of Service | `terms-of-service.md` | **Yes, before publication** | Draft complete |
| Master Subscription Agreement | `master-subscription-agreement.md` | **Yes, before first use** | Draft complete |
| Data Processing Agreement | `data-processing-agreement.md` | **Yes (POPIA ss 20-21)** | Draft complete |
| Acceptable Use Policy | `acceptable-use-policy.md` | Yes (light) | Draft complete |
| Service Level Agreement | `service-level-agreement.md` | Yes (light) | Draft complete |
| NDA (mutual, one-way) | `nda-mutual.md`, `nda-one-way.md` | Yes (light) | Drafts complete |
| Support Policy | `support-policy.md` | No | Complete |
| Refund and Cancellation Policy | `refund-and-cancellation-policy.md` | Yes (CPA angles) | Draft complete |
| Subscription and Payment Terms | `subscription-and-payment-terms.md` | Yes (light) | Draft complete |

**Before any customer relies on these:** fill every `[●]` placeholder (company legal name, registration number, addresses, jurisdiction choice), then attorney review of the items marked above, then publish and wire the acceptance flow.

## Placeholder Conventions

`[●]` marks founder input required. Grep for outstanding items:

```
grep -rn "\[●\]" docs/legal docs/compliance docs/payroll-compliance
```
