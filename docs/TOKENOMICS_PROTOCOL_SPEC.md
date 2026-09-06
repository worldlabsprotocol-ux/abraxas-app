# Abraxas Token Protocol Specification (ABX)

**Date:** 2026-07-30  
**Type:** Design specification — **no implementation**  
**Status:** Draft for review  
**Scope:** How the Abraxas token (ABX) integrates into the trust protocol over time  

---

## Why the token exists

If you cannot answer **"why does this token exist?"** for a specific utility, that utility should not exist.

ABX is **not** required for Abraxas to verify identity, issue credentials, or run the partner flow. **The protocol is functional without ABX.** The token is not what makes verification possible — it **aligns incentives and secures participation** in the Abraxas trust network as adoption grows:

- Align incentives among **issuers, verifiers, and relying partners**
- Settle **protocol fees** tied to measurable verification activity
- **Stake** economic weight behind honest infrastructure behavior
- **Govern** shared standards after the network has users
- **Reward** contributions that reduce fraud and improve trust quality

**Holders (end users) should barely know ABX exists.** Passport, credentials, and partner verification must remain usable with fiat or abstracted billing. Network operators — partners, issuers, verifiers — are the primary economic actors.

### "Can Abraxas work without the token?"

> **Yes.** The protocol is functional without ABX. ABX strengthens the network by aligning incentives, securing participation, settling protocol fees, and enabling decentralized governance as adoption grows.

ABX is subordinate to the protocol, not the other way around. Do not invent utility first — attach the token only after the trust layer is proven and frozen (`v1.0.0-beta`).

```
Users
  ↓
Passport → Credential
  ↓
Partners verify (policy + receipt)
  ↓
Protocol settles
  ↓
ABX powers settlement, staking, governance, incentives
         (operators — not holders)
```

---

## Design principles

| Principle | Meaning |
|-----------|---------|
| **Protocol first** | Build and prove trust infrastructure before token dependency |
| **No holder toll** | Users do not pay ABX to verify identity or obtain credentials |
| **Utility = trust support** | Every ABX use case must strengthen verification quality, accountability, or network sustainability |
| **No artificial demand** | No mechanics whose primary purpose is "create buy pressure" |
| **Activity-coupled utility** | Every ABX use maps to measurable protocol activity (verify, stake, slash, govern) — not speculative holding |
| **Abstract at the edge** | Partners may pay in fiat/stablecoin; protocol can settle internally in ABX |
| **Versioned economics** | Fee schedules, stake minimums, and slashing rules are governance parameters — not hardcoded surprises |
| **Receipts stay canonical** | Decision receipts (`schema_version: 1.0.0`) remain the trust artifact; ABX does not replace cryptographic proof |

---

## Actors and economics

| Actor | Role today | Token relationship (future) |
|-------|------------|----------------------------|
| **Holder** | zkLogin → Passport → credential | None required; optional rewards only if protocol later subsidizes adoption (out of scope for v1) |
| **Relying partner** | Calls verify APIs, receives receipts (e.g. Good Trouble) | Pays protocol fees; may stake for reputation/throughput |
| **Issuer** | Signs claim attestations, issues credentials | Stakes ABX; subject to slashing for fraudulent issuance |
| **Verifier** | Performs IDV / biometric / manual review | Stakes ABX; earns reputation; slashed for bad attestations |
| **Protocol treasury** | — | Collects fees; funds rewards, security, grants |
| **Governance** | — | Staked partners vote on standards after Phase 3 gate |

---

## Token utility (ranked by confidence)

### 1. Verification staking (high confidence)

**Purpose:** Economic accountability for issuers and verifiers who participate in the network.

**Mechanism:**

1. Partner registers as issuer and/or verifier.
2. Partner locks ABX in a protocol stake contract (or escrow table off-chain in pilot).
3. Stake size maps to **tier** (max throughput, supported policies, SLA tier).
4. Honest operation over time increases **reputation score** (non-transferable).
5. Fraudulent credentials, invalid attestations, or policy violations trigger **slashing**.

**Slashing conditions (illustrative):**

