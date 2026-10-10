# Founder Demo acceptance kit (Build #514)

Use only **Demo** (`ocntwbxarpjeixdnzide`) and **non-production** URLs. Never paste service-role keys, committer private keys, or Veriff secrets into chat.

## Approved URLs (verify before demo)

| Surface | URL |
|---------|-----|
| Demo domain | https://demo.abraxasworld.xyz |
| Vercel preview (#513 stack, when READY) | `abraxas-3bm3s7y1a-worldlabsprotocol-uxs-projects.vercel.app` (confirm latest in Vercel dashboard) |
| Simulated tour | `/experience/tour` |
| Real Passport | `/passport` |
| Receipt verify | `/verify?mode=receipt` |

## Pre-flight (operator)

1. `npm run release-gate:build514` with Demo env pulled locally **or** inspect Vercel Demo env: Supabase URL must be `ocntwbxarpjeixdnzide`, **never** `bztwutzprwsdrtqdpymf`.
2. Confirm migrations **134–138** applied on Demo (tables: `holder_wallet_accounts`, `holder_accounts`, `decision_receipt_solana_commitments`).
3. `npm run preflight:build512-demo` — all critical checks PASS or documented WARN.

## Judge / investor (simulated — no wallet)

1. Open homepage → click **Explore the demo**.
2. Complete tour; confirm **Simulated demonstration** banner throughout.
3. Optional: click **Open real Passport** at end — do not upload real ID for judge path.

**Screenshot:** homepage + tour complete + simulated badge.

## Phantom holder (real)

1. Open `/passport` on Demo preview.
2. Connect Phantom (founder-tested wallet).
3. Refresh page — session should persist (no sign-in loop).
4. Switch wallet — expect subject reset / re-bind (no cross-holder bleed).

**Failure signals:** repeated sign-in, blank Passport, correlation ref on partner errors without next step.

## Passport / IDV (real)

1. Start verification from Passport when policy requires L2 evidence.
2. Pending review must not show “verified”.
3. After human approval, verified state must match server (not tour simulation).

## Cielo verified-rate (real)

1. Start from Cielo’s **approved** Demo verification link (from Launchpad or partner config — do not invent URLs).
2. Confirm disclosure: eligibility category, not booking/payment.
3. Consent explicitly — no auto-consent.
4. Receipt signature valid; return URL matches allowlist.

## Good Trouble 21+ (real)

1. Use Good Trouble **L2 Solana age-21** policy entry (not L0 self-attest).
2. Confirm no DOB/document fields sent to partner.
3. Denied consent → nothing shared.

## Evidence reuse (real)

1. Complete first qualifying partner with genuine verification.
2. Open second partner request — expect **consent-only** path when server reuse hint applies.
3. Measure clicks/time manually; record correlation / flow trace IDs from UI.

## Solana commitment (real, when enabled)

1. Issue eligible receipt on Demo with commitments flag enabled.
2. Wait for confirmed devnet tx; open Solana Explorer (devnet).
3. On-chain memo must be `{p,v:2,d}` only — no receipt id or PII.

## Reporting failures

Capture: URL, step, **Reference** (`pv_…` or flow trace), screenshot, timestamp. Do not include signed payloads or ID images.
