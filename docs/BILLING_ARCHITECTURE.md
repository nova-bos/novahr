# NovaHR Billing Architecture

## Pricing Formula

```
Monthly Total = R349 + (Active Members x R30)
```

- Platform fee: R349 per month
- Member fee: R30 per active member per month
- Enterprise threshold: 150+ active members. Contact sales for custom pricing.

## Active Member Definition

A member is any individual onboarded into NovaHR: employees, directors, partners, contractors, or any other person whose records are managed in the system. A member counts toward billing if their status is active (not terminated) on the billing date.

## Snapshot Model

The subscription amount is calculated once on each renewal date using a snapshot of active members at that moment. Changes to member count during the billing cycle do not affect the current invoice. There is no prorating or mid-cycle adjustment.

## Database Plan Values

The `TenantPlan` enum has three active values:

- `trial`: 14-day free trial period. Members do not count toward billing during trial.
- `subscribed`: Active paying subscription.
- `enterprise`: 150+ active members. Billing is handled via custom arrangement.

Old enum values (`hr`, `hr_payroll`, `starter`, `growth`, `scale`) remain in the PostgreSQL enum type but are no longer used. All existing rows have been migrated to `subscribed`.

## Feature Access

Every paying customer receives the complete NovaHR platform. No features are gated behind plan level or member count. Trial users also have full feature access during the trial period.

## Paystack Integration (Current State)

The automated monthly charge flow is not yet implemented. Billing is currently activated manually:

- Trial users see a disabled "Billing activation coming soon" button.
- To activate, customers email sales@novabos.co.za.
- Existing subscribers who went through the previous Paystack subscription flow continue to see their subscription as active and can manage it via the Paystack portal.
- Webhook and callback routes remain intact to handle existing subscriptions.

## Phase 2: Automated Billing (Future)

The per-member model requires a charge-per-renewal approach rather than fixed Paystack subscription plans. The planned implementation:

1. On account activation, capture a card authorisation code via Paystack.
2. Store the authorisation code against the tenant.
3. A scheduled job runs on each tenant's renewal date, counts active members, calculates the invoice, and charges the stored card.
4. Failed charges trigger a retry flow and in-app notification.

## Enterprise

Organisations with 150 or more active members are classified as Enterprise. The billing page directs them to contact sales@novabos.co.za for custom pricing. Enterprise customers receive the same product features as standard customers.
