# Abraxas Identity Layer (AIL)

**Universal Trust Infrastructure for Tokenized Assets and Digital Identity**

> Verify Once. Transact Everywhere.

Abraxas is **not a KYC provider**. It is a **trust and credential orchestration layer**. Licensed verifiers (Veriff, manual review) perform identity checks; Abraxas records only cryptographic proof — credential hash, issuer, expiration, sanctions status, wallet binding — and lets any participating protocol ask *"Is this wallet verified?"* instead of re-running KYC.

Live (beta): **[https://abraxasworld.xyz](https://abraxasworld.xyz)**  
Legacy alias: `abraxas-app.vercel.app` (do not use for new integrations)  
Home / verify: **`/passport`** · Partner Flow: **`/docs/partner-flow`** · Integration status: **`docs/INTEGRATION_READINESS_RECONCILIATION.md`**

---

## Hybrid chain architecture

Abraxas intentionally splits responsibilities across two chains:

| Chain | Role |
|-------|------|
| **Sui** | Identity, zkLogin, W3C credentials, Move Passport, USDC booking/settlement |
| **Solana** | $ABRA SPL token (optional access tiers — verification is **not** gated) |

Credentials follow the W3C standard and are portable — verify the Ed25519 signature anywhere.

Full narrative: **[docs/chain](https://abraxas-app.vercel.app/docs/chain)** · Architecture: **`/docs/architecture`**

---

## Sui verification stack

| Layer | What it does |
|-------|----------------|
| **zkLogin** | Google OAuth → deterministic Sui holder address |
| **Passport (Move)** | On-chain stamp bitmask — devnet live, mainnet next |
| **W3C credentials** | `did:sui` JWT after Veriff / manual review |
| **Sponsored tx** | Tier-based gas sponsorship from growth-fee treasury (roadmap) |
| **Intent messaging** | Sign personal messages without gas for integrators (roadmap) |

User-facing docs:
- **[Sui integration hub](/docs/sui)** — features, tiers, live devnet panel
- **[zkLogin setup](/docs/zklogin-setup)** — operator checklist (Google, Supabase, Veriff, keys)
- **[Passport spec](/docs/passport-spec)** — 52-byte root, stamp bits

---

## Core product

### Abraxas Passport (`/passport`)
- Sign in with Google (zkLogin)
- Stamp wizard: Identity (Veriff), Business, Asset Owner, …
- Live Sui devnet object lookup
- Public share URL: `/passport/[id]`

### Asset verification (V5 pipeline)
10-stage lifecycle from submission to marketplace — identity anchored to Sui address.

### Wyoming LLC formation (`/build`)
Entity formation packages with verified ownership record.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Verification chain | **Sui** · Move · zkLogin |
| Treasury token | **Solana** · SPL $ABRA (optional tiers) |
| Identity | W3C VC · Ed25519 · Veriff · zkLogin |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |

---

## Getting started (operators)

```bash
git clone https://github.com/worldlabsprotocol-ux/abraxas-app.git
cd abraxas-app
npm install
```

### Environment variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Sui zkLogin
NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID=

# Credentials (generate once — see below)
ABRAXAS_SIGNING_KEY=
ABRAXAS_PUBLIC_KEY=
ABRAXAS_ISSUER_URL=https://abraxasworld.xyz

# Veriff
VERIFF_API_KEY=
VERIFF_SECRET=

# Optional — zkLogin transactions later
NEXT_PUBLIC_ZKLOGIN_PROVER_URL=https://prover-dev.mystenlabs.com/v1
SUI_SPONSOR_TREASURY_ADDRESS=
```

### Generate signing keys

```bash
node scripts/generate-abraxas-key.js
```

Paste output into Vercel → **Settings → Environment Variables** → redeploy.

### Supabase SQL

Run in **SQL Editor** (see `/docs/zklogin-setup` for full script):

1. Core + zkLogin tables (`006_abraxas_id.sql` + `007_sui_zklogin.sql` or combined script in setup doc)
2. `sui_passport_objects` for on-chain object IDs (included in setup doc)

### Sui devnet deploy (optional)

```bash
npm run sui:deploy:devnet
```

---

## API reference (verification)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/zklogin/register` | POST | Register OAuth → Sui address |
| `/api/sui/passport` | GET | Read Passport object on Sui |
| `/api/credentials/issue` | POST | Issue W3C VC (`did:sui`) |
| `/api/credentials/verify` | POST | Verify credential |
| `/api/idv/create-session` | POST | Start Veriff (vendorData: `sui:0x…`) |
| `/api/idv/webhook` | POST | Veriff decision → auto-issue |
| `/api/passport/spec` | GET | Machine-readable spec |

---

## License

Private — World Labs Protocol. All rights reserved.

*Abraxas — Sui-native verification for real-world assets.*
