Abraxas Protocol

[![Live App](https://img.shields.io/badge/Live_App-abraxas--app.vercel.app-9945FF?style=for-the-badge&logo=vercel)](https://abraxas-app.vercel.app/)


[![Buy $ABRA](https://img.shields.io/badge/Buy_$ABRA_on_Jupiter-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS)


[![Buy $ABRA](https://img.shields.io/badge/Buy_$ABRA_on_Bags-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://bags.fm/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS)

Verification + Collateral Intelligence Infrastructure for Real-World Assets on Solana.
Not another tokenization marketplace. Abraxas runs a seven-stage cryptographic verification pipeline — authentication partners co-sign every state transition, provenance is anchored on Solana, and the result is a portable Token-2022 certificate that any lender can independently verify.

Architecture
┌─────────────────────────────────────────────────────────┐
│  CLIENT — Next.js 14 · Solana Wallet Adapter · Zustand  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│  SERVICE LAYER                                           │
│  lib/services/assetService.ts    — Supabase CRUD        │
│  lib/services/riskEngine.ts      — Live price scoring   │
│  lib/services/bagsService.ts     — Bags.fm CLI bridge   │
│  lib/services/verificationStateMachine.ts               │
│  lib/services/eventService.ts    — append-only events   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│  SUPABASE / POSTGRES                                     │
│  17 tables · RLS on all · append-only asset_events      │
│  Materialized view: asset_intelligence_view             │
│  State machine: allowed_transitions table               │
│  RPCs: get_asset_timeline, verify_certificate           │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│  SOLANA MAINNET                                          │
│  Token-2022 verification certificates                   │
│  Anchor program: abraxas_verification                   │
│  ABRA SPL token — protocol fee                          │
│  PDA: ["certificate", asset_id] seeds                   │
└─────────────────────────────────────────────────────────┘


Key Features
Feature
Status
7-stage verification pipeline
✅ Live
Deterministic DB state machine
✅ Live
Token-2022 asset tokenization
✅ Live
Real SPL ABRA deduction
✅ Live
Append-only event sourcing
✅ Live
Public certificate verification
✅ Live
4-factor collateral scoring (live prices)
✅ Live
Energy / Mineral Rights vertical
✅ Live
Bags.fm CLI business revenue integration
✅ Live
Admin verification operations
✅ Live
Sophia AI Guardian + Circuit Safety
✅ Live
Anchor certificate program (deployed)
🔄 Deploying
Loopscale borrow live data
📋 Planned


API Endpoints
Public (no authentication required)
GET  /api/certificates/[id]/verify     — verify any certificate
GET  /api/assets/[id]/timeline         — full event history
GET  /api/prices?symbols=gold,solana   — live prices (CryptoRank + CoinGecko)

Authenticated
GET  /api/assets/wallet/[wallet]           — wallet asset portfolio
GET  /api/assets/[id]                      — full asset intelligence
POST /api/assets                           — create asset + initiate pipeline
POST /api/bags/tokenize                    — tokenize business revenue via Bags.fm
POST /api/verification/initiate            — start verification record
POST /api/verification/[id]/advance        — advance pipeline stage
PATCH /api/assets/[id]/status             — update verification status

Cron (protected by CRON_SECRET)
GET  /api/cron/bags-sync                   — sync Bags.fm revenue positions


Verification Pipeline
Asset Submission → Authentication Partner Review
  → Provenance + Ownership Validation
    → Custody / Vault Assignment
      → Risk + Collateral Scoring (live prices)
        → On-Chain Certificate Mint (Anchor PDA)
          → Collateral Activation → USDC via Loopscale

Transitions enforced at database level via allowed_transitions table. No frontend-only state changes.

Supported Asset Classes
Class
LTV Cap
Fee (ABRA)
Fine Metals
80%
200
Luxury Watches
65%
150
Real Estate
60%
300
Mineral Rights / Non-Op WI
55%
500
Graded Cards
55%
110
Fine Art
50%
180
Business Revenue (Bags.fm)
55%
200


Tech Stack
Frontend: Next.js 14.2, TypeScript, Solana Wallet Adapter, Zustand
Chain: Solana Mainnet, Token-2022, Anchor framework
Program: abraxas_verification — anchor build && anchor deploy --provider.cluster mainnet
Token: $ABRA — 5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS
Database: Supabase Postgres 15, RLS on all 17 tables
Prices: CryptoRank v2 → CoinGecko fallback
Revenue: Bags.fm CLI integration
Deploy: Vercel (main branch)

Local Development
# 1. Install
npm install

# 2. Environment
cp .env.example .env.local
# Required:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# NEXT_PUBLIC_ADMIN_PIN=abraxas2026
# CRYPTORANK_API_KEY
# NEXT_PUBLIC_SOLANA_RPC
# NEXT_PUBLIC_VERIFICATION_PROGRAM_ID
# CRON_SECRET

# 3. Schema (Supabase SQL Editor)
# Paste: supabase/abraxas_schema_v41.sql

# 4. Seed demo data
npm run db:seed

# 5. Dev server
npm run dev

Deploy Anchor Program
cd abraxas-program
anchor keys list                           # copy the program ID
# paste into programs/verification/src/lib.rs declare_id!()
# paste into Anchor.toml [programs.mainnet]
anchor build
anchor deploy --provider.cluster mainnet


Environment Variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_ADMIN_PIN=abraxas2026
CRYPTORANK_API_KEY=
NEXT_PUBLIC_SOLANA_RPC=https://your-rpc.com
NEXT_PUBLIC_VERIFICATION_PROGRAM_ID=ABRAXASverify1111111111111111111111111111111
NEXT_PUBLIC_APP_URL=https://abraxas-app.vercel.app
CRON_SECRET=


Security
Row Level Security on all 17 tables
asset_events is INSERT-only (no UPDATE/DELETE policy = physically blocked)
Bags.fm CLI: argument whitelist, shell metacharacter stripping, no raw user input
State machine transitions enforced in Postgres, not application code
Service role key server-side only — never exposed to client

Roadmap
Active
Solana Anchor program deployment
Bags.fm business revenue tokenization
Asset detail pages with full intelligence
Next
Merkle provenance anchoring on-chain
ZK certificate verification
Loopscale live health factor feed
Verifier reputation staking system
Later
Multi-chain certificate bridging
Institutional API + SDK
Autonomous Sophia agent activation

Built by World Labs Protocol · abraxas-app.vercel.app · $ABRA on Solana

