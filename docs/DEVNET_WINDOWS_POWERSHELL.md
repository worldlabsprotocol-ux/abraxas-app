# Devnet wiring — Windows PowerShell runbook

Pick up here: **fund sponsor wallet → mint IssuanceCap → set Vercel env → verify**.

Use **devnet until Gate #2 audit clears**, then follow `docs/MAINNET_CUTOVER.md` for mainnet publish.

---

## What you need (devnet on-chain Passport)

| Vercel variable | Required? | Notes |
|-----------------|-----------|--------|
| `SUI_NETWORK` | **Yes** | `devnet` (not `mainnet` until package published) |
| `NEXT_PUBLIC_SUI_NETWORK` | **Yes** | `devnet` |
| `SUI_SPONSOR_SECRET_KEY` | **Yes** | Full `suiprivkey1…` export — no quotes |
| `SUI_ISSUANCE_CAP_OBJECT_ID` | **Yes** | Exactly **66 chars** (`0x` + 64 hex) from **your** mint |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Off-chain credentials + passport rows |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Server routes |
| `ABRAXAS_SIGNING_KEY` | **Yes** | W3C JWT + authentication proofs |
| `ABRAXAS_PUBLIC_KEY` | **Recommended** | Independent proof verify |
| `VERIFF_API_KEY` | **Yes** (live IDV) | Or `IDV_PROVIDER=manual` for pilot |
| `VERIFF_SECRET` | **Yes** | Webhook HMAC — **not** `VERIFF_SECRET_KEY` alone |

### Safe to delete or leave unset (devnet phase)

| Variable | Why |
|----------|-----|
| `SUI_ISSUER_SECRET_KEY` | Legacy alias — use only `SUI_SPONSOR_SECRET_KEY` |
| `SUI_NETWORK=mainnet` | Breaks on-chain until `deployment.mainnet.json` has `packageId` |
| `NEXT_PUBLIC_VERIFICATION_PROGRAM_ID` | Solana placeholder — not Abraxas verify layer |
| `MOONPAY_*` / `RAMP_*` | Only if you are not testing fiat on-ramp |
| `RECLAIMPROTOCOL_*` | Only if social Reclaim verify is off |
| `PILOT_TIER3_SCREENING` | Sandbox demo only — leave unset in prod |
| `ASSET_MONITORING_AUTO_APPLY` | Gate #6 — later |

---

## Prerequisites (Windows)

1. **Sui CLI** at `C:\sui\sui.exe` (or on PATH as `sui`)
2. **Your sponsor wallet** imported into Sui CLI (seed phrase or `suiprivkey1` export)
3. **Project folder** — e.g. `C:\Users\deant\OneDrive\Desktop\abraxas-app-main\abraxas-app-main`

```powershell
$sui = "C:\sui\sui.exe"   # adjust if different
& $sui --version            # expect 1.76.x or similar
```

---

## Step 0 — Point CLI at devnet

```powershell
& $sui client switch --env devnet
& $sui client active-address
```

Note your **sponsor address** (example: `0xa4d1f13d…` — use **yours**, not docs examples).

```powershell
& $sui client active-env
# should show devnet
```

---

## Step 1 — Fund sponsor wallet (gas)

**Option A — CLI faucet**

```powershell
& $sui client switch --address 0xYOUR_SPONSOR_ADDRESS
& $sui client faucet
& $sui client gas
```

**Option B — Web faucet**

- https://faucet.sui.io — paste address, select **Devnet**
- Need ~0.1 SUI minimum; 1 SUI is comfortable

---

## Step 2 — Check if Move package still exists on devnet

Repo package ID (updated after devnet reset **2026-07-25**):

```
0x946e7f2878e58525638549a486462c820c175dfbd3404cce66a02d25b0e86551
```

**Old ID (stale — do not use):** `0xb8e6537bd17dfadc741f328bf8bdb41fdad43f3f145b695a5b9f205ec520f37a`

