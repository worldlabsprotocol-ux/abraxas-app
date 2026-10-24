# Build #812 — Controlled Production institutional activation (operator plan)

**Status:** Analysis complete · **No Production migrations executed** · **No credentials activated**

Sandbox milestone **PASS (8/8)** — evidence receipt `dr_jSXuDfM_pFMT36du`, request `vr_3413af2704dc2bc4`, handoff `hpf_6962970c9147cbab`.

---

## 1. Code reconciliation

| Ref | Commit | Notes |
|-----|--------|--------|
| **`main` (authoritative branch)** | `c81db5f5` | Merge **#809** Launchpad responsive + handoff UX; includes **#807** metering PII filter fix, **#806** continuation callback, wallet-control completion fixes |
| **Production Vercel deploy** | `c81db5f5` | `target: production` deployment `dpl_7Lk4Zmnjeb9FNvdRdZY5FAXuUQ9p` → **https://abraxasworld.xyz** |
| **Demo Vercel deploy (typical)** | `c81db5f5` or branch preview | **https://demo.abraxasworld.xyz** — confirm env binding in Vercel (Demo DB ≠ Production DB) |
| **Operator branch (do not deploy over main)** | `705746d0` | **#810** receipt outcome clarity; **missing** #809 and other main security/UI fixes |

### Missing from `main` (only gap vs operator branch)

**PR #810** — issued / reused / replayed operator evidence (~15 files, no UI regressions):

- `lib/partner/partnerFlowReceiptOutcome.ts` (+ tests)
- `lib/partner/relyingPartyFlow.ts`, audit, Launchpad activity, partner-flow routes
- Commercial docs + `SESSION_RECEIPT_REUSE_ACCEPTANCE.md`

### Smallest code promotion

