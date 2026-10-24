# Build #821 — Integration-first protocol independence

**Baseline:** Build #820 merged · **No Production changes** · **No new infrastructure**

## Founder correction

Abraxas is integrated into partner applications; partners do not operate Abraxas databases to **verify** portable trust. Issuance and fresh status still require Abraxas-operated authority — stated explicitly below.

## Simplest integration paths (audited)

| Path | When to use | Verification dependency |
|------|-------------|-------------------------|
| **Portable verify (recommended for RP)** | Gate actions on signed receipt + SIAS + signed status | `@abraxas/independent-verifier` only |
| **Hosted handoff + PartnerKit** | Wallet-native holder journey, sandbox/production issuance | Abraxas HTTP APIs for steps 1–3; verify still offline-capable |
| **Institutional SDK tarball** | Legacy institutional receipt model | `@abraxas/institutional-verification` (separate contract) |

Build #821 strengthens the **portable verify** path: `examples/integration-first-relying-party/`.

## Measured integration surface (Build #821)

| Metric | Value |
|--------|--------|
| Steps to **verify** after artifacts are in hand | **4** inputs (anchor, SIAS, receipt, signed status) + RP scope env |
| NPM packages for independent verify | **1** (`@abraxas/independent-verifier`; in-repo path alias today) |
| Runtime services for verify | **0** Abraxas backend calls |
| Lines integrator copies (example) | `relyingParty.ts` (~70 LOC) |
| Reproducible tests | `integration-first.test.ts` (5 cases) |
| Issuance still requires | Hosted flow / sovereign issuer + status signer |

## Protocol principles (selected)

| Principle | Abraxas today |
|-----------|----------------|
| Small integration surface | PartnerKit + standalone verifier; #821 documents 7-step split |
| Portable signed results | Ed25519 decision receipts |
| Open verification | `@abraxas/independent-verifier` + JSON artifact types |
| Explicit authorization | Wallet step on hosted path; RP audience binding on verify |
| Independent signature verify | Yes — no Supabase on verify path |
| Cryptographic issuer trust | SIAS + pinned anchor |
| Status freshness | Signed status statements + TTL + optional `minimumStatusVersion` |
| Minimal ops burden for RP | Verify entirely in partner process |

## Security results (synthetic)

Automated in `integration-first.test.ts`:

- Happy path PASS  
- Wrong audience FAIL (`audience_mismatch`)  
- Revoked status FAIL  
- Stale replay FAIL (`status_version_rollback_rejected`)  

Package-level adversarial suites remain in `packages/abraxas-independent-verifier/`.

## Explicit boundaries

- No paid infrastructure provisioned  
- No Production cutover  
- Synthetic fixtures labeled `not_for_production`  
- Staging attestation (#820 external tier) remains a separate operational gate, not a protocol requirement for partners  

## Next integrator actions

1. Pin trust anchor from security review.  
2. Integrate hosted handoff for issuance (quickstart) **or** consume pre-delivered artifacts in air-gapped verify.  
3. Copy `verifyPortableDecision` pattern; store `minimumStatusVersion` when you observe revocations.