```powershell
$sui = "C:\sui\sui.exe"
$packageId = "0x946e7f2878e58525638549a486462c820c175dfbd3404cce66a02d25b0e86551"

# Run WITHOUT --json first — you must see JSON, not an error line
& $sui client call `
  --package $packageId `
  --module passport `
  --function mint_cap `
  --gas-budget 20000000
```

| Result | Action |
|--------|--------|
| JSON with `objectChanges` + new cap | **Package OK** — skip to Step 4, copy cap `objectId` |
| `code: 'Some requested entity was not found'` / `Object … not found` | **Devnet reset** — do Step 3 redeploy |
| `ConvertFrom-Json : Invalid JSON primitive: code` | Same as above — CLI printed an error, not JSON. Re-run **without** `--json` to read it |

### If `ConvertFrom-Json` fails

PowerShell error `Invalid JSON primitive: code` means `$raw` is **not** JSON. The Sui CLI printed a plain-text error like:

```
code: 'Some requested entity was not found', message: "Object 0xb8e6… not found"
```

**Fix:** redeploy (Step 3), then use the **new** `$packageId` in Step 4.

Safe capture pattern:

```powershell
$raw = & $sui client call `
  --package $packageId `
  --module passport `
  --function mint_cap `
  --gas-budget 20000000 `
  --json 2>&1

Write-Host "RAW OUTPUT:"
Write-Host $raw

if ($raw -is [string] -and $raw.TrimStart().StartsWith("{")) {
  $out = $raw | ConvertFrom-Json
} else {
  Write-Host "ERROR: Not JSON — redeploy package (Step 3) or fix packageId"
  return
}
```

---

## Step 3 — Redeploy package (only if Step 2 failed)

From project root in PowerShell:

```powershell
cd C:\Users\deant\OneDrive\Desktop\abraxas-app-main\abraxas-app-main

& $sui move build --path sui\abraxas_passport --build-env testnet

cd sui\abraxas_passport
$publishRaw = & $sui client test-publish --build-env testnet --json 2>&1
Write-Host $publishRaw
$publish = $publishRaw | ConvertFrom-Json
cd ..\..
```

Extract new package ID:

```powershell
$packageId = ($publish.objectChanges | Where-Object { $_.type -eq "published" }).packageId
Write-Host "NEW PACKAGE ID: $packageId"
```

Update `lib\sui\deployment.devnet.json` → `packageId` with this value, commit, and push (or note it for mint-cap only if you are not committing yet).

---

## Step 4 — Mint **your** IssuanceCap

Use **your** active sponsor address (must own the cap):

```powershell
$sui = "C:\sui\sui.exe"
$sponsor = "0xa4d1f13d192d9c215642ae2eaeea5371e737c911c573c2238f8f14970f1d2246"

& $sui client switch --env devnet
& $sui client switch --address $sponsor

$packageId = "0x946e7f2878e58525638549a486462c820c175dfbd3404cce66a02d25b0e86551"
# ^ use NEW id from Step 3 if you redeployed yourself

$raw = & $sui client call `
  --package $packageId `
  --module passport `
  --function mint_cap `
  --gas-budget 20000000 `
  --json 2>&1

if (-not ($raw -is [string]) -or -not $raw.TrimStart().StartsWith("{")) {
  Write-Host "mint_cap failed (not JSON):"
  Write-Host $raw
  return
}

$out = $raw | ConvertFrom-Json

$capId = ($out.objectChanges | Where-Object { $_.objectType -like "*IssuanceCap*" }).objectId
$tx = $out.digest

Write-Host ""
Write-Host "ISSUANCE CAP ID (copy to Vercel):"
Write-Host $capId
Write-Host ""
Write-Host "Tx: $tx"
Write-Host "Length: $($capId.Length)  (must be 66)"
```

**Do not use** the old demo cap `0xee6c6f7e…` — it belongs to the legacy deploy wallet `0xcf8fa9…`.

---

## Step 5 — Export sponsor private key for Vercel

