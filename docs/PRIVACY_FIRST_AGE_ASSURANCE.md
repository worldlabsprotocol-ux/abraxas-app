# Privacy-First Age Assurance

This document describes Abraxas's provider-neutral, privacy-first age-assurance architecture for partner flows (including Good Trouble retail age-gating).

## Authentication versus age assurance

| Concept | What it proves | What it does **not** prove |
|--------|----------------|----------------------------|
| **Authentication** (Google zkLogin) | Account control for the Abraxas holder | Age, eligibility, or policy satisfaction |
| **Age assurance** | Authoritative age-band or eligibility outcome | Identity beyond what the policy requires |

Copy shown to holders:

- *Signing in confirms your account. It does not verify your age.*
- *Good Trouble receives only the eligibility result, not your birth date or evidence.*
- *Upload an ID only if another private verification method is unavailable.*
- *The merchant may still require identification at purchase or delivery.*

## Why social login is not age proof

Ordinary Google, LinkedIn, and Facebook OAuth **must never** issue:

- `age_verified`
- `over_18`
- `over_21`
- `product_eligibility`

Social signals (`SocialAccountSignal`) may be recorded only as **non-authoritative risk hints** (email verified, account longevity, claimed birthday presence). They are rejected by `lib/assurance/ageProviders/socialSignalPolicy.ts`.

Google remains the canonical Abraxas authentication method. This architecture does **not** request additional Google scopes for DOB or profile age data. Future Google age-assurance integrations must use a **separate adapter** with cryptographically/server-verified results—not ordinary OAuth identity claims.

## Provider trust requirements

An age-assurance provider may satisfy policy only when:

1. Backend adapter implements `AgeAssuranceProvider` (`lib/assurance/ageProviders/types.ts`)
2. Server-only environment configuration is present (`isConfigured() === true`)
3. Callback/webhook is verified server-side (never trust frontend approval status)
4. Session is bound to subject, partner, policy, and requested threshold
5. Callback replay is prevented (`callback_consumed_at`, unique provider session index)
6. Result is unambiguous (`over_21` / `over_18` for the requested threshold)
7. Unconfigured, unavailable, expired, ambiguous, or invalid results **fail closed**

## Supported and unavailable methods

### Holder method order (partner continue flow)

1. **Use my existing Abraxas age proof** — re-evaluate active credential; issue fresh partner-bound receipt; no recollection
2. **Verify privately without uploading ID** — configured privacy-preserving providers only
3. **Verify another way** — document/selfie fallback (clearly labeled; retention explained before collection)
4. **Use the traditional partner option** — return to partner without Abraxas verification

### Provider registry (stub adapters until vendor credentials configured)

| Provider ID | Display name | Env enable | Env secret |
|-------------|--------------|------------|------------|
| `digital_wallet_age` | Digital wallet age proof | `AGE_ASSURANCE_DIGITAL_WALLET_ENABLED` | `AGE_ASSURANCE_DIGITAL_WALLET_API_KEY` |
| `verified_email_age` | Verified email age assurance | `AGE_ASSURANCE_VERIFIED_EMAIL_ENABLED` | `AGE_ASSURANCE_VERIFIED_EMAIL_API_KEY` |
| `payment_card_age` | Payment card age assurance | `AGE_ASSURANCE_PAYMENT_CARD_ENABLED` | `AGE_ASSURANCE_PAYMENT_CARD_API_KEY` |

When no provider credentials exist, the UI shows **provider unavailable** and document fallback remains operational.

## Data collected per method

