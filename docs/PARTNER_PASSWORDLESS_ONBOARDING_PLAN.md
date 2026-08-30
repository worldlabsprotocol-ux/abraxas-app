# Partner passwordless onboarding — technical planning

**Status: planning only — not deployed.** This document describes a future consented passwordless partner-account layer on top of today's Partner Flow. Nothing in this plan is live in production unless separately shipped and documented.

Good Trouble Canna is the first intended sandbox adopter for eligibility verification today; passwordless account bootstrap remains **in development**.

---

## Goals

- Let users prove eligibility once and optionally continue into a partner-owned account without another password.
- Keep eligibility verification, contact sharing, and marketing consent as **separate** consent grants.
- Never disclose DOB, ID document images, or raw identity artifacts to partners.
- Issue **pairwise** partner subject identifiers so partners cannot correlate users across services.

---

## What exists today (do not conflate)

| Capability | Status |
|------------|--------|
| Partner Flow redirect + policy evaluation | **Live (beta)** |
| Abraxas Passport sign-in + optional IDV | **Live (beta)** |
| Signed public receipts + privacy-preserving callbacks | **Live (beta)** |
| Sandbox design-partner provisioning | **Live (operator-managed)** |
| Consented passwordless partner-account creation | **Not deployed** |
| Pairwise partner identity exchange | **Not deployed** |
| Optional email / newsletter scopes | **Not deployed** |
| Partner SSO / “Continue with Abraxas” return login for partner sessions | **Not deployed** |

---

## Consent grant model (planned)

Separate, revocable grants per partner and purpose:

| Grant | Purpose | Default |
|-------|---------|---------|
| `eligibility.verify` | Run policy evaluation and return signed receipt | Required for Partner Flow |
| `account.bootstrap` | One-time authorization to create/recover partner-local account | Opt-in |
| `contact.email` | Share verified email with this partner only | Opt-in |
| `marketing.newsletter` | Subscribe to partner marketing communications | Opt-in, **never preselected** |

Grants are stored with: partner_id, subject_ref (Abraxas holder), grant_type, issued_at, expires_at, revocation_id, and audit correlation.

---

## Pairwise partner subject identifier (planned)

- Abraxas derives `partner_subject_id = HMAC(master_key, holder_id || partner_id)` (or equivalent pairwise pseudonym).
- Returned only inside the account-bootstrap exchange — never in public receipts or callback query strings.
- Partners map `partner_subject_id` to their local user row; Abraxas does not operate partner sessions.

---

## One-time account-bootstrap authorization code (planned)

1. After eligibility receipt validates, user opts into `account.bootstrap`.
2. Abraxas issues a short-lived, single-use `bootstrap_code` bound to: partner_id, policy_id, receipt_id, pairwise subject, and consent grant IDs.
3. Partner backend exchanges `bootstrap_code` server-to-server (authenticated with partner API key).
4. Code consumed atomically; replay rejected.

---

## Server-to-server exchange (planned)

```
POST /api/v1/partner/account-bootstrap/exchange
Authorization: Bearer abx_live_…
{
  "bootstrap_code": "…",
  "partner_id": "…"
}
→ {
  "partner_subject_id": "…",
  "email": "…" // only if contact.email grant present
  "grants": ["eligibility.verify", "account.bootstrap"]
}
```

Fail closed on: expired code, consumed code, partner mismatch, missing grant, or invalid receipt linkage.

---

## Partner callback correlation (planned)

- Extend frozen callback params only via versioned contract — never embed email, DOB, or bootstrap secrets in query strings.
- `bootstrap_code` delivered through server-side exchange only.
- Correlate using `receipt_id` + partner session nonce already used in Partner Flow.

---

## Partner-owned secure session (planned)

- Partner issues its own session cookie/JWT after local account create/find.
- Abraxas never holds partner session state or purchase history.
- Returning “Continue with Abraxas” reuses Passport context to refresh eligibility — partner still owns login session.

---

## Optional email scope (planned)

- Separate checkbox from eligibility and account bootstrap.
- Email sourced from Abraxas holder profile only when `contact.email` grant is active.
- Never inferred from IDV document extraction for partner export.

---

## Separate marketing-consent scope (planned)

- `marketing.newsletter` is independent; UI must not preselect.
- Revoking marketing consent does not revoke eligibility grants.
- Partners own fulfillment; Abraxas records consent artifact for audit.

---

## Consent revocation and audit (planned)

- Holder-facing revocation UI in Passport (future).
- Partners receive webhook `partner.consent.revoked` (future) — notification only; partners must enforce locally.
- Immutable audit log: grant issued, exchanged, revoked — no PII in webhook payload.

---

## Replay prevention (planned)

- Bootstrap codes: single-use, short TTL, hashed at rest.
- Pairwise subject rotation policy documented per partner offboarding.
- Receipt + bootstrap linkage prevents cross-partner replay.

---

## No DOB or ID-document disclosure (invariant)

- Public receipts and bootstrap exchange payloads expose **policy outcomes only** (e.g. `over_21`), never DOB, document images, or raw IDV fields.
- Partners validate eligibility via signed receipts — same contract as today.

---

## Good Trouble Canna — sandbox adopter

| Today | Planned |
|-------|---------|
| Wix sandbox reference for strict receipt validation + age eligibility (`good-trouble-retail-v1`) | Consented Wix member account bootstrap after verification |
| Partner Flow redirect + public receipt GET (no API key) | Optional email + newsletter scopes with separate checkboxes |
| Self-attestation “Yes, I’m 21 or older” path unchanged | Pairwise `partner_subject_id` for Wix backend session binding |

Reference: `examples/good-trouble-wix/`, `docs/GOOD_TROUBLE_WIX_SANDBOX.md` (operator checklist — not a live product claim).

---

## Implementation phases (suggested)

1. **Phase A — consent schema + audit tables** (no partner-facing API)
2. **Phase B — bootstrap code issuance behind feature flag** (sandbox partners only)
3. **Phase C — server exchange + Good Trouble Wix pilot**
4. **Phase D — holder revocation UI + marketing scope**

Each phase requires explicit operator approval and documentation update before marketing language changes from “In development” to “Available now”.
