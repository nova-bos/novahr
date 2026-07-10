# NovaHR Encryption Policy

**Version:** 1.0
**Effective Date:** [●]
**Owner:** Engineering
**Review cycle:** Annual

Defines mandatory encryption standards for all NovaHR systems and data, supporting POPIA section 19 safeguards.

---

## 1. Data in Transit

- All external traffic uses **TLS 1.2 or higher** (TLS 1.3 preferred). Plain HTTP is redirected to HTTPS; HSTS is enabled.
- Application-to-database connections (Vercel to Supabase Postgres) use TLS.
- Outbound integrations (Resend API, Supabase APIs) use HTTPS only.
- No personal information may ever be transmitted over unencrypted channels, including internal tooling.

## 2. Data at Rest

- Production database: encrypted at rest by the platform (Supabase on AES-256 encrypted volumes).
- File storage (payslip PDFs, uploads): encrypted at rest (AES-256).
- Backups: encrypted at rest with the same standard.
- Credentials: passwords are never stored in plaintext; Supabase Auth stores salted, hashed credentials (bcrypt).

## 3. Secrets and Keys

- Application secrets (database URLs, Supabase service role key, Resend API key) live only in the platform secret store (Vercel environment variables). Never in source code, never committed to git, never in client-side code.
- The Supabase **service role key** is server-only. Any exposure of it is a P1 incident (see Data Breach Response Policy).
- Rotation: all production secrets are rotated at least annually, immediately on personnel change with access, and immediately on suspected exposure. Rotation dates are recorded in the secrets register.
- Local development uses separate keys against non-production projects; production keys must never be used locally.

## 4. Devices and Endpoints

- Any laptop or device with access to production systems must have full-disk encryption enabled (FileVault / BitLocker) and a lock screen.
- Customer data exports on local machines are prohibited beyond immediate need and must be deleted after use.

## 5. Prohibited Practices

- Sending customer personal information (ID numbers, bank details, payslips) over email, WhatsApp, or chat in plaintext for support purposes; use redacted screenshots or in-app references.
- Custom or homemade cryptography; use platform-provided, industry-standard primitives only.
- Disabling TLS verification in any environment that touches real data.

## 6. Exceptions

Only Engineering leadership may approve documented, time-boxed exceptions, recorded with compensating controls.