| Event | Evidence | Slash severity |
|-------|----------|----------------|
| Issued credential later proven fraudulent | Admin audit + holder dispute + on-chain/off-chain proof bundle | Partial → full stake by severity |
| Verifier approved identity that fails independent audit | Biometric replay, document fraud, duplicate identity | Partial stake |
| Repeated invalid API attestations | Signed receipt contradicted by live status registry | Warning → partial slash |
| Governance attack / key compromise | Documented key revocation + malicious receipts | Full slash + delisting |
| Downtime / SLA breach (optional) | Missed verify SLA for staked tier | Fee rebate, not slash (pilot) |

**Appeals:** Slashing requires auditable evidence (receipt ID, credential JTI, policy version, timestamp). Appeals window before irreversible slash (governance parameter).

**Why it fits:** Staking aligns operator incentives with trust outcomes — the core product.

---

### 2. Credential verification fees (high confidence)

**Purpose:** ABX as the **economic layer** of the trust network.

**Flow:**

```
Partner (relying party)
      ↓
POST /api/credentials/verify  or  GET /api/v1/receipts/{id}
      ↓
Policy evaluation + receipt (existing)
      ↓
Protocol fee assessed (metered)
      ↓
Settlement in ABX (or fiat → ABX via treasury)
```

**Fee triggers (metered events):**

| Event | Billing unit | Notes |
|-------|--------------|-------|
| Credential JWT verification | Per verify call | Crypto verify + registry lookup |
| Decision receipt status check | Per status call | Live validity resolution |
| Session receipt issuance | Per `dr_*` issued | Partner flow returning user path |
| High-volume batch verify | Per 1k calls | Volume discount for staked tiers |

**Fee exclusions:**

- Holder Passport onboarding (no ABX)
- First-party Abraxas UI flows for holders
- Sandbox / test API keys (`abx_test_*`)

**Settlement options:**

| Mode | Phase | Description |
|------|-------|-------------|
| Off-chain ledger | Token Phase 2 | Partner balance in DB; monthly ABX invoice |
| Prepaid ABX deposit | Token Phase 2 | Partner tops up; fees deducted per call |
| On-chain settlement | Token Phase 3 | Smart contract escrow per verify (optional) |

Partners see **USD-equivalent pricing** in dashboard; protocol settles in ABX internally. Holders never see this.

---

### 3. Reputation (medium-high confidence)

**Purpose:** Signal trustworthiness without "pay to win."

**Model:**

```
Network trust score =
  f(stake_weight, verification_accuracy, uptime, dispute_rate, tenure)
```

| Input | Weight (illustrative) | Anti-gaming |
|-------|----------------------|-------------|
| Stake | Capped contribution (e.g. max 30% of score) | Diminishing returns above tier ceiling |
| Accuracy | % verify decisions upheld at 90 days | Requires minimum volume |
| Dispute rate | Inverse | Measured per 1k receipts |
| Tenure | Slow accrual | Time-locked |
| Slashing history | Hard penalty | Recent slash zeros reputation boost |

**Unlocks (not purchases):**

- Higher API rate limits for staked tiers
- Earlier access to new policy templates
- Priority support / integration review
- Display badge in partner registry (`GET /api/partners/registry`)

**Explicitly not:** Paying ABX to rank higher in search or override policy outcomes.

---

### 4. Governance (medium confidence — after real usage)

**Purpose:** Partners who depend on the network govern shared standards.

**Prerequisite gate:** Minimum N active relying partners + M monthly verify volume before governance token activation. No governance before Phase 3.

**Votable parameters:**

- New policy schema versions
- Credential format extensions (`credentialSubject` fields)
- Receipt `schema_version` bumps
- Supported issuer allowlist / blocklist
- Protocol fee schedule
- Slashing severity tables
- SDK / API deprecation timelines
- Treasury spend (grants, security audits)

**Voting weight:**

```
vote_weight = min(stake_ABX, stake_cap) × reputation_multiplier × tenure_factor
```

One-partner-one-vote floor for registered partners below stake minimum (advisory polls only).

**Timelock:** Parameter changes effective after 7–30 day delay; emergency pause multisig for security incidents only.

---

### 5. Rewards (medium confidence)

**Purpose:** Reward infrastructure behavior that improves the trust network.

**Eligible behaviors:**

