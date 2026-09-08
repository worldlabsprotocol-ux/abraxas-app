# Tiered Age Assurance

Privacy-minimized, tiered age-assurance lifecycle for Good Trouble and partner integrations.

## Trust levels

| Tier | Assurance | Proof source | Valid for |
|------|-----------|--------------|-----------|
| **Tier 1 — Browse** | L0 | Holder self-attested DOB (transient) | Site browsing UI only |
| **Tier 2 — Regulated** | L2+ | Approved provider, manual review, or reusable Abraxas credential | Checkout, purchase, delivery, partner eligibility |

**Core rule:** A self-attested claim must never satisfy `product_eligibility=over_21`, L2+ policies, checkout authorization, regulated purchase receipts, or cross-industry regulated actions.

## Browsing versus regulated-action boundary

- **Browse (`purpose=browse`, policy `good-trouble-browse-v1`)** — Holder enters DOB once; server calculates UTC calendar age transiently; only `age_band` (`over_21` / `under_21`) is stored with short TTL.
- **Checkout / purchase (`good-trouble-retail-v1`)** — Requires authoritative verification. Earlier DOB entry is explicitly **not** sufficient.

Authentication (Google zkLogin) satisfies neither tier.

## Data minimization

**Never persisted:**

- Full date of birth
- Birth month, day, or year separately
- Reversible DOB hash
- Request logs containing DOB

**Stored in `self_attestation_ledger` (migration 081):**

- `age_band`, `assurance_level` (L0), `provenance` (`user_self_attestation`)
- Partner/policy/purpose binding, `attested_at`, `expires_at`, optional `browse_receipt_id`

TTL: `SELF_ATTESTED_AGE_TTL_HOURS` (default 24h, max 72h).

## API

`POST /api/age-assurance/self-attest`

```json
{
  "date_of_birth": "YYYY-MM-DD",
  "partner_id": "good-trouble-cannabis",
  "policy_id": "good-trouble-browse-v1",
  "purpose": "browse"
}
```

- Authenticated browser session required
- CSRF/origin protection
- Rate limited
- Rejects `checkout`, `purchase`, `delivery`, and equivalent purposes
- Returns generic age-band result; optional signed `browse_receipt` (not valid for purchase)

`POST /api/age-assurance/browse-receipt/verify` — server-side browse receipt validation for partner UI gates.

## Policy engine

- `self_attested_age_band=over_21` satisfies only policies with `browse_access_only: true` (e.g. `good-trouble-browse-v1`).
- Cannot satisfy: `identity_verified`, `product_eligibility`, `age_verified`, `min_assurance` L1+, or regulated transaction policies.
- `good-trouble-retail-v1` is unchanged.

## Holder UX

`/partner/continue?purpose=browse` shows tier-1 self-attestation form.

Regulated flows show **“Verify eligibility for purchase”** with method order:

1. Reuse active authoritative Abraxas age proof
2. Configured privacy-preserving provider (when production-capable)
3. ID/manual-review fallback
4. Return to partner

## Wix integration

| Surface | Authority |
|---------|-----------|
| Age gate popup (browse UI) | L0 browse receipt or traditional local self-attest (UI only) |
| Checkout backend | `good-trouble-retail-v1` eligibility receipt only |

**Never authorize checkout from:**

- URL `status=approved`
- `sessionStorage` pilot flags
- Self-attested claims
- Client-controlled query parameters

## Wix integration (dual lifecycles)

| Lifecycle | Policy | Purpose | Callback | Verifier prefix | UI state |
|-----------|--------|---------|----------|-----------------|----------|
| Browse | `good-trouble-browse-v1` | `browse` | `/browse-verification-result?gtb=` | `abraxas_gt_browse_verifier_` | `good_trouble_browse_access_l0` |
| Purchase | `good-trouble-retail-v1` | `purchase` | `/age-verification-result?gtv=` | `abraxas_gt_purchase_verifier_` | `good_trouble_purchase_verified_pilot` (UI only) |

