# Abraxas Engineering Roadmap

**Last updated:** 2026-07-30  
**Status:** Merge chain on `main` complete. **Next:** IAT evidence → `PROTOCOL_COMPATIBILITY.md` → `RELEASE_DECISION.md` → tag `v1.0.0-beta.0` → P1. **Do not start P1 until beta.0 is tagged.** No architecture, tokenomics, or feature work until v1.0.0-beta exit criteria pass.

**Do not build new systems.** Prove the protocol works in production exactly as designed.

---

## Operating Rule (until v1.0.0-beta)

> Every change must either **validate the system**, **resolve a validated defect**, **improve operational readiness**, or **address a verified security issue**. Any other work is deferred until after v1.0.0-beta.

Security fixes are never blocked by process — but they must be verified issues, not speculative hardening.

---

## Exit Criteria — v1.0.0-beta

**Define success before the walkthrough. Do not move goalposts.**

All items must pass before Phase 2. If any item fails: fix, rerun walkthrough, re-evaluate.

| # | Criterion | Status |
|---|-----------|--------|
| 1 | All walkthrough paths (A–D) complete successfully | ⏳ |
| 2 | No Critical or High security findings remain (or explicitly accepted as documented risk) | ⏳ |
| 3 | No production-blocking bugs discovered during validation | ⏳ |
| 4 | Homepage guard and CI remain green | ⏳ |
| 5 | Logs and observability provide enough information to diagnose failures | ⏳ |
| 6 | Release audit completed; compatibility guarantees documented | ⏳ |

**Deliverable:** `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` + `docs/RELEASE_v1.0.0-beta.md`

---

## Governing Rules (post-beta)

> Every change must either (1) prove an existing capability works in production, or (2) increase the protocol's reliability, auditability, or interoperability. If a task doesn't satisfy one of those goals, defer it.

> **Security precedence:** Any finding rated **Critical** or **High** in `docs/SECURITY_THREAT_MODEL.md` takes precedence over protocol hardening and new features.

---

## Audit Scores (Two Dimensions)

Do not collapse these into a single number — they measure different things.

| Dimension | Score | Meaning |
|-----------|-------|---------|
| **Product Architecture** | **92/100** | Passport, credentials, partner flow, session receipts, reusable integration pattern — the design is strong |
| **Production Readiness** | **68/100** (post-P0) | Authorization, tenancy, consent/idempotency, policy evaluation unified — P1 (immutable policies, validity, observability) still pending |

A single "62/100" headline understates the architecture and overstates the design risk. The gap is operational, not conceptual.

---

## Phase 0 — Critical Security Fixes ✅ (before walkthrough)

Fix vulnerabilities that could invalidate the walkthrough or expose sensitive data. **Complete in code** — deploy before Phase 1.

| # | Finding | Fix |
|---|---------|-----|
| 1 | `GET /api/credentials/me` returned JWT without auth | Requires `requireBrowserSession`; address must match session |
| 2 | `GET /api/identity/status` enumerable | Requires browser session; email lookup must match session identity |
| 3 | `POST /api/auth/browser-session` minted from address only | Requires verified Google `id_token` (JWKS) + `oauth_sub` binding |
| 4 | `POST /api/idv/sync-decision` publicly callable | Requires browser session; holder-scoped only |
| 5 | `NEXT_PUBLIC_ADMIN_PIN` in client bundle | Removed; server-only `ADMIN_PIN`; admin session cookie accepted by `checkAdmin` |
| 6 | zkLogin register did not verify JWT signature | `verifyGoogleZkLoginIdToken` against Google JWKS |

**Key files:** `lib/auth/verifyZkLoginIdToken.ts`, `app/api/auth/browser-session/route.ts`, secured holder routes.

### Immediate checklist (before Phase 1)

| Step | Status | Notes |
|------|--------|-------|
| Fix `Btn` TypeScript error (`CieloBookingPanel.tsx`) | ✅ | Import restored in PR #89 |
| Confirm Vercel / CI build passes | ✅ | PR #89 green |
| Merge PR #89 | ⏳ | Ready to merge |
| Deploy to production | ⏳ | **Immediately after merge** — use that deployment for the walkthrough |
| Set `ADMIN_PIN` (server-only; remove `NEXT_PUBLIC_ADMIN_PIN`) | ⏳ | Vercel env |
| Verify `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` | ⏳ | Required for JWKS audience check |
| Run production walkthrough | ⏳ | `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` |
| Homepage unchanged (if not redesign PR) | ⏳ | `npm run check:homepage-guard` — **CI enforced**; see `docs/UI_PRESERVATION.md` |

