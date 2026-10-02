# Verify with Abraxas — external fixture

Self-contained example for relying applications deployed to **multi-instance serverless** (Vercel, containers, etc.).

## Durability model

1. **Start (any instance):** `createVerificationRequest()` → durable Abraxas `vr_*` handoff + persist `request_id` in `partnerRequestStore` (replace with Postgres/Redis/KV).
2. **Callback (any instance):** load `request_id` from durable storage → `verifyCallbackWithNarrowResult()`.
3. **Protected action:** `protectedActionStore` models durable idempotency (replace with atomic DB operation).

The injectable stores in this fixture **simulate** durable databases for tests. Do not use module-level singleton Maps in production.

## Allowed dependencies

- Public `AbraxasPartnerKit` (`lib/partner/integrationKit`)
- Public Abraxas HTTP APIs
- Sandbox credentials in server environment variables

See `/docs/VERIFY_WITH_ABRAXAS_QUICKSTART.md`.
