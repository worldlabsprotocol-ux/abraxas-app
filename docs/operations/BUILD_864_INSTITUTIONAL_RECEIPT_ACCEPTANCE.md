# Build #864 — Institutional receipt acceptance (Demo)

## Objective

One continuous institutional verification on **Demo** (`https://demo.abraxasworld.xyz`): Integration Studio provision → partner session → policy-bound handoff → **holder wallet authorization** → genuine signed receipt → **independent** portable verification.

No harness JSON, no simulated holder completion.

## Deployment reconciliation (2026-10-27)

| Item | Status |
| --- | --- |
| PR #863 (861–863 stack) | **Open** — not merged to `main` |
| PR #861 / #862 | **Open** — superseded by #863 branch; close after #863 merges with changes retained |
| Demo `commit_sha` (`/api/launchpad/staging/environment`) | `f6234e1c…` — **behind** agent branch `26bc0061…`; Demo uses Vercel custom env `env_OILNDL1XzhouauSEnyVNGapIKsY2` (promote after merge) |
| Demo Supabase ref | `ocntwbxarpjeixdnzide` (distinct from Preview) |
| Partner session on Demo | **200** with sandbox API key |
| Portable export infrastructure | **Configured** (`status_evidence_authoritative: true` on reference receipt probe) |

## Executable acceptance

```bash
export LAUNCHPAD_STAGING_URL=https://demo.abraxasworld.xyz
export LAUNCHPAD_EXPECTED_SUPABASE_REF=ocntwbxarpjeixdnzide
npm run build864:demo-institutional-receipt-acceptance
```

Artifact: `/opt/cursor/artifacts/build-864-demo-institutional-receipt-acceptance.json`

### Proven on Demo (2026-10-27 run)

| Phase | Result |
| --- | --- |
| Policy template `wallet_control` provision | Pass |
| Partner console session | Pass |
| Partner handoff (`vr_*`) | Pass |
| Holder `partner_verify` Solana signature + browser session | Pass |
| Method qualification + sharing consent + `partner-flow/complete` | Pass |
| **Genuine receipt issuance** | Pass |
| Independent verifier: cryptographic integrity, issuer authority, audience, signed status | Pass |
| Independent verifier: **`currently_acceptable: yes`** | **Fail** — `evidence_current: false` |
| Public receipt probe | `invalidation_reasons`: `evidence_dependency_store_unavailable`, `sandbox_only_not_production_usable` |
| Adversarial (wrong pin, wrong audience, tampered payload) | Rejected as expected |

### Remaining gate

Demo operational store cannot resolve evidence dependency graph (`evidence_dependency_store_unavailable`), so portable status marks **`evidence_current: false`** immediately after issuance. Cryptographic and issuer paths succeed; **current decision validity** fails closed until Demo Postgres has evidence-dependency persistence (see migration `113_decision_receipt_evidence_dependencies.sql` and Demo promotion checklist in Build #823 / #824 docs).

## UX acceptance

- **HTTP execution states** above are backed by API responses (not navigation-only).
- Playwright `integration-studio-provisioned-e2e` against Demo **timed out** on legacy UI copy (`Integration callback URL` label missing on Demo commit `f6234e1c…`). Re-run after Demo promotion to #863 stack for browser UX parity with Preview.

## Next technical priority

1. Merge **#863** and **promote** Demo to the merged deployment.
2. Apply / verify **evidence dependency** schema on Demo Supabase so fresh wallet-control receipts export with `evidence_current: true`.
3. Re-run `npm run build864:demo-institutional-receipt-acceptance` until `currently_acceptable` is **yes**.
4. Then pursue second-partner repeatability (post-864 scope).