> Merge PR #89 only after it passes CI and the production walkthrough environment is ready. Deploy immediately afterward and use that deployment for the walkthrough. **PR #89 includes the approved homepage baseline** — merging it restores production UI.

---

## Gate sequence (canonical)

```
Merge chain (#89 → #92 → #93) → main
        ↓
Production deploy (CI green, no regressions)
        ↓
Institutional Acceptance Test (IAT) — evidence, not assertion
        ↓
API freeze → docs/PROTOCOL_COMPATIBILITY.md
        ↓
docs/RELEASE_DECISION.md (sign-off)
        ↓
Tag v1.0.0-beta.0 (canonical known-good baseline)
        ↓
P1-1 Immutable policies → P1-2 Validity → P1-3 Observability → P1-4 Telemetry
        ↓
Ready to enter external security review (Trust Model v1)
        ↓
v1.0.0-beta
        ↓
Second relying party
```

**Operating rule:** Validate the canonical codebase on `main`, not a feature branch. Resist any work not tied to hardening or protocol integrity until v1.0.0-beta.

---

## Phase 1 — Institutional Acceptance Test (IAT)

**Prerequisite:** Merge chain on `main`, deployed to production.

**Mindset shift:** Not "does it work?" — _would a regulated partner sign off on this?_ Gather evidence, not assertions.

| Scenario | Question |
|----------|----------|
| A | New user → regulated purchase → approved Trust Decision + signed receipt |
| B | Returning user → credential-first, single evaluate |
| C | Expired / revoked credential → re-verification |
| D | Failure recovery → no silent failures, idempotent retry |

Per scenario, capture: Request ID, Decision ID, Receipt ID, duration, screenshot + logs, notes on deviations.

**Execution guide:** `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md`  
**Sign-off document:** `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` (includes Institutional Acceptance Summary)  
**Pre-check:** `npm run audit:production`

**Success criterion:** Scenarios A–B pass minimum; A–D as exercised; zero Critical/High defects.

**Bug fix rule:** Fix only validated defects. Rerun affected scenario before sign-off.

---

## Phase 1.2 — API freeze (after IAT passes)

Create `docs/PROTOCOL_COMPATIBILITY.md` **before** tagging. The tag must capture the complete public contract.

| Record | Purpose |
|--------|---------|
| SDK version | Partner integration baseline |
| API version | `/api/v1/*` contract |
| Supported permissions | Registry + default resolution |
| Decision schema | Trust Decision payload |
| Receipt schema | Signed receipt canonical form |
| Deprecation policy | How breaking changes ship |
| Compatibility guarantees | What integrators can rely on |

---

## Phase 1.25 — Release decision + checkpoint tag

Complete `docs/RELEASE_DECISION.md` and tag **`v1.0.0-beta.0`** on the commit that includes the compatibility document.

### v1.0.0-beta.0 snapshot criteria

All must be true:

| Criterion | Status |
|-----------|--------|
| Architecture frozen (v3) | ✅ |
| P0 hardening complete | ✅ |
| Institutional Acceptance Test passed | ⏳ |
| Threat Model v1 complete | ✅ |
| Protocol Compatibility document complete | ⏳ |
| Regression suite passing | ⏳ |
| Tagged `v1.0.0-beta.0` | ⏳ |

```bash
git tag -a v1.0.0-beta.0 -m "Canonical baseline: IAT passed, public contract frozen, pre-P1"
git push origin v1.0.0-beta.0
```

This is not general availability. It is the **permanent known-good baseline** — if P1 introduces regression, compare against this tag.

---

## Phase 1.5 — P1 Hardening

After **`v1.0.0-beta.0`** is tagged. **Before external security review** — reviewers should find unknown unknowns, not known P1s.

| Priority | Item | Rationale |
|----------|------|-----------|
| 1 | **Immutable policy versions** | Protocol integrity — receipts pin `policy_version`; no in-place `UPDATE` of `rules_json` |
| 2 | **Trust Decision validity** | API semantics — integrate `resolveReceiptValidity`; expose `currently_valid` |
| 3 | **Partner-flow observability** | `logPartnerUsage` + audit events on partner-flow routes |
| 4 | **Biometric telemetry persistence** | stdout → durable store (after protocol semantics are final) |

