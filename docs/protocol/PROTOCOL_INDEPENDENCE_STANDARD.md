# Abraxas — Permanent protocol independence standard

Founder architecture directive. Applies to every future build.

## Objective

Abraxas is an independent, wallet-native, privacy-minimizing trust and verification protocol. The long-term goal is authoritative, independently verifiable off-chain trust decisions for institutions, applications, and agents — not conventional SaaS with a database attached.

Design the protocol first. Choose infrastructure only after proving necessity.

## Core rules

1. **Design from target architecture backward** — do not preserve Supabase-shaped patterns because legacy code used them.
2. **Separate cryptographic authority from operational hosting** — providers are replaceable; they must not become the trust root.
3. **Reverse engineer guarantees, not products** — study standards and mature systems; implement invariants with open cryptography.
4. **Prove independence under failure** — verifiers authenticate signed evidence when Abraxas APIs or storage are unavailable, within documented freshness limits; fresh authoritative state fails closed.
5. **Make every build measurable** — close a demonstrated gap, reduce a critical dependency, or improve a verified security/reliability property.

## Ownership vs hosting

Evaluate: cryptographic trust authority, holder identity, issuer keys, evidence custody, durable state, policy governance, revocation, tenant isolation, availability, monitoring.

Self-hosting alone is not independence. Cloud may be used when replaceable without invalidating proofs.

## Wallet-native design

Distinguish: connection, authentication, action authorization, evidence ownership, disclosure consent, issuance, independent verification.

Wallet signatures prove key control, not legal identity or eligibility — those require authoritative evidence.

Wallet adapters are interchangeable interfaces, not the security foundation.

## Independent verification (non-negotiable)

Verifiers must be able to check: issuer authority, valid signatures, audience binding, scoped policy, expiry, environment/tenant context, versioned rules, and freshness/revocation per policy.

Separate **signature authenticity** from **current acceptability**. Offline signature check ≠ fresh revocation.

No database or Abraxas API as the **cryptographic** trust root.

## Minimal state

Shared state may be required for: replay prevention, key rotation, credential status, policy versions, consent evidence, receipt provenance, webhook idempotency, usage accounting, audit recovery.

Minimize retained PII. Do not put sensitive relationships on public ledgers.

## Adversarial engineering

Test compromised keys, stolen sessions, malicious partners, cross-tenant access, replay, stale caches, concurrent issuance, DB loss, partition, operator compromise, backup loss, unauthorized policy change.

## Commercial protocol (unchanged)

- **Issued + approved** → one primary issuance accounting unit (observe-only until billing enabled separately).
- **Reused / replayed** → no new issuance charge.
- Independent verify is not a billable issuance.

## Engineering method (every build)

1. Identify the protocol gap.  
2. State the security invariant.  
3. Map current dependencies.  
4. Study standards and mature implementations.  
5. Check if Abraxas already satisfies the invariant.  
6. Smallest native improvement.  
7. Adversarial + integration tests.  
8. Measurable gain (security, privacy, reliability, independence, usability).  
9. Preserve Production behavior during transition.  
10. Ship only justified change.

## Delivery honesty

Reports must distinguish: verified implemented, unproven implemented, legacy-dependent, missing guarantee, proposed architecture, production-validated.

No destructive cutover, credential rotation, or Production authorization without explicit approval.

## Independence tests

| Test | Requirement |
|------|-------------|
| **Provider failure** | Verifier validates signed receipt without original DB/API, within freshness policy |
| **Provider replacement** | State migrates without rewriting historical proofs or issuer authority |
| **Provider compromise** | DB operator alone cannot forge valid Abraxas signatures |

## Product integrity

Holders and partners see clear requests, disclosures, outcomes, validity, and recovery — no fabricated status or decorative controls.

---

Machine-readable dependency map: `lib/infrastructure/trustBoundaryInventory.ts`  
Production change gates: `lib/infrastructure/productionChangeControl.ts`
