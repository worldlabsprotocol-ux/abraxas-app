# Build 897 — Product acceptance recovery

## Root cause (Create my test app)

Production failures surfaced as a generic `launchpad_provision_failed` message because:

1. **Global idempotency keys** — the browser sent `studio-{pack}-{applicationName}` without tenant scope. A prior visitor’s provision could block later visitors with the same pack and name (`invalid_input` / failed replay semantics).
2. **Global `public_slug` collisions** — slugs were derived from the application name only (e.g. `test`). The atomic RPC returns `conflict` on unique violations; sovereign/direct paths often collapsed to `provision_failed` without a precise UI mapping.
3. **Error mapping** — `IntegrationStudioClient` replaced every `launchpad_provision_failed` with a speculative multi-cause paragraph instead of the authoritative server `error` string.

## Fixes

- Scope idempotency to the browser sandbox nonce: `studio-{sandboxId}-{pack}-{name}`.
- Derive `public_slug` per tenant via `resolveLaunchpadPublicSlug(applicationName, partnerId)`.
- Return actionable `error` copy from `createStudioSandbox` (callback, conflict, rate limit, provision failure).
- Default callback on HTTPS origins to `{origin}/partner/callback` (allowlisted same-site exploration).
- Homepage embed: hide Launchpad session / API key panel, trim copy, advance to **Run test** stage on success without leaving `/`.

## Verification

- Unit: `integrationStudioCreate.test.ts`, `slug.test.ts`, `studioDefaultCallbackUrl.test.ts`, `integrationStudioSandboxStage.test.ts`
- Staging Playwright: `tests/staging/build-897-product-acceptance.spec.ts`

## Founder checkpoint

Do not claim 9/10 until Preview/Production walkthrough shows successful create + inline test on one document.
