# x402 + Abraxas Access — Threat Model

**Status:** Design only — accompanies `docs/X402_ABRAXAS_ARCHITECTURE.md`.

**Scope:** Product B MVP (partner-paid gated access with Abraxas eligibility proof). Product A threats noted where they differ.

---

## 1. Summary

The combined gate introduces a **two-proof** model:

1. **Eligibility proof** — Abraxas-signed decision receipt (identity/policy).  
2. **Payment proof** — x402 v2 settlement via facilitator (commerce).

The highest-risk failures are: **pay-to-pass verification**, **fulfillment without settlement**, **payment replay**, and **PII leakage** in audit or logs.

---

## 2. System model

### 2.1 Assets

| Asset | Owner | Sensitivity |
|-------|-------|-------------|
| Decision receipt signing key | Abraxas | Critical |
| Partner API keys (`abx_*`) | Partner | High |
| Facilitator API credentials | Partner (MVP) | High |
| Partner treasury private keys | Partner | Critical |
| Eligibility receipt (`receipt_id`) | Public identifier | Medium (correlation) |
| Payment payload / signature | Transient | High |
| Paid resource content | Partner | Business |
| `audit_events` rows | Abraxas / Partner | Medium (must be PII-free) |
| Holder PII (claims, documents) | Abraxas | Critical — **out of scope for payment path** |

### 2.2 Actors

| Actor | Capability |
|-------|------------|
| **Holder / agent** | Browser, wallet, HTTP client |
| **Partner RP** | Runs resource API + x402 gate |
| **Abraxas** | Partner Flow, receipts, policies |
| **Facilitator** | Verify/settle on-chain or custodial rail |
| **Attacker** | Forged receipts, replayed payments, race conditions |
| **Abraxas operator** | Admin console, policy publish |

### 2.3 Trust boundaries

