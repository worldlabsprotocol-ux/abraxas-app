# Sponsor wallet setup (your wallet, not the deploy wallet)

Use **your own wallet** as the Abraxas sponsor. The old deploy wallet (`0xcf8fa9…`) is only needed if you still have its private key — you don't, so mint a fresh **IssuanceCap** for your wallet instead.

## Two different wallets (don't mix them up)

| Wallet | What it is | Example |
|--------|------------|---------|
| **User / holder** | Created by Google zkLogin on `/passport` — one per user | Changes every user |
| **Sponsor / issuer** | Server wallet in Vercel — pays gas, signs `create_passport` | `0xca93b228…` (yours) |

Your Google email wallet from long ago is **not** the sponsor wallet unless you import that same key into the server. For Abraxas, use your OG wallet `0xca93b2281e4ec4cdc7bc0d73935b4b02b7e18684c7e543773cf096443e102124`.

---

## Step 1 — Get devnet SUI (gas money)

Pick one:

**A. Sui CLI (easiest if you import your wallet)**
```bash
sui client switch --address 0xca93b2281e4ec4cdc7bc0d73935b4b02b7e18684c7e543773cf096443e102124
sui client faucet
```

**B. Web faucet**
- https://faucet.sui.io/ — paste your address, select **Devnet**
- Or Suiscan devnet faucet: https://suiscan.xyz/faucet

You need a small amount (0.1+ SUI is plenty for many passport provisions).

---

## Step 2 — Import your OG wallet into Sui CLI

There is **no placeholder** for `SUI_SPONSOR_SECRET_KEY`. It must be a real private key. If you have a **12-word seed phrase** for `0xca93…`:

```bash
sui keytool import "word1 word2 word3 ... word12" ed25519
sui client switch --address 0xca93b2281e4ec4cdc7bc0d73935b4b02b7e18684c7e543773cf096443e102124
```

**If your wallet is only in Sui Wallet browser extension:**
1. Open Sui Wallet extension
2. Click the account → **Settings** (gear)
3. **Export Private Key** (not the seed phrase — either works for import)
4. Import into CLI:
   ```bash
   sui keytool import "<paste private key or seed phrase>" ed25519
   ```

**Google / zkLogin-only wallet from years ago:** If you never saved a seed phrase and only used Google login in Sui Wallet, you **cannot** export a server key for that account. Use your OG seed-phrase wallet (`0xca93…`) instead — that's the right choice.

---

## Step 3 — Mint YOUR IssuanceCap (no redeploy needed)

The old cap (`0xee6c6f7e…`) belongs to the deploy wallet you can't access. Mint a new cap for your wallet:

```bash
npm run sui:mint-cap
# or: bash scripts/sui/mint-issuance-cap.sh
```

This prints a **new** `SUI_ISSUANCE_CAP_OBJECT_ID` — use that, not the old `0xee6c6f7e…` value.

---

## Step 4 — Export private key for Vercel

```bash
sui keytool export --key-identity 0xca93b2281e4ec4cdc7bc0d73935b4b02b7e18684c7e543773cf096443e102124
```

Copy the full output (starts with `suiprivkey1`). **Never paste this in chat or GitHub.**

---

## Step 5 — Vercel environment variables

```
SUI_SPONSOR_SECRET_KEY=suiprivkey1…your-full-export-here…
SUI_ISSUANCE_CAP_OBJECT_ID=0x…new-cap-from-mint-cap-script…
```

There is no fake/placeholder value — leave both **unset** if you only want off-chain Veriff + JWT (that still works). On-chain stamps require real values.

Redeploy Vercel after saving.

---

## Step 6 — Supabase (one-time)

Supabase → SQL Editor → paste and run:

`docs/SUPABASE_ABRAXAS_SETUP.sql`

---

## Verify it works

1. Complete Veriff on `/passport`
2. Off-chain: banner shows "Identity verified — ready to transact" automatically
3. On-chain: banner shows Sui object ID + Suiscan link (after sponsor env + faucet + redeploy)

Manual retry if webhook ran before env was set:
```bash
curl -X POST https://abraxas-app.vercel.app/api/sui/passport/provision \
  -H "Content-Type: application/json" \
  -d '{"sui_address":"0xYOUR_ZKLOGIN_HOLDER_ADDRESS"}'
```
