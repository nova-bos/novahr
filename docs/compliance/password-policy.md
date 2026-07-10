# NovaHR Password Policy

**Version:** 1.0
**Effective Date:** 10 July 2026
**Owner:** Engineering
**Review cycle:** Annual

Applies to (A) user accounts on the NovaHR platform and (B) NovaHR internal/administrative accounts. Aligned with NIST SP 800-63B guidance.

---

## A. Platform User Accounts (customers and their employees)

1. **Minimum length:** 10 characters (12 recommended). No maximum below 64 characters.
2. **Composition:** length over complexity; no forced special-character rules. Passwords are checked against a breached-password list where supported.
3. **No forced periodic expiry.** Passwords are changed on evidence or suspicion of compromise, not on a timer.
4. **Storage:** salted adaptive hashing via Supabase Auth (bcrypt). Plaintext passwords are never logged, stored, or emailed.
5. **Reset:** self-service reset via time-limited, single-use email link. Support staff can trigger a reset email but can never see or set a user's password.
6. **Rate limiting and lockout:** repeated failed logins are throttled (Supabase Auth rate limits). Suspicious activity is logged.
7. **Sessions:** tokens are httpOnly and expire per Supabase Auth defaults; logout revokes the session.
8. **Invitations:** invited users set their own password via a single-use invite link; temporary shared passwords are prohibited.

## B. NovaHR Internal and Administrative Accounts

Accounts with access to production infrastructure (Supabase dashboard, Vercel, GitHub, Resend, domain registrar, business email):

1. **Unique, randomly generated passwords** of at least 16 characters, stored only in an approved password manager.
2. **Multi-factor authentication is mandatory** on every account that supports it. TOTP or hardware keys preferred over SMS.
3. No credential sharing between individuals; service accounts are documented in the secrets register with an owner.
4. Access is revoked within 24 hours when a person no longer requires it (see Access Control Policy).
5. Recovery codes are stored in the password manager, separate from the primary factor.

## C. Prohibited

- Reusing passwords across systems;
- Storing passwords in code, plain files, tickets, or chat;
- Emailing or messaging passwords; use the password manager's sharing feature if transfer is unavoidable;
- Default or vendor-supplied passwords left unchanged.

## D. Enforcement

Violations are handled under the Access Control Policy and, for personnel, under employment or contractor agreements. Suspected credential compromise triggers the Data Breach Response Policy.
