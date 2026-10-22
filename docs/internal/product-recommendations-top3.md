# Top 3 product improvements (post-ASM review — not approved for build)

Ranked by institutional fit. Each requires separate founder authorization.

## 1. Durable sharing-consent evidence (wallet-control)

**User benefit:** Institutions can prove holder authorized disclosure, not only that completion occurred.

**Fit:** Extends #788 cookie gate with optional `consent_receipts` row aligned to verify_request (same pattern as other consent paths).

**Security:** Must not weaken fail-closed complete; cookie remains runtime gate; receipt is audit/evidence.

**Acceptance:** Staging adversarial tests + receipt shows request binding; independent verifier can correlate consent audit tier to receipt issuance.

## 2. Scoped delegation credential for integration automation (research → pilot)

**User benefit:** Developers’ CI or ops agents call Abraxas APIs with narrow, expiring scope — no blanket API keys.

**Fit:** OAuth2 client credentials + Abraxas policy on partner_id / sandbox; reuse existing signed decisions for outcomes.

**Security:** No model in trust path; human approval for production promotion unchanged.

**Acceptance:** One design partner runs automated sandbox qualification with revocable credential; documented revocation under 60s effective.

## 3. Contextual Studio help (Protocol Operator — static)

**User benefit:** Plain-language next step in Launchpad/Studio when policy pin or sandbox key is misconfigured.

**Fit:** Deterministic copy from existing API errors — **no** LLM, **no** floating mascot; inline panel only.

**Security:** Zero authorization surface; feature-flagged off by default.

**Acceptance:** Reduced misconfiguration support tickets in pilot; no increase in time-on-task for consent flows.