| Behavior | Reward source | Measurement |
|----------|---------------|-------------|
| Low dispute-rate verification | Treasury emissions | Rolling 90-day window |
| Fraud detection (true positive) | Treasury + slashed stake redistribution | Audited report |
| Uptime / SLA compliance | Fee rebate in ABX | Staked tier only |
| Integration quality (partner #2+) | Grant from treasury | Milestone-based, not speculative |

**Not eligible:**

- Holder referral bonuses tied to token price
- Liquidity mining without verification work
- Rewards for merely holding ABX

**Funding:** Protocol fees → treasury → rewards pool. Emissions (if any) are governance-capped and decay over time.

---

### 6. Trust insurance / dispute bonds (future — medium confidence)

**Purpose:** Give ABX a direct role in network trust beyond fees and governance — compensating harm when operators fail.

**Not implemented in any phase until Token Phase 3.** Document now; build only after protocol is proven and frozen.

**Mechanism:**

1. Verifier or issuer posts an **ABX bond** (subset of stake, earmarked for disputes).
2. If they issue fraudulent credentials or violate protocol rules, a portion of the bond is **slashed**.
3. Slashed funds flow to a **dispute resolution pool** that can:
   - Compensate affected relying partners (e.g. wrongful access granted)
   - Fund independent audit of disputed receipts / credentials
   - Remediate holder harm (policy-defined caps; never replaces legal process)

**Coupling to protocol activity:**

| Trigger | Evidence | Bond action |
|---------|----------|-------------|
| Fraudulent credential upheld in dispute | Receipt ID + credential JTI + audit | Bond slash → partner compensation |
| Verifier policy violation | Admin + biometric audit trail | Partial slash → dispute pool |
| False dispute (partner abuse) | Failed dispute after review | Complainant loses deposit (anti-spam) |

Bond size scales with stake tier and policy risk class. This extends staking (§1) — not a separate speculative product.

---

## Treasury

| Inflow | Outflow |
|--------|---------|
| Verification fees | Operator rewards |
| Slashed stake (partial) | Fraud victim remediation fund (policy-defined) |
| Slashed stake (remainder) | Burn or treasury (governance) |
| Grants / investments | Security audits, SDK development |
| Fiat on-ramps from partners | Stablecoin reserve for fee abstraction |

**Transparency:** Quarterly treasury report — fees collected, rewards paid, slashes executed, runway.

---

## Partner economics (summary)

| Partner type | Pays | Stakes | Earns |
|--------------|------|--------|-------|
| Relying partner (GT-style) | Per-verify fees | Optional (reputation tier) | Faster integration SLA |
| Issuer | Per-claim submission (optional) | Required at scale | Reputation + reward share |
| Verifier (IDV) | — | Required | Reward share − slash risk |
| Design partner (pilot) | Waived during sandbox | None | Early governance advisory |

**Good Trouble (reference partner):** Fee waiver through sandbox policy (`sandbox_only` decision context). No ABX requirement in Token Phase 1.

---

## What we will not do

| Anti-pattern | Rationale |
|--------------|-----------|
| Charge holders ABX to verify identity | Breaks Passport UX; excludes users |
| Require ABX to hold a credential | Credential is a signed JWT, not a token gate |
| Force partners to hold ABX before integration | API keys + fiat billing suffice in early phases |
| Token-gated receipt verification | Receipts are public artifacts; gating breaks interoperability |
| Speculative staking APY as primary marketing | Misaligns incentives |
| Governance before product-market fit | Empty governance captures nothing useful |

---

## Rollout phases (token-specific)

These phases are **orthogonal** to the engineering roadmap (`docs/ENGINEERING_ROADMAP.md`). Engineering Phase 1 (proof) and Phase 1.5 (freeze) complete **before** any token dependency.

### Token Phase 1 — No token dependency (now → v1.0.0-beta)

**Engineering alignment:** Engineering Phases 0–1.5.

| Property | State |
|----------|-------|
| Holder flows | Zero ABX |
| Partner flows | API keys + optional fiat/subscription (manual billing) |
| Fees | None on-chain; pilot partners waived |
| Staking | Not available |
| Governance | Not available |
| Token contracts | Not deployed |

**Success criteria:** Production walkthrough passes; `v1.0.0-beta` tagged; public contracts frozen.

---

### Token Phase 2 — Optional token integration

**Engineering alignment:** After Engineering Phase 2 hardening begins; not before freeze.

| Property | State |
|----------|-------|
| Verification fees | Optional ABX or fiat; off-chain ledger |
| Staking | Opt-in for issuers/verifiers seeking higher tiers |
| Reputation | Off-chain score; visible in partner registry |
| Governance | Advisory polls only (non-binding) |
| Holder impact | None |

**Success criteria:** ≥2 paying partners; fee settlement reconciles with API usage logs; zero holder-facing ABX UI.

---

### Token Phase 3 — Protocol-native token economy

**Engineering alignment:** Engineering Phase 3 (scale) + mature partner base.

| Property | State |
|----------|-------|
| Verification fees | Default settlement in ABX (fiat wrapper available) |
| Staking | Required for production issuer/verifier tiers |
| Slashing | Enforced with appeals process |
| Governance | Binding votes on standards and fees |
| Rewards | Active treasury program |
| On-chain (optional) | Stake + slash contracts on Sui; receipts remain off-chain signed artifacts |

**Success criteria:** Governance participation >30% staked supply; dispute rate < threshold; treasury solvent from fees.

---

## Integration map (existing protocol → future ABX)

| Existing artifact | ABX touchpoint | Phase |
|-------------------|----------------|-------|
| `POST /api/credentials/verify` | Fee meter | Token Phase 2 |
| `GET /api/v1/decision-receipts/{id}/status` | Fee meter | Token Phase 2 |
| `issuePartnerSessionReceipt` | Fee meter on `dr_*` | Token Phase 2 |
| `partner_api_keys` | Link to stake account | Token Phase 2 |
| `partners` registry | Reputation + stake tier | Token Phase 2 |
| Issuer framework (`/api/admin/issuers`) | Stake requirement | Token Phase 3 |
| `credential_status_registry` | Slash evidence source | Token Phase 3 |
| Policy versioning (Phase 2 eng.) | Governance vote target | Token Phase 3 |

**No changes** to credential JWT format, receipt canonicalization, or partner callback query params in Token Phase 1.

---

## Fee schedule (illustrative — governance-set)

| Tier | Monthly verify volume | Fee per verify | Stake minimum |
|------|----------------------|----------------|---------------|
| Sandbox | < 1k | $0 | $0 |
| Starter | < 50k | $0.002 equiv ABX | Optional |
| Growth | < 500k | $0.001 equiv ABX | 10k ABX |
| Enterprise | Unlimited | Negotiated | 100k ABX |

Exact numbers are **placeholders**. Real values set after cost data from production volume.

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Token introduced before protocol works | Token Phase 1 = zero dependency; engineering gate |
| Holders priced out of identity | Explicit anti-pattern; holder flows never require ABX |
| Partners leave due to fees | Fiat abstraction; sandbox waiver; volume discounts |
| Staking centralization | Stake caps on voting; reputation weight on accuracy |
| Slashing disputes | Evidence bundle + appeals + timelock |
| Regulatory (security token) | Utility-only design; legal review before Token Phase 3; geo restrictions TBD |

---

## Open questions (for legal + product review)

1. On-chain vs off-chain stake for Sui-native positioning?
2. Fiat fee collection entity (subsidiary / payment processor)?
3. Slash redistribution — burn vs treasury vs fraud fund?
4. Cross-chain ABX or Sui-only?
5. Emissions schedule if treasury fees insufficient for rewards?

---

## Related documents

| Document | Relationship |
|----------|--------------|
| `docs/ENGINEERING_ROADMAP.md` | Engineering phases 0–3; token does not block these |
| `docs/TRUST_LAYER.md` | Issuer/receipt validity — slash evidence source |
| `docs/BACKWARD_COMPATIBILITY_AUDIT.md` | Frozen contracts token must not break |
| `docs/PARTNER_FLOW_INTEGRATION.md` | Partner callback contract — no ABX fields in v1 |
| `docs/SECURITY_THREAT_MODEL.md` | Staking admin keys = high-value target in Phase 3 |

---

## Summary

**ABX exists to operate and secure the trust network — not to gate identity.**

| Phase | Token role |
|-------|------------|
| **Token Phase 1** | None. Build and prove the protocol. |
| **Token Phase 2** | Optional fees, opt-in staking, off-chain reputation. |
| **Token Phase 3** | Native settlement, required operator stake, governance, rewards. |

Users complete Passport without thinking about ABX. Partners and verifiers use ABX because honest infrastructure earns reputation and dishonest infrastructure loses stake.

**No token logic is implemented by this document.** Implementation requires separate engineering spec, legal review, and governance approval after `v1.0.0-beta` freeze.
