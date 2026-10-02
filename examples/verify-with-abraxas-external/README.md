# Verify with Abraxas — external fixture

Self-contained example for relying applications **outside** the Abraxas monorepo mental model.

## Allowed dependencies

- Public `AbraxasPartnerKit` (`lib/partner/integrationKit` in this repo; source-level, not npm)
- Public Abraxas HTTP APIs (`/partner/verify`, `/api/v1/partner-handoff`, `/api/receipts/{id}/public`, `/api/receipts/{id}/narrow-result`)
- Sandbox credentials in server environment variables
- Ordinary framework/runtime primitives

## Flow

1. Configure partner id, policy id, application id, callback URL, sandbox API key (server only).
2. `startExternalVerification` → `{ request_id, verification_url }`.
3. Redirect holder to `verification_url` (or render `VerifyWithAbraxas` with that URL).
4. On callback, `finishExternalVerification` verifies receipt + narrow result server-side.
5. Partner-owned idempotency guard ensures the protected native action runs once.

See `/docs/VERIFY_WITH_ABRAXAS_QUICKSTART.md` for the canonical quickstart.
