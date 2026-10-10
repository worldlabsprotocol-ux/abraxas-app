# Build #514 — Release manifest

| Component | Expected | Observed (2026-10-10) | Config required | Status | Risk | Safe next action |
|-----------|----------|------------------------|-----------------|--------|------|------------------|
| Git stack | #618→#626 + #514 | Branch `cursor/controlled-demo-live-acceptance-514` from #513 | Merge order preserved | PASS | Low | Open draft PR on #626 |
| Vercel project | `abraxas-app` isolated | `prj_89NiVgA4I28AJTuapWlzuKJ4KgQ0` | Preview per branch | PASS | Med | Use READY preview sha `c457aec3` for #513 |
| Demo domain | demo.abraxasworld.xyz → Demo env | Alias not verified (403 fetch) | Demo env vars | BLOCKED | Med | Founder manual verify alias target |
| Supabase | ocntwbxarpjeixdnzide | Active; **missing 134–138 tables** | Migrations 134–138 | **FAIL** | **High** | Authorized Demo migration apply |
| Production Supabase | **OFF LIMITS** | bztwutzprwsdrtqdpymf exists separately | Hard denylist | PASS | Critical | `assertDemoSupabaseNotProduction` in preflight |
| Solana RPC | devnet HTTPS | Config-dependent | `SOLANA_*` RPC env | NOT RUN | Med | Preflight on Demo |
| Receipt signing | Server keys present | Not in agent VM | `ABRAXAS_SIGNING_KEY` | BLOCKED | High | Operator verify |
| Committer | Devnet funded key | Not in agent VM | `ABRAXAS_SOLANA_RECEIPT_COMMITMENT_PRIVATE_KEY` | BLOCKED | Med | Fund + retry script |
| Veriff | Sandbox + callback | Not verified | Veriff env | BLOCKED | Med | Demo callback URL test |
| Partner allowlists | Demo callbacks | Not verified | Partner config | NOT RUN | Med | Staging harness |
| Homepage tour CTA | Explore the demo | Local + preview build c457aec3 | #513 merged | PASS (local) | Low | Deploy after DB gate |

Machine-readable matrix: `docs/BUILD_514_ACCEPTANCE_MATRIX.json`.

## Migration readiness (read-only)

**Demo `schema_migrations` latest:** `087_stocklana_pilot` (not 134–138).

**Missing tables (required):**

- `holder_wallet_accounts`, `holder_wallet_login_challenges` (134)
- `holder_accounts` (135)
- `decision_receipt_solana_commitments` (138)

**Ordered apply plan (Demo only, operator authorization required):**

1. `134_holder_wallet_login.sql`
2. `135_canonical_holder_accounts.sql`
3. `136_cielo_verified_guest_solana_policy.sql`
4. `137_good_trouble_age_21_solana_idv.sql`
5. `138_decision_receipt_solana_commitments.sql`

Review each file for destructive ops before apply. **Do not apply to production.**

## Release verdict

**BLOCKED** — Solana-native Demo schema not ready; live E2E not evidenced.

**READY FOR SIMULATED TOUR ONLY** — after preview deploy of #513+ with homepage CTA (local/CI Playwright PASS).

**NOT READY** for full investor live journey until migrations + Phantom + partner E2E PASS with artifacts.
