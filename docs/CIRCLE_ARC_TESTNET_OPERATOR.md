# Circle Arc testnet operator runbook

DEMO / testnet infrastructure only. Abraxas is not a custodian of customer funds. Do not paste credentials into chat, URLs, PowerShell or bash history, repository files, or screenshots.

This runbook is for **Vercel Preview** and **Cloud Agent runtime** only. Do not put Circle credentials on Vercel Production.

## 1. Circle Console (testnet only)

1. Sign in at [https://console.circle.com](https://console.circle.com).
2. Open **Wallets** → **Developer-controlled**.
3. Confirm you are in the **test** / sandbox console, not live.
4. Create a **standard test API key**. Copy it once into a password manager. The value starts with `TEST_API_KEY:`. Reject any `LIVE_API_KEY:` value.
5. Generate a 32-byte entity secret locally (`openssl rand -hex 32`). Store it in the password manager. Never commit it.
6. In Console, register the entity-secret ciphertext for that secret (Console walks this once).
7. Create one **wallet set** used only for Abraxas DEMO/testnet settlement.
8. Create two **EOA wallets** in that set with blockchain `ARC-TESTNET`:
   - source: labeled `abraxas-demo-source`
   - destination: labeled `abraxas-demo-sink`
9. Copy the wallet set ID and both wallet IDs (UUIDs). Do not treat the public addresses as eligibility or ownership proof.

## 2. Secrets and allowlist (testnet only)

| Name | Where it belongs |
| --- | --- |
| `CIRCLE_ARC_TESTNET_ENABLED=true` | Vercel **Preview** env, Cloud Agent runtime env |
| `ABRAXAS_RUNTIME_ENV=demo` | Cloud Agent runtime (Preview already has `VERCEL_ENV=preview`) |
| `CIRCLE_API_KEY` | Vercel **Preview** env, Cloud Agent runtime env |
| `CIRCLE_ENTITY_SECRET` | Vercel **Preview** env, Cloud Agent runtime env |
| `CIRCLE_WALLET_SET_ID` | Vercel **Preview** env, Cloud Agent runtime env |
| `CIRCLE_DEMO_SOURCE_WALLET_ID` | Vercel **Preview** env, Cloud Agent runtime env |
| `CIRCLE_DEMO_DESTINATION_WALLET_ID` | Vercel **Preview** env, Cloud Agent runtime env |

Do not set these on Production. Do not add them to `.env.local` in git. Do not put them in query strings. Local and staging stay blocked unless `CIRCLE_ARC_TESTNET_ENABLED=true` and `ABRAXAS_RUNTIME_ENV=demo` (never with `VERCEL_ENV=production`).

Public Judge Demo (`https://demo.abraxasworld.xyz`) may **display** receipt-gated settlement evidence and pending-intent state. It must never submit a Circle transfer. See `docs/demo/JUDGE_DEMO_DEPLOYMENT.md`.

Also apply migration `089_circle_arc_testnet_settlement.sql` and then `090_circle_settlement_selection_replay.sql` to DEMO Supabase `ocntwbxarpjeixdnzide` before the first real transfer. Do not apply them until this PR is re-audited as safe. Migration 090 adds a hashed selection-token `jti` unique constraint so replay is durable across Vercel instances. Do not store raw tokens.

The server generates the Circle `idempotencyKey` as UUID v4. Do not paste a key into Launchpad or send one from the browser.

## 3. Testnet USDC without real money

1. Open [https://faucet.circle.com](https://faucet.circle.com).
2. Select **Arc Testnet** and **USDC**.
3. Request test USDC to the **source** DEMO wallet.
4. Confirm the faucet UI shows testnet. This is not mainnet USDC and is not real money.

## 4. One real Arc testnet settlement

1. Confirm Preview identity is DEMO (`ocntwbxarpjeixdnzide`) and not Production.
2. Open Partner Launchpad on that Preview.
3. Use an isolated DEMO sandbox app with a pinned active policy. For a receipt that does not claim real age verification, use the sandbox-only `sandbox_economic_demo` pack. Do not use it in Production.
4. Issue a server-verified **sandbox** signed receipt for that partner/policy/version. Partner Flow asks for the minimum evidence that pack requires. Circle settlement never adds an ID step. Sandbox product-eligibility claims expire in **30 minutes** by design (`deriveServerSandboxQualificationClaims`). After expiry, re-run sandbox Partner Flow (privacy-preserving or partner age check) on the same `sandbox_economic_demo` app until a new approved `sandbox_only` receipt is issued. Do not reuse an expired receipt.
5. On **Arc testnet settlement**, choose an eligible sandbox receipt. Do not paste a receipt ID or supply a Circle idempotency key.
6. Create the DEMO settlement intent. It must start `pending`. Creating an intent must not call Circle or move USDC.
7. Review the pending card (sandbox/testnet, integer amount, receipt, policy/version, ARC-TESTNET / USDC). It must say **No funds moved yet.**
8. Check the one-time confirmation and use **Submit testnet transfer**. Only that step may call Circle, and only for this pending DEMO intent.
9. Refresh until `provider_state` is `COMPLETE` and intent state is `settled`. Replay create or submit. Expect a duplicate and no second transfer.
10. Repeat with denied, expired, revoked, unsigned, wrong-partner, and wrong-policy receipts. Those must fail closed and never settle.

## 5. Safe video demo

Record Launchpad only:

- Show the DEMO / Arc testnet infrastructure copy.
- Show intent `pending` then `settled`.
- Show safe evidence fields only (no API keys, entity secrets, wallet addresses, or raw payloads).
- Show a duplicate replay blocked.
- Show a denied or expired receipt blocked.
- Crop or pause before any password-manager or Vercel env screen.

Do not film Circle Console secret pages.

## 6. Rotate or revoke

1. In Circle Console, create a new test API key, then revoke the old key.
2. Generate a new entity secret and register a new ciphertext. This generally requires a **new wallet set** and new DEMO wallets; update Preview/runtime IDs together.
3. Remove old values from Vercel Preview and Cloud Agent runtime immediately.
4. Fund the new source wallet from the faucet.
5. Confirm Production still has **no** Circle variables.

Until Preview has these secrets, the DEMO/Preview allowlist, and DEMO has migrations 089 and 090, Launchpad must show `circle_unavailable` / schema unavailable / environment blocked and must not claim a live Circle integration.