| Method | Collected | Not collected |
|--------|-----------|---------------|
| Existing credential reuse | Policy evaluation metadata, receipt nonce | New evidence |
| Privacy-preserving provider | Session nonce, provider ID, age-band result, evidence ref hash | DOB, raw provider payload |
| Document fallback | Existing temporary evidence system (PR #257/#258) | Permanent raw ID storage beyond retention policy |
| Social OAuth | Authentication subject (existing) | Birthday, profile age, OAuth tokens for age |

## Data retained and deleted

`age_assurance_sessions` (migration 080) stores only:

- Internal session ID, pseudonymous subject reference
- Provider ID, partner/policy binding, requested threshold
- Status, evidence reference hash, age-band result, assurance level
- Issued/expiry timestamps, callback consumption timestamp

Does **not** store: LinkedIn/Facebook profile data, social birthdays, exact DOB (unless fallback review requires it in existing systems), raw OAuth tokens, raw provider callback payloads, ID images outside the temporary evidence system.

Raw fallback evidence purge follows PR #258 (`RAW_IDENTITY_EVIDENCE_RETENTION_DAYS`); minimized audit records and reusable credentials are preserved.

## Credential reuse

`POST /api/age-assurance/reuse`:

1. Requires authenticated browser session
2. Validates return URL allowlist
3. Re-evaluates credential against current published policy
4. Issues new signed partner-bound receipt (policy ID/version, decision, timestamps, nonce)
5. Excludes DOB, images, OAuth identifiers, provider payloads

## Partner receipt contents

Partners receive **minimum policy result** only:

- `decision`, `over_21` (when policy requires `product_eligibility`)
- `receipt_id`, `receipt_expires_at`, `policy_id`, `partner_id`
- `assurance_level`, `reason_codes`

Never: DOB, ID images, social profile, OAuth subject, provider payload.

## Transaction-time merchant obligations

Reusable Abraxas eligibility does **not** replace merchant/delivery identification obligations. Copy and assurance boundary summaries reflect `transaction_time_merchant_obligation` as outstanding.

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/age-assurance/providers` | GET | Safe provider metadata + existing proof eligibility |
| `/api/age-assurance/session` | POST | Create provider session (CSRF via session auth + nonce) |
| `/api/age-assurance/callback/[provider]` | GET/POST | Server-side provider verification |
| `/api/age-assurance/reuse` | POST | Reuse existing credential → fresh receipt |

All routes: authenticated session, return-URL allowlist, rate limiting (partner-flow buckets), structured error codes, no PII in logs.

## Provider onboarding checklist

- [ ] Vendor contract and legal sufficiency review
- [ ] Adapter implements `AgeAssuranceProvider`
- [ ] Server-only API keys in deployment secrets
- [ ] Callback signature verification implemented (replace stub)
- [ ] Staging E2E with simulated and live vendor sandbox
- [ ] Operator enables `AGE_ASSURANCE_*_ENABLED` in production
- [ ] Migration 080 applied before app deployment
- [ ] Monitoring for `provider_not_configured` / `fail_closed` rates

## Operator / counsel decisions before production

- Legal sufficiency of each privacy-preserving method per jurisdiction
- Retention and deletion schedules for any vendor-held data
- Whether payment-card or email-based age assurance meets Good Trouble policy
- Production enablement order (migration → secrets → adapter → UI)

## Deployment and rollback order

1. Apply migration `080_age_assurance_sessions.sql` (additive, RLS, service-role only)
2. Deploy application with providers **disabled** (default)
3. Configure vendor credentials in server environment
4. Enable one provider at a time in staging; run manual E2E
5. Enable in production after sign-off

**Rollback:** Disable `AGE_ASSURANCE_*_ENABLED` flags (immediate fail-closed). Document fallback remains. Migration 080 is additive—rollback does not require dropping the table.

## Manual E2E script

1. Start partner flow from Good Trouble sandbox → Abraxas `/partner/verify`
2. Sign in with Google → confirm copy: *Signing in confirms your account. It does not verify your age.*
3. On `/partner/continue`, confirm method order: existing proof → private methods → ID fallback → traditional return
4. With no providers configured, confirm private section shows unavailable
5. Select **Verify another way** → confirm fallback labeling and retention copy
6. Complete document capture → admin review (if applicable) → return to partner with receipt
7. Repeat visit with active credential → **Use my existing Abraxas age proof** → fresh receipt without recollection
8. Confirm partner receipt has `over_21: true` but no DOB/images
9. Confirm merchant obligation copy is visible

## PR dependencies

- **PR #257** — age evidence ledger, fail-closed linkage
- **PR #258** — identity review queue, raw evidence purge (this branch includes #258 commits; rebase onto `main` after #258 merges)

## Remaining production / vendor / legal blockers

- No live privacy-preserving vendor integrations configured (stubs only)
- Migration 080 not applied to staging/production databases
- Vendor contracts and jurisdiction legal review outstanding
- Callback signature verification is stub-level until vendor adapters ship
- Authenticated preview screenshots require staging deployment
