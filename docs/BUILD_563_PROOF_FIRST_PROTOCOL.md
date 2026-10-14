# Build #563 — Proof-first protocol realignment

## 1. Trust lifecycle audit (code-aligned)

Machine-readable stage inventory: `lib/protocol/proofFirst/trustBoundaries.ts` (`TRUST_LIFECYCLE_AUDIT`).

| Stage | Abraxas server/DB required? | Retained sensitive evidence for partner verify? | Partner offline-capable today? |
|-------|----------------------------|-----------------------------------------------|--------------------------------|
| EVM/Solana wallet auth | Yes (nonce + session) | No | No |
| Credential issuance | Yes (sovereign path: Postgres) | No for receipt path | No |
| Document/biometric capture | Yes when enabled | **Yes (encrypted custody)** | No |
| Policy evaluation | Yes | No | No (RP verifies **signed outcome**) |
| Decision receipt signing | Issuer | No | **Yes** (Ed25519 + key registry) |
| Independent partner verification | **No** (Build #546 + #563 slice) | **No** | **Yes** with signed record + RP replay store + revocation feed |
| Revocation freshness | Optional Abraxas/chain feed | No | Requires **authenticated** revocation source (fail-closed if missing) |
| Replay protection | **RP-controlled** store | No | Yes |

**Architecture defects (current main):**

1. **Eligibility presentation HTTP API** (`lib/eligibilityPresentation/verify.ts`) still loads presentations from Abraxas storage and refetches receipts — not independent.
2. **Wallet authentication** remains server-nonce + database replay tables — genuine security requirement for interactive login, not replaceable by receipt verification alone.
3. **Encrypted evidence custody** (`abraxas_evidence_custody`) can outlive credential issuance — convenience, not required for RP verification when claims are on signed receipts.
4. **Category D paths** (Supabase PostgREST, Veriff) still exist for legacy/demo; sovereign core must stay on `postgres_direct` without D in core (#561 audit).

## 2. Minimum-custody target architecture

| Role | Responsibility |
|------|----------------|
| **Holder** | Stores `HolderPolicyScopedPresentation` (signed decision receipt + disclosed claim refs only). |
| **Issuer** | Validates evidence when needed; signs verifiable credentials/receipts; publishes verification keys. |
| **Abraxas protocol** | Formats, policy binding rules, receipt schema, registry packaging — not live verification for independent RPs. |
| **Relying party** | `verifyHolderPresentationAtRelyingParty` — crypto + policy + audience + RP replay + revocation feed. |
| **Blockchain (optional)** | Issuer registry / revocation commitments — offline vectors exist; live RPC not required for crypto proof. |

Raw documents/biometrics are **processing inputs**, not partner verification inputs. Assurance flows through **issuer-signed claim refs** on the receipt.

## 3. Evidence custody boundaries (declarative)

See `lib/protocol/proofFirst/evidenceCustodyBoundary.ts`. **No automated deletion** in this build; boundaries define what must not gate partner verification.

## 4. Independent partner verification

Entry point: `verifyHolderPresentationAtRelyingParty` in `lib/protocol/proofFirst/proofFirstRelyingParty.ts`.

**Offline-capable checks:** payload hash, Ed25519 signature, verification key registry, policy/partner binding, audience, artifact schema, expiry window, chain conformance vectors.

**Live authority required:** current revocation status (explicit `revocationSource` — otherwise **BLOCKED**), optional chain observation RPC.

**Outcomes:** `granted` | `denied` | `blocked` — never infer authorization from signature alone.

## 5. Blockchain-native capabilities (review)

Existing: on-chain verifier conformance vectors (`lib/partner/onchainVerifierConformance`), Solana trust registry governance harness. **No new contracts** in #563. No PII on-chain.

## 6. Vertical slice implemented

**Issuer → holder → policy-scoped presentation → independent RP** (synthetic credentials):

- `composeHolderPolicyScopedPresentation`
- `verifyHolderPresentationAtRelyingParty`
- Tests: `npm run test:proof-first-563` (12 cases, isolated, labeled synthetic)

## 7. Security tests (synthetic)

Forged signatures, unknown/rotated keys, substitution, audience/policy mismatch, expiry, revocation, missing revocation feed (blocked), RP replay, correlation surface on `partner_visible`.

## 8. Remaining centralized dependencies

- Interactive wallet auth and session cookies
- Eligibility presentation server store + receipt refetch path
- Policy evaluation engine (partners verify **signed decisions**, not full engine offline)
- Optional encrypted evidence retention until operator policy deletes
- Live revocation feeds when partners require current validity

## 9. Next technical milestone

Wire **portable revocation feed** packaging (registry + signed revocation list) so RPs fail-closed with offline-stale bounds without Abraxas HTTP — building on existing receipt key lifecycle and #546 verifier.
