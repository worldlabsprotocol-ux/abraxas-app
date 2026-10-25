# Security responsibilities

## Partner (relying application)

- Protect sandbox/production API keys server-side only.
- Allowlist and validate callback URLs on **your** router; correlate `request_id` / `receipt_id` with server-stored state.
- Install and rotate trust anchors via your change control; maintain checkpoint backups.
- Enforce permit / deny / indeterminate in **your** access layer — Abraxas does not gate your product.
- Implement idempotency for protected actions (duplicate callbacks).
- Scope policies narrowly (wallet control, age gate) for pilot.

## Abraxas (protocol operator)

- Issue signed decision receipts and signed status under published issuer authority.
- Operate hosted holder authorization UI and sandbox/production issuance APIs.
- Distribute trust anchor material and export configuration for each environment.
- Maintain independent verifier contract and Partner Kit semantics.

## Out of scope for pilot partners

- Operating Abraxas PostgreSQL, Supabase, or issuer signing infrastructure.
- Managing holder passport documents or Google OAuth as eligibility proof.
- Production key rotation or billing activation (founder-controlled).

## Shared

- Joint review of pilot receipt samples, failure logs (redacted), and checkpoint recovery drill before Production promotion.