```
┌─────────────────────────────────────────────────────────────┐
│ Abraxas trust zone                                          │
│  Partner Flow │ Policy engine │ Receipt signing │ Public GET  │
│  NO payment headers accepted on evaluate/complete/refresh     │
└───────────────────────────┬─────────────────────────────────┘
                            │ receipt_id + public verify only
┌───────────────────────────▼─────────────────────────────────┐
│ Partner trust zone                                          │
│  Receipt validation │ 402 PAYMENT-REQUIRED │ Fulfillment      │
│  Idempotency store │ Facilitator client                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ verify / settle
┌───────────────────────────▼─────────────────────────────────┐
│ Facilitator + chain                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Threat catalog

### T1 — Pay to pass verification (critical)

**Description:** Attacker pays Abraxas or sends `PAYMENT-SIGNATURE` to Partner Flow endpoints to obtain approval without meeting policy.

| | |
|---|---|
| **Affected** | Abraxas integrity |
| **Mitigation** | Partner Flow routes never read `PAYMENT-*` headers; policy engine has no payment inputs; receipts issued only after claim evaluation |
| **Verification** | Static route audit; integration test that payment headers are ignored on `/api/v1/partner-flow/*` |
| **Residual** | Social engineering (“pay us to verify”) — partner education |

### T2 — Fulfillment without settlement (critical)

**Description:** Partner returns paid resource before facilitator confirms settlement.

| | |
|---|---|
| **Affected** | Partner revenue |
| **Mitigation** | Strict state machine: `eligible → payment_required → settled → granted`; no body on 402 |
| **Verification** | Partner conformance tests; facilitator mock that delays settle |
| **Residual** | Malicious partner code — out of Abraxas control |

### T3 — Payment replay (high)

**Description:** Attacker reuses `PAYMENT-SIGNATURE` or settlement ref to obtain multiple resources.

| | |
|---|---|
| **Affected** | Partner revenue |
| **Mitigation** | `idempotency_key = hash(partner, resource, receipt_id, payment_payload)`; durable ledger; single-use receipt binding (default) |
| **Verification** | Replay test suite on partner reference server |
| **Residual** | Partner misconfiguration (reusable mode) |

### T4 — Receipt replay / stolen receipt_id (high)

**Description:** Attacker uses another holder’s `receipt_id` from callback URL or logs.

| | |
|---|---|
| **Affected** | Partner access control |
| **Mitigation** | Partner binds receipt to session or mTLS agent identity where possible; short TTL; optional one-time redemption flag (future); never trust callback params alone |
| **Verification** | Partner Flow conformance: verify server-side only |
| **Residual** | Leaked `receipt_id` in browser history — mitigate with short TTL + single-use grants |

### T5 — TOCTOU: receipt expires between check and fulfill (medium)

**Description:** Receipt valid at `402` time, expired at `200` time.

| | |
|---|---|
| **Mitigation** | Re-validate `expires_at` immediately before fulfillment; `access_grant_ttl` ≤ remaining receipt TTL |
| **Verification** | Clock-skew tests |

### T6 — Forged or tampered receipt (high)

**Description:** Attacker crafts fake receipt JSON without valid signature.

| | |
|---|---|
| **Mitigation** | `validatePartnerFlowPublicReceipt` / `evaluatePublicReceiptTrust` fail-closed; partners must not cache unsigned views |
| **Verification** | Existing trust evaluation tests; negative fixtures |

### T7 — Wrong partner / policy binding (medium)

**Description:** Receipt issued for partner A used at partner B’s resource.

| | |
|---|---|
| **Mitigation** | Expectations check: `partner_id`, `policy_id` must match partner config |
| **Verification** | Cross-partner negative tests |

### T8 — x402 version / header confusion (medium)

**Description:** Client sends v1 `X-Payment` while server expects v2 `PAYMENT-SIGNATURE`.

| | |
|---|---|
| **Mitigation** | v2 only in new integrations; reject unknown headers; document migration; retire Abraxas v1 stubs |
| **Verification** | Header negotiation tests |

### T9 — Facilitator compromise or misconfiguration (high)

**Description:** Attacker exploits weak facilitator verify or wrong `pay_to`.

| | |
|---|---|
| **Mitigation** | TLS to facilitator; pin facilitator URL; validate settlement response schema; `pay_to` in `PAYMENT-REQUIRED` must match partner treasury |
| **Verification** | Facilitator integration tests on testnet |
| **Residual** | Facilitator vendor trust — security review of chosen provider |

### T10 — Ambiguous settlement double fulfillment (high)

**Description:** Timeout after settle succeeds → client retries → two deliveries.

| | |
|---|---|
| **Mitigation** | Idempotent grant on `payment_payload_hash`; ambiguous → no fulfill until reconcile |
| **Verification** | Chaos tests: DB failure after settle |

### T11 — PII in payment or audit logs (high)

**Description:** Wallet address, email, or JWT logged with payment events.

| | |
|---|---|
| **Mitigation** | Audit allowlists (`PARTNER_FLOW_PII_FORBIDDEN_METADATA_KEYS`); payment logs store hashes/correlation ids only |
| **Verification** | Log scanner; audit metadata contract tests |

### T12 — Abraxas public receipt enumeration (medium)

**Description:** Attacker brute-forces `receipt_id` on public endpoint.

| | |
|---|---|
| **Mitigation** | Unguessable receipt ids (existing); rate limits (`partnerFlowRateLimit` on public receipt); no extra fields in public view |
| **Verification** | Rate limit tests |

### T13 — Eligibility downgrade via sandbox policy (low, pilot)

**Description:** Pilot uses `production_usable: false` policies in production commerce.

| | |
|---|---|
| **Mitigation** | Production gate requires `production_usable: true`; partner validator defaults `allowSandbox: false` in production |
| **Verification** | Config lint in partner conformance |

### T14 — API key scope escalation (Product A future) (high)

**Description:** Partner uses `verify:requests` key to bypass payment on metered APIs.

| | |
|---|---|
| **Mitigation** | Product A not in MVP; future separate billing scope + x402 on metered routes |
| **Status** | Deferred |

### T15 — Custody / funds held by Abraxas (critical, business)

**Description:** Abraxas holds partner or user funds.

| | |
|---|---|
| **Mitigation** | MVP: `pay_to` is partner address only; Abraxas does not operate treasury for Product B |
| **Verification** | Architecture review sign-off |

---

## 4. Attack scenarios (STRIDE-lite)

| Scenario | STRIDE | Path | Outcome if unmitigated |
|----------|--------|------|------------------------|
| POST payment header to `/partner-flow/evaluate` | Tampering | T1 | Paid approval (if implemented — **must not**) |
| Replay `PAYMENT-SIGNATURE` 100× | Repudiation / DoS | T3 | Free or excess access |
| Skip facilitator, forge `PAYMENT-RESPONSE` | Spoofing | T2 | Free content |
| Use leaked callback `receipt_id` | Info disclosure | T4 | Unauthorized eligibility gate pass |
| Mix v1 client with v2 server | Elevation | T8 | Payment loop / failed settle |
| Log full `PaymentPayload` | Info disclosure | T11 | Wallet / payer correlation leak |

---

## 5. Security requirements (must-have for pilot code)

| ID | Requirement |
|----|-------------|
| SR-1 | Partner Flow endpoints ignore all `PAYMENT-*` and `X-PAYMENT*` headers |
| SR-2 | Partner validates receipt via Abraxas public API before any `402` |
| SR-3 | x402 v2 headers only; `x402Version === 2` |
| SR-4 | Facilitator verify + settle before resource body |
| SR-5 | Durable idempotency store at partner |
| SR-6 | No PII in payment or access audit metadata |
| SR-7 | Ambiguous settlement → no fulfill |
| SR-8 | Testnet + `sandbox_only` / `allowSandbox` for pilot only |
| SR-9 | Deprecation plan for Abraxas v1 x402 stubs |
| SR-10 | `validatePartnerFlowPublicReceipt` equivalent checks documented as mandatory |

---

## 6. Out of scope (explicit)

- Smart contract audits for partner treasury  
- Facilitator internal security (vendor assessment separate)  
- Sanctions screening on payer wallet (partner responsibility in Product B)  
- Tax / VAT on micropayments  
- Refund/chargeback flows  
- Product A Abraxas billing threat analysis (future document delta)

---

## 7. Review checklist (before testnet pilot code)

- [ ] Security review of partner reference implementation against SR-1–SR-10  
- [ ] Legal sign-off: partner is merchant of record  
- [ ] Privacy review: sample audit rows contain no forbidden keys  
- [ ] Facilitator choice documented with trust assumptions  
- [ ] Incident runbook: ambiguous settlement, facilitator outage  
- [ ] Conformance harness updated with negative tests (T1, T3, T6, T8)

---

## 8. Document history

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-08-07 | Initial threat model — docs only |
