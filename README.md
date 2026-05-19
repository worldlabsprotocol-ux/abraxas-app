⬢ ABRAXAS
The Sovereign Terminal for Tokenized Real-World Assets on Solana.

[![Live App](https://img.shields.io/badge/Live_App-abraxas--app.vercel.app-9945FF?style=for-the-badge&logo=vercel)](https://abraxas-app.vercel.app/)


[![Buy $ABRA](https://img.shields.io/badge/Buy_$ABRA_on_Jupiter-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS)


[![Buy $ABRA](https://img.shields.io/badge/Buy_$ABRA_on_Bags-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://bags.fm/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS)

Abraxas Protocol
Verification + Collateral Intelligence Infrastructure for Real-World Assets on Solana.
Not another tokenization marketplace. Abraxas operates a seven-stage cryptographic verification pipeline where named, credentialed authentication partners co-sign every state transition — producing portable, independently auditable on-chain certificates that enable institutional USDC lending against physical assets.

Architecture
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  Next.js 14 + Solana Wallet Adapter + Zustand           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   SERVICE LAYER                          │
│  lib/services/assetService.ts                            │
│  lib/services/eventService.ts                            │
│  lib/services/verificationStateMachine.ts                │
│  lib/services/riskScoringEngine.ts                       │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  SUPABASE / POSTGRES                     │
│  17 tables · RLS on all · append-only asset_events       │
│  Materialized view: asset_intelligence_view              │
│  State machine: allowed_transitions table                │
│  Helper RPCs: get_asset_timeline, verify_certificate     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  SOLANA MAINNET                          │
│  Token-2022 verification certificates                    │
│  SPL ABRA token (protocol fee)                          │
│  On-chain state anchoring (mint txs)                     │
└─────────────────────────────────────────────────────────┘


Key Features
Feature
Status
7-stage verification pipeline
✅ Live
Deterministic state machine (DB-enforced)
✅ Live
Token-2022 asset tokenization
✅ Live
Real SPL ABRA deduction
✅ Live
Append-only event sourcing
✅ Live
Public certificate verification
✅ Live
4-factor collateral scoring engine
✅ Live
Energy / Mineral Rights vertical
✅ Live
Admin verification operations
✅ Live
Loopscale borrow integration
🔄 In Progress
Solana Anchor certificate program
📋 Planned


API Endpoints
Public (no auth required)
GET /api/certificates/[id]/verify

Returns structured JSON with verifier signature, provenance Merkle root, custody reference, collateral score, and validity status. Anyone — lenders, auditors — can independently verify any certificate.
GET /api/assets/[id]/timeline

Returns the full immutable event history for an asset in chronological order.
Authenticated
GET  /api/assets/wallet/[wallet]     — all assets for a wallet
POST /api/assets                     — create asset, initiate pipeline
POST /api/verification/initiate      — start verification record
POST /api/verification/[id]/advance  — advance pipeline stage
PATCH /api/assets/[id]/status        — update verification status


Verification Pipeline
Asset Submission
      ↓
Authentication Partner Review
      ↓
Provenance + Ownership Validation
      ↓
Custody / Vault Assignment
      ↓
Risk + Collateral Scoring
      ↓
On-Chain Certificate Mint (Token-2022)
      ↓
Collateral Activation → USDC Borrowing via Loopscale

Each transition is enforced by the allowed_transitions table. No frontend-only state changes are possible.

Supported Asset Classes
Class
LTV Cap
Fee (ABRA)
Verification Path
Fine Metals
80%
200
LBMA assay + custody
Luxury Watches
65%
150
Certified watchmaker + vault
Real Estate
60%
300
Title search + MAI appraisal
Mineral Rights
55%
500
SPE-PRMS reserve engineer + BIA
Graded Cards
55%
110
PSA/BGS/SGC + vault
Fine Art
50%
180
Provenance + specialist auction
Tribal Land
50%
600
BIA + tribal council


Tech Stack
Frontend: Next.js 14.2, TypeScript, Solana Wallet Adapter
Chain: Solana Mainnet, Token-2022 program
Token: $ABRA — 5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS
Database: Supabase (Postgres 15), RLS enabled
Deployment: Vercel (main branch)
Schema: v4.1 — 17 tables, enums, triggers, materialized view

Local Development
# Install
npm install

# Environment variables
cp .env.example .env.local
# Set: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# Set: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_ADMIN_PIN

# Run schema (Supabase SQL Editor)
# Paste: supabase/abraxas_schema_v41.sql

# Start
npm run dev

Demo Data
Schema v4.1 seeds 3 demo assets on first run:
Rolex Submariner 5513 (1968) — approved status
50× LBMA Gold Bars — collateral_eligible status
Non-Op Working Interest — under_review status

Roadmap
Now
Complete frontend ↔ Supabase wiring
Asset detail pages with provenance timeline
Mobile layout improvements
Next
Solana Anchor verification certificate program
On-chain revocation mechanics
Merkle provenance anchoring
Loopscale live loan data
Later
Verifier reputation + staking system
ZK certificate verification
Multi-chain certificate bridging
Institutional API + SDK

Security
Row Level Security on all 17 tables
asset_events is INSERT-only (no UPDATE/DELETE policy)
State machine transitions enforced at DB level
Service role key never exposed to client
Wallet signatures required for all minting actions

Built by World Labs Protocol · abraxas-app.vercel.app

