# Stocklana × Abraxas — Hackathon Submission

## Short description (≤280 characters)

Stocklana is a Solana tokenized-stock demo: connect Phantom, pick a PreStocks SPL asset verified on-chain, complete Abraxas hosted verification, and see permitted/denied eligibility from a signed receipt—no DOB, address, or documents returned.

## Recommended sponsor selections

| Sponsor | Recommendation |
|---------|----------------|
| **Main track** | Yes — primary submission |
| **PreStocks** | **Remove** — no official PreStocks partner API; integration is public mint + on-chain verify only |
| Meteora, Clawpump, Tessera, Pyth | No — not used |

## What works end-to-end

| Capability | Status |
|------------|--------|
| Solana wallet connect (Phantom/Solflare) on `/stocklana` | Works |
| Curated PreStocks SPL mint catalog with product page links | Works |
| On-chain Token-2022 mint verification via Solana RPC | Works |
| Abraxas hosted verify redirect (`/partner/verify`) | Works when `stocklana-demo` partner seeded (migration 087 on DEMO) |
| Server-side receipt validation (`POST /api/stocklana/eligibility`) | Works |
| Permitted / denied / pending / expired / error UI states | Works |
| US jurisdiction denial (`blocked_jurisdictions: ["US"]`) | Works when holder residency resolves to US |
| Partner-visible payload excludes PII | Enforced in tests |

## What is simulated

| Item | Notes |
|------|-------|
| Stocklana trading / purchase | Button is demo-only; no live trade execution |
| PreStocks quotes / AUM / volume | Not shown — no API |
| Solana wallet in Abraxas verify | Holder auth remains Sui zkLogin + Passport (documented in UI) |

## What remains unbuilt

| Item | Notes |
|------|-------|
| PreStocks official API integration | No public API found |
| Production partner promotion | Sandbox pilot only (`087_stocklana_pilot.sql`) |
| On-chain eligibility attestation on Solana | Receipt validated server-side; no Solana program |
| Automated US/non-US test personas without real IDV | Requires real Passport verification paths |

## Architecture honesty

| Layer | Technology |
|-------|------------|
| Stocklana app shell | Solana wallet adapter (mainnet) |
| Abraxas verification | Sui zkLogin + Passport + Partner Flow |
| Proof to Stocklana | Signed decision receipt (`GET /api/receipts/{id}/public`) |
| Database | Partner/policy rows via migration 087 (DEMO only for staging; after launchpad 086) |

## Operator setup (DEMO Supabase only)

1. Apply `supabase/migrations/087_stocklana_pilot.sql` on **DEMO** (`ocntwbxarpjeixdnzide`) after launchpad `086_partner_launchpad_provision_schema_fix.sql` — never MAIN.
2. Deploy preview branch (`cursor/stocklana-solana-eligibility-d541`).
3. Migration 087 allowlists the PR #292 preview callback URL; re-apply or merge `allowed_return_urls` if the Vercel hostname changes.
4. Run holder flow with non-US verified residency for permitted path; US document for denied path.

## Recording script (90s)

1. Open `/stocklana` — read disclaimer.
2. Select **OPENAI** — show on-chain mint verified.
3. Connect Phantom — show Solana address.
4. Click **Verify eligibility with Abraxas** — complete Passport verify (Google zkLogin).
5. Land on `/stocklana/callback` — show permitted or denied state.
6. Expand **What Stocklana received** — point out no DOB/address fields.
7. For US denial: repeat with US-verified holder; show purchase blocked + jurisdiction notice.

## Submission checklist

- [ ] Migration 087 applied on DEMO preview database
- [ ] `/stocklana` loads on preview URL
- [ ] Mint verification green for OPENAI asset
- [ ] Full verify → callback → receipt validation recorded on video
- [ ] US test shows denied purchase path
- [ ] GitHub PR link included
- [ ] Preview URL + commit SHA in submission form
- [ ] PreStocks sponsor box **unchecked** (honest scope)
