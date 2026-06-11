# Abraxas Protocol

**The verification and identity layer for real-world assets onchain.**

One KYC. One attestation. Every protocol.

Abraxas solves the verification debt problem: every lender, marketplace, and payment rail that touches a real-world asset runs its own KYC on the same owner, the same documents, the same asset — every time. Abraxas ends that.

Verify your identity once. Verify your asset once. Receive a portable W3C Verifiable Credential that travels with you across every integrated protocol. No re-KYC. No redundant document uploads. One source of truth for ownership and identity, anchored on Solana.

> "One verification. Every protocol."

Live: **[abraxas-app.vercel.app](https://abraxas-app.vercel.app/terminal)**  
Token: **$ABRA** | Treasury: **circuit.skr** | IG: **@abraxasxyz**

---

## The Problem Abraxas Solves

Every time a tokenized asset touches a new protocol — a lender, a marketplace, an FX provider — that protocol re-runs KYC on the same person. The same documents. The same asset. This is verification debt: friction that compounds with every integration, killing conversion and blocking the RWA economy from scaling.

Abraxas inverts the model:

```
Traditional flow:
  Owner → Lender A (KYC) → Marketplace B (KYC again) → Provider C (KYC again)

Abraxas flow:
  Owner → Abraxas (verify once) → Credential issued →
  Lender A ✓ · Marketplace B ✓ · Provider C ✓
```

---

## Core Infrastructure

### 1. Abraxas Identity (Unified KYC)
- Government document + certified liveness check (Veriff)
- Issues a W3C Verifiable Credential (Ed25519 signed JWT)
- Stored on Solana as a soul-bound token
- Any protocol calls `POST /api/credentials/verify` — returns verified status instantly
- Public key published at `/api/credentials/public-key` for decentralized verification

### 2. Asset Verification Pipeline (V5)
10-stage institutional lifecycle: SUBMITTED → IDENTITY_REVIEW → OWNERSHIP_REVIEW → LEGAL_REVIEW → DUE_DILIGENCE → RISK_SCORING → APPROVAL_COMMITTEE → TOKENIZATION_AUTH → MINTED → MARKETPLACE_LIVE

Each stage: assigned human verifier, AI risk scoring, required documents, audit log.

### 3. Wyoming LLC Formation Engine
On-chain business formation in 3 tiers ($1,499 / $2,999 / $4,999 USDC).
Includes: entity formation, operating agreement, Token-2022 mint, V5 verification pipeline.

### 4. Music Royalty Audit
Catalog audit for 80+ publishing clients. Finds missing ISRCs, unregistered MLC works, split sheet gaps. Artists self-submit via the terminal page.

### 5. Abraxas Passport
Every verified entity gets a public URL: `abraxas-app.vercel.app/passport/[id]`.
Shareable credential showing verification tier, asset linkage, attestation timestamp.
The social sharing surface that drives organic growth.

### 6. Verification Partner Network
Appraisers, attorneys, title companies, and auditors listed as Abraxas-verified partners.
Receive referrals for every asset in their jurisdiction.

### 7. Genesis Asset: Cielo Sunrise (AAS-1)
Mountain wellness retreat, Mineral Bluff, Georgia.
Appraised $1.1M · NOI $109,500 · 89/100 collateral score · $660K max borrow (60% LTV).
USDC crypto booking available directly at [abraxas-app.vercel.app](https://abraxas-app.vercel.app/terminal).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript (strict) |
| Blockchain | Solana · SPL Token-2022 · @solana/wallet-adapter |
| Identity | W3C VC Data Model v2.0 · Ed25519 · Veriff IDV |
| Database | Supabase (PostgreSQL + RLS) |
| State | localStorage + Supabase (V5 lifecycle engine) |
| Email | Resend |
| Deployment | Vercel |

---

## Getting Started

```bash
git clone https://github.com/worldlabsprotocol-ux/abraxas-app.git
cd abraxas-app
npm install
```

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ABRAXAS_SIGNING_KEY=          # Ed25519 private key JWK
ABRAXAS_PUBLIC_KEY=           # Ed25519 public key JWK
ABRAXAS_ISSUER_URL=https://abraxas-app.vercel.app
VERIFF_API_KEY=               # ~$1/verification
VERIFF_SECRET=
RESEND_API_KEY=               # free tier, 3000/mo
ADMIN_EMAIL=
```

Generate signing keys (one time):
```bash
node scripts/generate-abraxas-key.js
```

Run migrations in Supabase SQL Editor:
```
001_tokenization_requests.sql
002_rls_fix.sql
003_wyoming_columns.sql
004_storage_bucket.sql
005_partner_applications.sql
006_abraxas_id.sql
007_music_audits.sql
008_submitted_assets.sql
009_stay_requests.sql
```

```bash
npm run dev
```

---

## API Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/credentials/issue` | POST | Issue W3C VC after KYC |
| `/api/credentials/verify` | POST | Verify credential (used by protocols) |
| `/api/credentials/public-key` | GET | Fetch Abraxas public signing key |
| `/api/idv/create-session` | POST | Create Veriff IDV session |
| `/api/idv/webhook` | POST | Receive Veriff decision → auto-issue credential |
| `/api/assets/submit` | POST | Save RWA submission to Supabase |
| `/api/notify/tokenization` | POST | Email admin on tokenization request |
| `/api/notify/client-confirm` | POST | Email client confirmation |
| `/api/music-audit/submit` | POST | Save music audit request |
| `/api/partners` | POST | Save partner application |
| `/api/bookings/submit` | POST | Save Cielo Sunrise USDC booking |

---

## License

Private — World Labs Protocol. All rights reserved.

*Abraxas Protocol — the verification and identity layer for real-world assets onchain.*
