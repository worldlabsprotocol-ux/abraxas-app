# Abraxas Protocol

**Ownership infrastructure for real-world assets on Solana.**

Abraxas is a verification, tokenization, and financing platform that bridges legacy ownership systems with decentralized finance. It enables property owners, mineral rights holders, and business operators to bring real-world assets through a rigorous multi-stage verification pipeline before anything is issued on-chain.

> "Verification is the trust layer."

Live: **[abraxas-app.vercel.app](https://abraxas-app.vercel.app/terminal)**  
Token: **$ABRA** on Solana  
Treasury: **circuit.skr** (Solana Name Service)

---

## What Abraxas Does

Most RWA tokenization projects issue tokens first and verify never. Abraxas inverts this:

```
Asset Submitted
  → Identity & AML Verification
  → Ownership & Title Review
  → Legal Structure Review
  → Asset Due Diligence
  → AI Risk Scoring
  → Approval Committee
  → Tokenization Authorized
  → Asset Minted (SPL Token-2022)
  → Marketplace Live / Lending Eligible
```

Every stage has an assigned verifier, required documents, AI engine notes, and a progress percentage. All events are recorded in an append-only audit log.

---

## Core Systems

### 1. Verification OS (VOS Terminal)
A command-line interface embedded in the terminal page. Users can query assets, run lifecycle simulations, analyze collateral, and submit requests — all from a Bloomberg-style terminal.

**Key commands:**
```
help              List all commands
inspect AAS-1     Full intelligence report on the Genesis Asset
my assets         List your submitted assets
queue             Verification pipeline overview
analyze <id>      AI risk analysis + lending potential
advance <id>      Simulate next lifecycle stage (demo)
demo <id>         Walk asset through full pipeline
tokenize <id>     Mint tokens against a VERIFIED asset
borrow <id> <$>   Open a USDC loan at 60% LTV
loans             List active loans
oracle <id>       Live valuation feed
attest <id> <type> Submit attestation (title/insurance/audit)
wyoming "Name"    Tokenize a Wyoming LLC from the terminal
```

### 2. Wyoming LLC Formation Engine
On-chain business formation through the terminal or the **START TOKENIZATION NOW** flow on the terminal page. Three tiers:

| Tier       | Price   | Includes                                               |
|------------|---------|--------------------------------------------------------|
| Starter    | $1,499  | LLC formation, operating agreement, basic verification |
| Growth     | $2,999  | + multi-sig governance, cap table, lending eligible    |
| Enterprise | $4,999  | + compliance package, priority verification (24h)      |

### 3. Tokenization Request + Payment Flow
Multi-step modal triggered from the terminal page:

1. **Tier** — select Starter / Growth / Enterprise
2. **Info** — business name, email, X handle, sending wallet
3. **Payment** — USDC amount + `circuit.skr` treasury wallet with copy button
4. **Confirm** — paste Solana transaction signature (optional)
5. **Success** — receipt, request ID, next-step timeline

Requests are stored in Supabase (`tokenization_requests` table). Falls back to `localStorage` if Supabase is unavailable — the form never breaks.

### 4. Institutional Dashboard (`/dashboard`)
Bloomberg-style asset intelligence center:
- 4 score cards: Verification / Liquidity / Fraud Shield / Marketability
- All 10 lifecycle stages with verifier names and AI notes
- Bloomberg-style data grid (value, LTV, collateral status, lending status)
- 4 sub-tabs: Overview / Lifecycle / Documents / Activity
- Append-only audit log

### 5. Asset Lifecycle Engine (V5)
Defined in `lib/vos/userAssetStore.ts`. localStorage-backed, backend-ready (same interface, swap to Supabase later).

**Lifecycle states:**
```
SUBMITTED → IDENTITY_REVIEW → OWNERSHIP_REVIEW → LEGAL_REVIEW →
DUE_DILIGENCE → RISK_SCORING → APPROVAL_COMMITTEE →
TOKENIZATION_AUTH → MINTED → MARKETPLACE_LIVE
```
Also: `REJECTED`

**Asset scores** (computed at submission from asset properties):
- `verification` — based on appraisal status, liens, custody
- `liquidity` — based on asset class and jurisdiction
- `fraud` — based on liens and custody arrangement
- `marketability` — based on asset type and jurisdiction

---

## Tech Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| Framework   | Next.js 14.2 (App Router)                           |
| Language    | TypeScript (strict)                                 |
| Styling     | Inline styles (design tokens), Tailwind n/a         |
| Blockchain  | Solana · SPL Token-2022 · @solana/wallet-adapter    |
| Database    | Supabase (PostgreSQL + Row Level Security)          |
| State       | localStorage (userAssetStore, sessionStore)         |
| Fonts       | JetBrains Mono, System UI                           |
| Deployment  | Vercel (Hobby)                                      |

---

## Project Structure

```
abraxas-app/
├── app/
│   ├── page.tsx                   # Splash screen (2.4s loading bar)
│   ├── terminal/page.tsx          # Main terminal page
│   ├── dashboard/page.tsx         # Institutional asset dashboard
│   ├── lending/page.tsx           # Lending engine (coming online)
│   └── about/page.tsx             # Explainer page
├── components/
│   ├── vos/VerificationTerminal.tsx   # VOS command terminal
│   ├── TokenizationRequestModal.tsx   # Multi-step payment flow
│   ├── ExplainerCarousel.tsx          # Auto-advancing slide carousel
│   ├── LanguageSelector.tsx           # Custom language picker (6 languages)
│   ├── CompactWallet.tsx              # Solana wallet connect button
│   └── onboarding/AssetOwnerOnboarding.tsx  # Asset intake form
├── lib/
│   ├── vos/
│   │   ├── commands.ts            # All VOS commands (1170+ lines)
│   │   ├── commandRegistry.ts     # Command registry + executor
│   │   ├── userAssetStore.ts      # V5 lifecycle engine (localStorage)
│   │   ├── userTokenStore.ts      # Token mint tracking
│   │   ├── userLoanStore.ts       # Loan tracking
│   │   ├── sessionStore.ts        # Anonymous session
│   │   ├── assetRegistry.ts       # Canonical asset registry (AAS-1)
│   │   └── types.ts               # Shared types
│   └── supabase/client.ts         # Browser Supabase client
├── supabase/migrations/
│   ├── 001_tokenization_requests.sql  # Table creation
│   └── 002_rls_fix.sql                # RLS GRANT fix (required)
└── public/
    ├── icon-48.png                # Abraxas diamond logo
    ├── og-banner.png              # 1500×500 header banner
    └── about/                     # 8 explainer carousel slides
        ├── 01_cover.png
        └── ... (08_cta.png)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- A Vercel account (for deployment)

### Local Development

```bash
git clone https://github.com/worldlabsprotocol-ux/abraxas-app.git
cd abraxas-app
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

```bash
npm run dev
# → http://localhost:3000
```

### Supabase Setup

1. Create a new Supabase project
2. Open **SQL Editor → New query**
3. Run `supabase/migrations/001_tokenization_requests.sql` (creates table)
4. Run `supabase/migrations/002_rls_fix.sql` (adds required GRANT + policies)

> ⚠️ **You must run both migrations.** Without `002_rls_fix.sql`, the tokenization form gives an RLS error. The app falls back to localStorage if Supabase is unavailable, so it never fully breaks.

### Vercel Deployment

1. Connect your GitHub repo to Vercel
2. Add environment variables in **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

---

## Tokenization Flow (End-to-End)

### For users

1. Visit `/terminal`
2. Click **START TOKENIZATION NOW** (or a tier card SELECT button)
3. Fill in business name, email, X handle, sending wallet
4. Send USDC to `circuit.skr` on Solana
5. Paste transaction signature → confirmation
6. Asset enters V5 pipeline at `SUBMITTED` state
7. Track progress on `/dashboard`

### For admins

Query paid requests:
```sql
select * from tokenization_requests
where status = 'paid'
order by created_at desc;
```

When USDC receipt is confirmed at `circuit.skr`:
```sql
update tokenization_requests
   set status   = 'in_pipeline',
       asset_id = 'USR-XXXXXX'
 where id = '<request-id>';
```

Then create a matching `userAsset` in the V5 store (`assetType: "wyoming_llc"`).

---

## Genesis Asset

**Cielo Sunrise** (AAS-1) — Mountain Wellness Retreat, Mineral Bluff, Georgia

| Metric               | Value         |
|----------------------|---------------|
| Appraised Value      | $1,100,000    |
| NOI                  | $109,500      |
| Cap Rate             | 9.95%         |
| Collateral Score     | 89/100        |
| Verification Conf.   | 96%           |
| Max Borrow (60% LTV) | $660,000 USDC |

Airbnb: [cielosunrise](https://www.airbnb.com/rooms/1681387746169197852)

---

## Asset Classes Supported

| Class                | Status    | Notes                                |
|----------------------|-----------|--------------------------------------|
| Real Estate          | Live      | AAS-1 Genesis asset active           |
| Wyoming LLC          | Live      | Full formation pipeline              |
| Mineral Rights       | Live      | Tribal/sovereign land focus          |
| Affordable Housing   | Coming    | Community Land Trust structures      |
| Music & Royalties    | Coming    | Catalog and revenue stream tokenization |
| Precious Metals      | Phase 2   | Vault-custody integration            |

---

## Contributing

This is the main frontend for Abraxas Protocol. See issues for current priorities.

```bash
npm run build    # TypeScript compile + Next.js build
npm run lint     # ESLint
npm run dev      # Dev server with hot reload
```

---

## License

Private — World Labs Protocol. All rights reserved.

---

*Abraxas Protocol is the trust layer between real-world ownership and on-chain finance.*