- **PR:** `cursor/build-812-receipt-outcome-to-main-5ffe` — cherry-pick #810 onto current `main` (not operator-branch merge).
- **Do not** merge `cursor/launchpad-account-operator-session-5ffe` into Production (it would **drop** #809 and related main fixes).

---

## 2. Production infrastructure preflight

**Production Supabase:** `bztwutzprwsdrtqdpymf`  
**Demo Supabase:** `ocntwbxarpjeixdnzide` (sandbox acceptance source of truth)

### Present on Production (verified)

| Capability | Table / object |
|------------|----------------|
| Signed receipts | `decision_receipts` |
| Session decisions + idempotency | `verification_decisions` (`idempotency_key` column **present**) |
| Hosted handoffs | `hosted_partner_flow_handoffs` |
| Launchpad apps | `partner_launchpad_applications`, `partner_launchpad_activity` |
| Policy change control (088-class) | `partner_policy_lifecycle_audit`, `partner_policy_adoptions` |
| Partner production promotion RPC path | Documented in `docs/PARTNER_PRODUCTION_ENV_PROMOTION.md` |

### Absent on Production (blockers for parity with Demo acceptance)

| Capability | Migration(s) | Risk if enabled in app before schema |
|------------|--------------|--------------------------------------|
| **Observe-only metering ledger** | `058_partner_metering_foundation.sql` (+ `065_service_role_runtime_grants.sql` if needed) | Inserts fail silently (best-effort hook); **no durable accounting** |
| **Native persistent accounts** | `144` → `145` → `146` → `147` | Wallet-native Launchpad operator path fails closed; sessions not revocable server-side |
| Optional hardening / studio | `148`–`149` (membership recovery) | Demo-only until approved |

### Present on Demo, not Production

- `partner_metering_events` — **Demo only today**
- `abraxas_accounts` / Solana session stack — **Demo only today** (per `docs/connect/build-741-production-migration-checklist.md`)

### Policy change control

- Code supports 088; Production **has** lifecycle/adoption tables.
- **`docs/POLICY_CHANGE_CONTROL.md`** still marks some rollout as DEMO-first for certain UI surfaces — treat Launchpad Policies writes as **schema-gated** (fail-closed when objects missing).

### Backup / rollback

- **Before any migration window:** Supabase project backup / PITR confirmation (founder operator).
- **Rollback (preferred):** Vercel redeploy to prior SHA; disable feature flags (`ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED`, etc.). **Do not drop native-account tables as routine rollback** — preserve DB records and audit history.
- **Metering reversal:** only if 058 applied with **zero** production rows and founder explicitly approves empty-table reversal (`BUILD_812_METERING_PREFLIGHT.md`).
- **App rollback:** Vercel instant rollback (e.g. `c81db5f5` pre-#811 or last known-good).

### Security gates (pre-activation)

| Gate | Requirement |
|------|-------------|
| Service role | Metering + handoffs + issuance remain **service_role only**; no anon/authenticated direct writes |
| `receipt_outcome` URL param | **Display-only** — billing/authorization use server `replay_status` + signed receipt |
| Issuer keys | Production signing key id separate from `abraxas-demo-primary` |
| Session secret | Unique `ABRAXAS_ACCOUNT_SESSION_SECRET` (≥32 bytes) before native auth enable |
| Credential boundary | `abx_live_*` only after `partner_production_env_promote_atomic` + manual key issuance |

---

## 3. Native Production account activation (prepare only)

Use existing architecture (`docs/connect/build-741-solana-first-journey.md`, `docs/sovereign/native-account-persistence.md`).

**Order:** apply **144 → 145 → 146 → 147** on Production → validate RPCs/tables → set env:

- `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=1`
- `ABRAXAS_NATIVE_ACCOUNT_MEMORY` **disabled**
- `NEXT_PUBLIC_SOLANA_NETWORK` = approved Production network

**Preserve:** current Production wallet/connect flows that do not depend on native accounts until cutover flag is explicitly enabled.

**Do not** expose Demo sandbox membership rows or Demo-only recovery attestations on Production.

---

## 4. Institutional Production application (new — not Demo promotion)

Create **new** Production Launchpad application:

- New `partner_id` / tenant binding (not `studio-accept-wc-*`)
- Production policy (`decision_context: production`, not `sandbox_only`)
- Verified callback hostnames on **https://abraxasworld.xyz** (or partner-owned HTTPS origin)
- New **`abx_live_*`** API key after production environment promotion
- Issuer / signing key = Production authority (not Demo primary)

**Never** promote Demo app `fbea93d2-6660-428d-85c3-8c4e12d89b05` or receipts `dr_*` from Demo DB.

Activation contract: `activateProductionApplication`, `evaluateProductionReviewGates`, `docs/PARTNER_PRODUCTION_ENV_PROMOTION.md`.

---

## 5. Production acceptance (after approvals)

One **genuine** holder run (no simulation):

1. Authorized holder wallet signature on Production policy.
2. Explicit sharing consent (audit `partner_flow.consent`).
3. **`replay_status: issued`** (or audit `receipt_outcome: issued` once #810 on Production).
4. New `dr_*` with valid public verify signature.
5. `currently_valid` / `production_usable` appropriate for **production** context.
6. Authorized callback + completed handoff.
7. **Exactly one** `partner_metering_events` row (`partner_flow_receipt_issued`, idempotency `meter:pf_receipt:{receipt_id}`) — requires **058** applied.
8. Callback refresh / replay → **no** second metering row.

---

## 6. Commercial boundary (unchanged)

- **Issued + approved** → one observe-only usage unit.
- **Reused / replayed** → no new issuance charge.
- Public receipt verify → not a billable issuance.
- **`collection_status: not_enabled`** — no invoicing or enforcement until separate founder decision.

---

## 7. Deliverables checklist

| # | Item | Result |
|---|------|--------|
| 1 | Main commit | `c81db5f5` |
| 2 | Production deploy commit | `c81db5f5` (`dpl_7Lk4Zmnjeb9FNvdRdZY5FAXuUQ9p`) |
| 3 | Missing code | **#810 only** → PR `cursor/build-812-receipt-outcome-to-main-5ffe` |
| 4 | Schema delta | **058** metering; **144–147** native accounts (Production) |
| 5 | Migration order | 058 (+065 grants if needed) → 144 → 145 → 146 → 147 (native); institutional handoffs/receipts already on Production |
| 6 | Readiness | Receipt/handoff stack **ready**; metering + native accounts **not ready** on Production |
| 7 | Must stay up | Existing Production partner verify, passport/IDV, Good Trouble flows, public site, current API keys until promotion |
| 8 | PRs | **#812** (#810 → main); future PRs only for migration runbooks / env flags — no feature sprawl |
| 9 | Deploy / rollback | Merge #812 → Vercel production promote; rollback via Vercel previous deployment; DB rollback per migration notes |
| 10 | Explicit approvals | (a) Founder: Production SQL window 058 + 144–147 (b) Founder: `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` (c) Admin: `partner_production_env_promote_atomic` for new partner (d) Operator: new live key issuance (e) **No** billing activation |

### Production acceptance sequence (operator)

1. Merge **#812** → deploy Production `main`.
2. Apply **058** (+ grants) → smoke: test insert idempotency on staging row.
3. Apply **144–147** → env flags → staging wallet sign-in smoke.
4. Create Production institutional app + policy + verified callbacks.
5. Production environment promotion RPC + issue `abx_live_*`.
6. Founder genuine verification → Cursor inspects receipt + **one** metering row → mark Production institutional acceptance.

---

## Turbine claim (evidence-backed)

> Abraxas lets applications request a narrow verification decision without receiving the holder's underlying personal information. Approved results are cryptographically signed and independently verifiable. Valid decisions can be reused; newly issued decisions are accounted for exactly once.

**Demonstrated:** Demo sandbox (`dr_jSXuDfM_pFMT36du`).  
**Next:** Production activation per gates above — not additional architecture.
