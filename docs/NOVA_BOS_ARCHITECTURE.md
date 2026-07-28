# Nova Business OS — Platform Architecture

This document is the source of truth for the Nova Business OS platform architecture. Unless explicitly instructed otherwise, always follow this structure when building new features.

## Overview

Nova Business OS is the parent SaaS platform containing multiple integrated business applications.

**Current products:**
- NovaHR
- NovaBooks
- NovaCRM
- NovaPOS
- NovaLend
- NovaPilot (AI)

The system is designed so new products can be added as modules without changing the underlying architecture.

---

## Domain Structure

**Primary domain:** `https://novabos.co.za`

Marketing pages use URL paths, not separate subdomains.

### Marketing routes

| Route | Purpose |
|-------|---------|
| `/` | Home |
| `/pricing` | Pricing |
| `/about` | About Us |
| `/contact` | Contact |
| `/blog` | Blog |
| `/careers` | Careers |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Service |
| `/security` | Security |
| `/status` | System Status |
| `/docs` | Documentation |
| `/api` | Developer API documentation |
| `/help` | Knowledge Base |
| `/download` | Desktop and Mobile Downloads |
| `/login` | Unified Login |
| `/signup` | Create Account |
| `/dashboard` | User Dashboard |
| `/settings` | Account Settings |

### Product routes

Each product lives under the main domain:

| Path | Product |
|------|---------|
| `/hr` | NovaHR |
| `/books` | NovaBooks |
| `/crm` | NovaCRM |
| `/pos` | NovaPOS |
| `/lend` | NovaLend |
| `/pilot` | NovaPilot |

After login, products are also accessible via:

```
app.novabos.co.za/hr
app.novabos.co.za/books
app.novabos.co.za/crm
app.novabos.co.za/pos
app.novabos.co.za/lend
app.novabos.co.za/pilot
```

All products share authentication. Users switch between products without logging in again.

### Subdomains

| Subdomain | Purpose |
|-----------|---------|
| `app.novabos.co.za` | Main authenticated application |
| `api.novabos.co.za` | Public API, internal API, webhooks |
| `docs.novabos.co.za` | Documentation, API reference, SDK docs |
| `status.novabos.co.za` | System status, incident reports |
| `help.novabos.co.za` | Knowledge base, support articles, FAQs |
| `admin.novabos.co.za` | Internal administration portal, super admin |

---

## Infrastructure

| Layer | Provider |
|-------|---------|
| Domain and DNS | Hostinger |
| Business email | Titan Mail via Hostinger |
| Frontend | Vercel |
| Backend | Supabase |
| Transactional email | Resend |
| Payroll | Netcash |
| Source control | GitHub |

**Supabase responsibilities:** PostgreSQL, Authentication, Storage, Edge Functions, Row Level Security, Realtime.

---

## Email Structure

**Primary mailbox:** `admin@novabos.co.za`

**Aliases:**

| Address | Purpose |
|---------|---------|
| `support@novabos.co.za` | Customer support, SLA claims, help requests |
| `sales@novabos.co.za` | Plan upgrades, new business, trial conversions |
| `billing@novabos.co.za` | Invoices, cancellations, billing queries |
| `no-reply@novabos.co.za` | Transactional system emails (FROM address) |
| `notifications@novabos.co.za` | Automated notification emails |
| `wandile@novabos.co.za` | Founder (Wandile Mtshwene) |
| `dumo@novabos.co.za` | Partner |
| `tony@novabos.co.za` | Partner |

Titan aliases forward to `admin@novabos.co.za` to minimise mailbox costs while preserving professional sender addresses.

---

## Design Principles

- **One unified platform.** Do NOT create separate standalone websites for NovaHR, NovaBooks, NovaCRM, NovaPOS or NovaLend. Everything should feel like one integrated platform.

- **Shared across all products:** authentication, navigation, design system, branding, user management, billing, notifications, permissions.

- **Products as modules**, not independent apps.

- **No hardcoded product references.** Avoid hardcoded references to NovaHR where generic product logic can be used.

- **Always reusable.** Favour reusable components, shared services and modular architecture.

- **Design for expansion.** New products should be registerable by adding a module without changing the underlying architecture.

---

## Current State (2026-07-27)

NovaHR is the first live product. It currently runs as a standalone Next.js app at `novahr-five.vercel.app` and will migrate to `app.novabos.co.za/hr` (or a transitional subdomain) as part of the Nova Business OS migration.

The migration sequence:
1. GitHub org: `novabos-hq` (create, transfer repos)
2. Supabase: company org and project
3. Vercel: company team, link to GitHub org
4. DNS: point `novabos.co.za` and subdomains
5. Resend: verify `novabos.co.za` domain
6. Gradual route migration: NovaHR moves from standalone to `/hr` module as the platform shell is built