```powershell
& $sui keytool export --key-identity 0xYOUR_SPONSOR_ADDRESS --key-scheme ed25519
```

Copy the full line starting with `suiprivkey1` — **never** paste in chat, GitHub, or screenshots.

---

## Step 6 — Vercel environment variables

**Vercel → Project → Settings → Environment Variables → Production**

Set or update:

```
SUI_NETWORK=devnet
NEXT_PUBLIC_SUI_NETWORK=devnet
SUI_SPONSOR_SECRET_KEY=suiprivkey1...(full export, no quotes)
SUI_ISSUANCE_CAP_OBJECT_ID=0x...(66 characters from Step 4)
```

Also confirm for full verify layer:

```
VERIFF_API_KEY=...
VERIFF_SECRET=...          ← webhook uses THIS name
ABRAXAS_SIGNING_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Delete if present:**

- `SUI_ISSUER_SECRET_KEY` (duplicate)
- `SUI_NETWORK=mainnet` (until mainnet deploy)
- Truncated or old `SUI_ISSUANCE_CAP_OBJECT_ID`

**Redeploy** Vercel after saving (Deployments → Redeploy).

---

## Step 7 — Verify wiring (no wallet needed)

```powershell
Invoke-RestMethod "https://abraxas-app.vercel.app/api/sui/passport/sponsor" | ConvertTo-Json -Depth 6
```

You want:

```json
{
  "issuer_fully_configured": true,
  "cap_owner_matches_sponsor": true,
  "configured": true
}
```

If `fix_hints` appears, fix each item (wrong cap length, key invalid, cap not owned by sponsor, package missing on network).

IDV health:

```powershell
Invoke-RestMethod "https://abraxas-app.vercel.app/api/idv/health" | ConvertTo-Json
```

`veriff_secret` should be `true`.

---

## Step 8 — End-to-end test (Passport)

1. Open `/passport` — sign in with Google (zkLogin) — **this is a different wallet than sponsor**
2. Complete Veriff (or manual IDV if configured)
3. After approve, UI should show on-chain passport object + Suiscan link

Manual provision retry (replace holder address from Passport UI):

```powershell
$body = @{ sui_address = "0xYOUR_ZKLOGIN_HOLDER_ADDRESS" } | ConvertTo-Json
Invoke-RestMethod -Method POST `
  -Uri "https://abraxas-app.vercel.app/api/sui/passport/provision" `
  -ContentType "application/json" `
  -Body $body
```

---

## Two wallets (common confusion)

| Wallet | Role |
|--------|------|
| **Sponsor** (`SUI_SPONSOR_SECRET_KEY`) | Server wallet — pays gas, holds IssuanceCap, signs `create_passport` |
| **Holder** (Google zkLogin on `/passport`) | End user — receives Passport object |

They are **never** the same address.

---

## Path to mainnet (after devnet is green)

1. Complete Move audit (Gate #2)
2. `CONFIRM_MAINNET=1 npm run sui:deploy:mainnet` (Git Bash or WSL)
3. `npm run sui:mint-cap -- mainnet`
4. Fund **mainnet** sponsor with real SUI
5. Flip Vercel: `SUI_NETWORK=mainnet`, new cap ID, redeploy
6. See `docs/MAINNET_CUTOVER.md`

---

## Quick troubleshooting

| Symptom | Fix |
|---------|-----|
| `ConvertFrom-Json : Invalid JSON primitive: code` | Package missing on devnet — run Step 3 redeploy, use new `packageId` |
| `Package object does not exist` / `Object … not found` | Redeploy Step 3, update `packageId` |
| `cap_owner_matches_sponsor: false` | Mint cap again while **sponsor address** is active |
| Cap length ≠ 66 | Re-copy full `0x` + 64 hex |
| `invalid private key` | Re-export `suiprivkey1`, no spaces/quotes |
| Veriff works but no on-chain stamp | Check sponsor endpoint + redeploy Vercel |
| Webhook fails | Set `VERIFF_SECRET` (not only `VERIFF_SECRET_KEY`) |