P0 items (idempotency, consent atomicity, policy evaluation unification, tenancy) are complete in PR #93.

**Do NOT build:** more biometric signals, AI scoring, homepage redesign, new verification methods.

---

## Phase 1.6 — External Security Review

After P1 hardening. Review against `docs/TRUST_MODEL_V1.md` (protocol security whitepaper), not raw code first.

Goal: find unknown unknowns, not confirm known P1s.

---

## Phase 1.7 — Freeze & v1.0.0-beta

After walkthrough + P1 + external review:

1. Release tag (`v1.0.0-beta`)
2. Freeze public APIs
3. Freeze credential schema
4. Freeze receipt schema (`schema_version: 1.0.0`)
5. Freeze partner callback contract
6. Freeze database schema (except versioned migrations)

From this point: **version changes, don't silently mutate behavior.**

### Release audit

Generate a **v1.0.0-beta release audit**:

> Freeze all public contracts (APIs, credential schema, receipt schema, callback payloads, database migration baseline). Produce a changelog, known limitations, and compatibility guarantees. This release becomes the baseline that all future protocol changes must remain compatible with unless explicitly versioned.

Deliverable: tagged release + `docs/RELEASE_v1.0.0-beta.md` (or equivalent).

---

## Phase 2 — Scale Prep

Only after v1.0.0-beta.

| Priority | Item |
|----------|------|
| 1 | Redirect recovery (`PartnerFlowReturnHandler`) |
| 2 | Public partner docs at `/docs/partner-flow` |
| 3 | Rate limiting |
| 4 | Backward compatibility guarantees |
| 5 | Residual endpoint hardening (`/api/trust/status`, share-history, etc.) |

---

## Phase 3 — Partner SDK (Scale)

Self-serve onboarding for partner #2:

- Developer SDK (config-driven)
- OpenAPI spec for `/api/v1/*`
- Partner dashboard / verifier analytics

---

## Phase 4 — Passport Lifecycle (product)

Present → renew → revoke → reissue → holder-facing history

---

## Phase progression

| Phase | Name | Goal |
|-------|------|------|
| 0 | Security | Close Critical/High findings before proof |
| Merge | Canonical main | #89 → #92 → #93 on `main`, deploy |
| 1 | Proof | Institutional Acceptance Test (IAT) |
| 1.2 | API freeze | `PROTOCOL_COMPATIBILITY.md` |
| 1.25 | Release + tag | `RELEASE_DECISION.md` + `v1.0.0-beta.0` |
| 1.5 | P1 Hardening | Immutable policies → validity → observability → telemetry |
| 1.6 | External review | Unknown unknowns against Trust Model v1 |
| 1.7 | Freeze | Tag v1.0.0-beta; immutable public contracts |
| 2 | Scale prep | Rate limits, docs, residual endpoint hardening |
| 3 | Scale | Partner SDK, self-serve onboarding |

---

| Document | Purpose |
|----------|---------|
| `docs/TRUST_MODEL_V1.md` | Protocol security whitepaper (enterprise reviewers) |
| `docs/SECURITY_THREAT_MODEL.md` | STRIDE design review (pre-P0; partially superseded) |
| `docs/PROTOCOL_MATURITY_AUDIT.md` | Idempotency, audit, policy gaps |
| `docs/BACKWARD_COMPATIBILITY_AUDIT.md` | API/credential/receipt stability |
| `docs/PRODUCTION_READINESS_AUDIT.md` | Live HTTP probes |
| `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` | IAT execution guide |
| `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` | IAT sign-off + Institutional Acceptance Summary |
| `docs/PROTOCOL_COMPATIBILITY.md` | Public contract freeze (before tag) |
| `docs/RELEASE_DECISION.md` | One-page release decision at beta.0 |
| `docs/UI_PRESERVATION.md` | Homepage protected surface + regression checklist |

---

## Commands

```bash
npm test                                    # 355 automated tests
npm run audit:production                    # Live HTTP probes
npm run biometric:validate-policy           # GT policy scenarios
npx vitest run lib/partner/relyingPartyFlow.test.ts
```
