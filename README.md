# Abraxas Protocol

> **Verification + Collateral Intelligence Infrastructure for Real-World Assets on Solana**

[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://abraxas-app.vercel.app)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-9945FF?logo=solana)](https://solana.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**Live:** [abraxas-app.vercel.app](https://abraxas-app.vercel.app) · **Token:** `$ABRA` · **Chain:** Solana Mainnet

---

## What Is Abraxas?

Most tokenization platforms stop at minting a generic NFT. Abraxas runs a **seven-stage cryptographic verification pipeline** — authentication partners co-sign every state transition, provenance is anchored on Solana, and the result is a portable Token-2022 certificate that any lender can independently verify.

```
Asset Submission → Partner Review → Provenance Validation
→ Custody Assignment → Risk Scoring
→ Certificate Mint (Token-2022) → Collateral Activation → USDC via Loopscale
```

---

## ✨ Features

| Feature | Status |
|---|---|
| 7-stage verification pipeline | ✅ Live |
| Token-2022 asset tokenization | ✅ Live |
| Real $ABRA fee deduction on Solana | ✅ Live |
| Append-only event sourcing | ✅ Live |
| Public certificate verification endpoint | ✅ Live |
| 4-factor collateral scoring (live prices) | ✅ Live |
| Energy / Mineral Rights vertical | ✅ Live |
| Bags.fm business revenue integration | ✅ Live |
| Multi-provider authentication | ✅ Live |
| Language selector (10 languages) | ✅ Live |
| Sophia AI Guardian + Circuit Safety | ✅ Live |
| Anchor certificate program | 🔄 Deploying |

---

## Authentication

Abraxas supports four login methods — reducing onboarding friction for both crypto-native and traditional users:

| Method | Description |
|---|---|
| **Solana Wallet** | Phantom, Solflare — full on-chain access |
| **GitHub** | OAuth 2.0 — read access until wallet linked |
| **X (Twitter)** | OAuth 2.0 — read access until wallet linked |
| **Email** | Magic link via Resend — no password required |

**Wallet Linking:** Social/email users can link a Solana wallet via a one-time Ed25519 signature. Once linked, all on-chain actions (tokenization, ABRA fees, certificate minting) become available.

---

## Language Support

The **Language Selector** is in the top navigation bar — look for the flag icon (🇺🇸 EN ▼). Click to switch between 10 supported languages instantly. The interface updates without a page reload.

Supported: English · Español · Português · Français · Deutsch · 中文 · 日本語 · 한국어 · العربية · Русский

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│  CLIENT — Next.js 14 · Wallet Adapter · Zustand        │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────┐
│  SERVICE LAYER                                         │
│  lib/services/assetService.ts   — Supabase CRUD        │
│  lib/services/riskEngine.ts     — Live price scoring   │
│  lib/services/bagsService.ts    — Bags.fm CLI bridge   │
│  lib/services/eventService.ts   — Append-only events   │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────┐
│  SUPABASE / POSTGRES                                   │
│  17 tables · RLS on all · asset_events append-only     │
│  Materialized view: asset_intelligence_view            │
│  State machine: allowed_transitions                    │
└──────────────────────┬────────────────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────┐
│  SOLANA MAINNET                                        │
│  Token-2022 certificates · Anchor program              │
│  $ABRA SPL token · PDA: ["certificate", asset_id]      │
└───────────────────────────────────────────────────────┘
```

---

## API Reference

### Public (no auth)

```
GET  /api/certificates/[id]/verify    — verify any certificate
GET  /api/assets/[id]/timeline        — full event history
GET  /api/prices?symbols=gold,solana  — live prices
```

### Authenticated

```
GET  /api/assets/wallet/[wallet]      — wallet portfolio
POST /api/assets                      — create + initiate pipeline
POST /api/bags/tokenize               — tokenize business revenue
POST /api/verification/initiate       — start verification record
```

---

## Supported Asset Classes

| Class | Max LTV | Fee (ABRA) |
|---|---|---|
| Fine Metals | 80% | 200 |
| Luxury Watches | 65% | 150 |
| Real Estate | 60% | 300 |
| Mineral Rights / Non-Op WI | 55% | 500 |
| Graded Cards (PSA/BGS) | 55% | 110 |
| Fine Art | 50% | 180 |
| Business Revenue (Bags.fm) | 55% | 200 |

---

## Tech Stack

- **Frontend**: Next.js 14.2, TypeScript, Solana Wallet Adapter
- **Auth**: NextAuth.js v4 (Email + GitHub + X)
- **Chain**: Solana Mainnet, Token-2022, Anchor
- **Database**: Supabase Postgres 15 + RLS
- **Prices**: CryptoRank v2 → CoinGecko fallback
- **Deployment**: Vercel

---

## Local Development

```bash
# 1. Clone + install
git clone https://github.com/worldlabsprotocol-ux/abraxas-app
npm install

# 2. Environment
cp .env.local.example .env.local
# Fill in your keys

# 3. Database
# Run supabase/abraxas_schema_v41.sql in Supabase SQL editor

# 4. Seed demo data
npm run db:seed

# 5. Dev
npm run dev
```

### Deploy Anchor Program

```bash
cd abraxas-program
anchor keys list        # copy output key
# Update declare_id!() in programs/verification/src/lib.rs
# Update Anchor.toml [programs.mainnet]
anchor build
anchor deploy --provider.cluster mainnet
```

---

## Environment Variables

See `.env.local.example` for the complete list including:
- Supabase connection strings
- NextAuth providers (GitHub, X, Email/Resend)
- Solana RPC endpoint
- CryptoRank API key
- Cron secret

---

## Roadmap

**Active**
- Solana Anchor program deployment + PDA certificate system
- Bags.fm business revenue tokenization
- Merkle provenance anchoring on-chain

**Next**
- Loopscale live health factor feed
- ZK certificate verification
- Verifier reputation staking

**Later**
- Multi-chain certificate bridging
- Institutional API + SDK
- Autonomous Sophia agent activation
- Solana dApp Store listing

---

Built by World Labs Protocol · [abraxas-app.vercel.app](https://abraxas-app.vercel.app)
