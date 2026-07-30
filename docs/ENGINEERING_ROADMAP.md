# Abraxas Engineering Roadmap

**Last updated:** 2026-07-29  
**Status:** Phase 0 code complete. Awaiting green CI → merge → deploy → Phase 1 walkthrough.

**Do not build new systems.** From here the goal is to graduate Abraxas from a project into infrastructure.

---

## Governing Rules

> Every change must either (1) prove an existing capability works in production, or (2) increase the protocol's reliability, auditability, or interoperability. If a task doesn't satisfy one of those goals, defer it.

> **Security precedence:** Any finding rated **Critical** or **High** in `docs/SECURITY_THREAT_MODEL.md` takes precedence over protocol hardening and new features. Do not continue roadmap work until every Critical finding is either fixed or explicitly accepted as a documented risk.

---

## Audit Scores (Two Dimensions)

Do not collapse these into a single number — they measure different things.

| Dimension | Score | Meaning |
|-----------|-------|---------|
| **Product Architecture** | **92/100** | Passport, credentials, partner flow, session receipts, reusable integration pattern — the design is strong |
| **Production Readiness** | **63/100** | Security hardening, operational validation, idempotency, audit trail, policy versioning — not yet infrastructure-grade |

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
| Confirm Vercel / CI build passes | ⏳ | Merge only after green — security work doesn't matter if the branch can't deploy |
| Merge PR #89 | ⏳ | **Only after CI passes** and walkthrough environment is ready |
| Deploy to production | ⏳ | **Immediately after merge** — use that deployment for the walkthrough |
| Set `ADMIN_PIN` (server-only; remove `NEXT_PUBLIC_ADMIN_PIN`) | ⏳ | Vercel env |
| Verify `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` | ⏳ | Required for JWKS audience check |
| Run production walkthrough | ⏳ | `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` |
| Homepage unchanged (if not redesign PR) | ⏳ | `npm run check:homepage` — see `docs/UI_PRESERVATION.md` |

> Merge PR #89 only after it passes CI and the production walkthrough environment is ready. Deploy immediately afterward and use that deployment for the walkthrough. **PR #89 includes the approved homepage baseline** — merging it restores production UI.

---

## Phase 1 — Production Walkthrough

**Prerequisite:** Phase 0 deployed to production.

Validate with a real Google account + admin access:

- Path A — New user (Passport → admin approve → GT enter)
- Path B — Returning user (credential-first, one evaluate)
- Path C — Expired / revoked credential
- Path D — Redirect recovery

Checklist: `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md`  
Pre-check: `npm run audit:production`

**Bug fix rule:** Fix only bugs found. Do not start Phase 2 until Path A + B pass.

---

## Phase 1.5 — Freeze

After walkthrough passes (Paths A + B minimum):

1. Release tag (`v1.0.0-beta`)
2. Freeze public APIs
3. Freeze credential schema
4. Freeze receipt schema (`schema_version: 1.0.0`)
5. Freeze partner callback contract
6. Freeze database schema (except versioned migrations)

From this point: **version changes, don't silently mutate behavior.**

### Release audit (request after walkthrough passes)

Before Phase 2, generate a **v1.0.0-beta release audit**:

> Freeze all public contracts (APIs, credential schema, receipt schema, callback payloads, database migration baseline). Produce a changelog, known limitations, and compatibility guarantees. This release becomes the baseline that all future protocol changes must remain compatible with unless explicitly versioned.

Deliverable: tagged release + `docs/RELEASE_v1.0.0-beta.md` (or equivalent).

---

## Phase 2 — Protocol Hardening (Scale prep)

Only after Phase 1 + 1.5.

| Priority | Item |
|----------|------|
| 1 | Idempotency (session receipts, verification requests) |
| 2 | Unified audit trail |
| 3 | Immutable policy versioning |
| 4 | Redirect recovery (`PartnerFlowReturnHandler`) |
| 5 | Public partner docs at `/docs/partner-flow` |
| 6 | Rate limiting |
| 7 | Backward compatibility guarantees |

**Do NOT build:** more biometric signals, AI scoring, homepage redesign, new verification methods.

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
| 1 | Proof | Production walkthrough with evidence |
| 1.5 | Freeze | Tag baseline; immutable public contracts |
| 2 | Hardening | Idempotency, audit, policy versioning |
| 3 | Scale | Partner SDK, self-serve onboarding |

---

| Document | Purpose |
|----------|---------|
| `docs/SECURITY_THREAT_MODEL.md` | STRIDE design review |
| `docs/PROTOCOL_MATURITY_AUDIT.md` | Idempotency, audit, policy gaps |
| `docs/BACKWARD_COMPATIBILITY_AUDIT.md` | API/credential/receipt stability |
| `docs/PRODUCTION_READINESS_AUDIT.md` | Live HTTP probes |
| `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` | Phase 1 manual script |
| `docs/UI_PRESERVATION.md` | Homepage protected surface + regression checklist |

---

## Commands

```bash
npm test                                    # 355 automated tests
npm run audit:production                    # Live HTTP probes
npm run biometric:validate-policy           # GT policy scenarios
npx vitest run lib/partner/relyingPartyFlow.test.ts
```
