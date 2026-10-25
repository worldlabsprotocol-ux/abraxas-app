# Sandbox environment — do not mix hosts

Partners must use **one Abraxas deployment** for enrollment, API keys, Partner Flow, callbacks, receipts, and portable export. Mixing Production and Demo causes 404 exports, policy mismatches, and wrong trust anchors.

## Recommended pilot stack (wallet-control)

Use **Demo** end-to-end for the first external design partner:

| Concern | Use this |
|---------|----------|
| Developer signup / Integration Studio | `https://demo.abraxasworld.xyz/developers/integration-studio` |
| Partner Kit `baseUrl` / `ABRAXAS_BASE_URL` | `https://demo.abraxasworld.xyz` |
| Hosted Partner Flow | `https://demo.abraxasworld.xyz/partner/verify` (via `verification_url`) |
| Portable export | `GET https://demo.abraxasworld.xyz/api/receipts/{receipt_id}/portable-verification` |
| Trust anchor `environment` field | `demo` (template: `examples/portable-relying-party/trust-config.demo.template.json`) |
| Standalone verify env | `RP_ENVIRONMENT=demo`, `RP_ABRAXAS_BASE_URL=https://demo.abraxasworld.xyz` |

**Live probe (2026-10-25, agent):**

| URL | HTTP |
|-----|------|
| `https://demo.abraxasworld.xyz/developers/integration-studio` | 200 |
| `https://demo.abraxasworld.xyz/api/receipts/dr_jSXuDfM_pFMT36du/portable-verification` | 200 (reference receipt) |
| `https://abraxasworld.xyz/api/receipts/dr_jSXuDfM_pFMT36du/portable-verification` | 404 (receipt not on Production) |
| `https://abraxasworld.xyz/developers/integration-studio` | 200 (Production — different tenant DB) |

## Production host (`abraxasworld.xyz`)

Use Production only when the partner sandbox application and API keys are **provisioned on Production** and portable export is confirmed for that environment. Do not point Production Integration Studio credentials at Demo URLs or vice versa.

## API keys

- Prefix `abx_test_…` = sandbox tier on the deployment that issued the key.
- Deliver keys only through a **secure channel** (password manager share, encrypted email, etc.).
- Never embed keys in repository docs, example env files committed to git, or public chat.

## Wallet-control reference identifiers (Demo acceptance — not secrets)

Used in internal acceptance for receipt `dr_jSXuDfM_pFMT36du`:

- `partner_id`: `studio-accept-wc-1792620888278-6a4a2447dfc8`
- `policy_id`: `studio-accept-wc-1792620888278-6a4a2447dfc8-wallet_control-v1`

New external partners receive **their own** ids via founder provisioning — do not reuse studio acceptance keys in production pilot without explicit ops approval.

## Blockers before invite

| Blocker | Check |
|---------|--------|
| Export 503 on partner host | Hit portable-verification for a fresh sandbox receipt; ops must enable issuer export env on that deployment |
| Callback not allowlisted | Partner `return_url` exact match on application |
| Anchor mismatch | Fingerprint matches out-of-band anchor for same `environment` |
| Wrong base URL | All server config uses same host column as above |