- Age popup uses **browse** start (`createBrowseVerificationStart`)
- Checkout uses **purchase** start (`createPurchaseVerificationStart` via `PurchaseVerificationEntry.js`)
- `BROWSE_ACCESS_STORAGE_KEY` may dismiss the age popup but is **never** accepted by `authorizePurchaseEligibility`
- Purchase requires server-validated, consumed, partner-bound L2+ receipt (`purchaseEligibilityAuthorization.js`)

See `examples/good-trouble-wix/backend/tieredLifecycleSecurity.test.js`.

## Receipts

| Type | `artifact_type` | `valid_for_purchase` | Assurance |
|------|-----------------|----------------------|-----------|
| Browse | `browse_access_receipt` | `false` | L0 |
| Purchase | `eligibility_decision_receipt` | implicit true | L2+ |

Neither receipt type includes DOB, document images, or raw evidence.

## Threat model

| Threat | Mitigation |
|--------|------------|
| DOB retention / logging | Transient calculation; privacy-safe audit (hashed holder ref only) |
| Self-attest → purchase bypass | Policy engine guards; Wix checkout rejects L0/browse receipts |
| Social OAuth as age proof | `socialSignalPolicy` fail-closed |
| URL/session flag spoofing | Backend receipt validation + PKCE; checkout guard |
| Expired/revoked browse access | Ledger expiry; JWT `exp`; policy `max_age_hours` |
| Partner/policy mismatch | Claims bound to `partner_id`, `policy_id`, `purpose` |

## Operator / legal responsibilities

- Merchants remain responsible for ID checks at purchase or delivery where law requires.
- Tier-1 browse access is not a compliance substitute for regulated retail verification.
- Sandbox policies (`sandbox_only: true`) are not production-usable until operator promotion.

## Rollout and rollback

1. Apply migration **081** after **080** (see `scripts/ci/run-migration-081-sql-parity.sh`).
2. Deploy application code with browse policy and API routes.
3. Enable holder UX via `purpose=browse` on partner continue URLs.
4. **Rollback:** disable browse policy routing in partner integrations; migration 081 is additive (ledger can remain; no DOB to purge).

## Required migration order

```
… → 078_age_evidence_records → 079_identity_review_sessions → 080_age_assurance_sessions → 081_self_attestation_ledger
```

## Staging E2E procedure

1. Sign in on staging Abraxas origin.
2. Open `/partner/continue?purpose=browse&partner_id=good-trouble-cannabis&policy_id=good-trouble-browse-v1&verify_request=<id>&return=<allowlisted-url>`.
3. Submit DOB — confirm “Browsing access confirmed” and no DOB in network response body beyond transient request.
4. Open retail continue URL (no `purpose=browse`) — confirm “Verify eligibility for purchase” and that self-attest form is not offered as checkout proof.
5. Complete authoritative verification — confirm `good-trouble-retail-v1` receipt.
6. Wix: verify browse receipt passes UI validator but `checkoutAuthorization` rejects it for purchase.

## Preview URLs (development / Vercel Preview only)

| Route | Notes |
|-------|-------|
| `/partner/tiered-age-preview?purpose=browse&partner_id=good-trouble-cannabis&policy_id=good-trouble-browse-v1` | **Canonical browse preview** — real `SelfAttestationBrowseForm`, L0 only |
| `/partner/release-gate-preview#browse_self_attest` | Release-gate screenshot harness (multi-state page; no `purpose=browse` query) |
| `/partner/continue?purpose=browse&partner_id=good-trouble-cannabis&policy_id=good-trouble-browse-v1&verify_request=<id>&return=<url>` | Production integration path (requires signed-in holder + verification request) |

## Related docs

- [PRIVACY_FIRST_AGE_ASSURANCE.md](./PRIVACY_FIRST_AGE_ASSURANCE.md) — provider-neutral tier-2 architecture
- [GOOD_TROUBLE_AGE_LIFECYCLE_AUDIT.md](./GOOD_TROUBLE_AGE_LIFECYCLE_AUDIT.md) — end-to-end journey audit
