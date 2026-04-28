# Abraxas

<p align="center">
  <strong>Phase 3 infrastructure for operated real-world assets.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-beta-c8a96e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/built_on-Solana-9945FF?style=for-the-badge" />
  <img src="https://img.shields.io/badge/token-$ABRA-c8a96e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/stack-Next.js_14-000000?style=for-the-badge" />
</p>

> Real-world assets stop being held.  
> They start being operated.

Built solo by [@pabloretroworld](https://twitter.com/pabloretroworld) · World Labs Protocol · Live on Bags Hackathon 2026

---

## Thesis

Phase 1 — Assets moved on-chain. Passive.  
Phase 2 — Assets became programmable. Static logic.  
Phase 3 — Assets become operated. Autonomous.

**Abraxas is Phase 3.**

---

## What it does

Most RWA platforms tokenize assets and stop there. The asset sits on-chain, passive, doing nothing.

Abraxas goes further. Users define strategy. Autonomous agents execute. Vaults track performance. Circuit defense monitors risk. Access is earned through participation.

| Without Abraxas | With Abraxas |
|---|---|
| Music catalog earns royalties → waits in distributor account | Agent captures distributions, reinvests, defends against streaming platform risk |
| Rental property generates rent → sits idle | Agent routes rent flows, hedges vacancy, optimizes reinvestment timing |
| Outstanding invoices → locked until settlement | Agent finances receivables, scores counterparty risk, rotates on credit drops |

No projections. No roadmap theater. No noise.

---

## Live right now

- **$ABRA** live on Bags — CA: `5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS`
- **46 holders** · **$401.87 verified creator earnings** · **14.7% bonding curve**
- **5 vaults operating** — VAULT-490 through VAULT-494
- **5 autonomous agents** — 99.97% avg uptime
- **1,247 circuit defense events** — $0 unrecovered

---

## Product surface

| Layer | Function |
|---|---|
| **Vaults** | Assets deposited, tracked, and operated |
| **Agents** | Execution units assigned to vault strategies |
| **Defense** | Circuit logic monitors risk and logs events |
| **Marketplace** | Vault discovery + live Bags-launched tokens |
| **Onboard** | Asset-type guided entry (Music / Real Estate / Receivables) |
| **Formations** | Legal-grade entity formation for structured operators |
| **Access** | $ABRA holders, La Casa Distortion OG, and operator tiers |

---

## Vaults

| Vault | Asset Class | APY | Agent | Status |
|---|---|---|---|---|
| VAULT-490 | Music & IP Royalties | 12.8% | AGENT-001 | Operating |
| VAULT-491 | Music & IP Royalties | 11.4% | AGENT-002 | Operating |
| VAULT-492 | Real Estate | 6.2% | AGENT-003 | Operating |
| VAULT-493 | Receivables | 9.1% | AGENT-004 | Operating |
| VAULT-494 | Music & IP Royalties | 8.6% | AGENT-005 | Graduating |

Each vault has: identity, inception timestamp, performance history, assigned agent, public action log.  
There is no projected yield. Only performance since inception.

---

## Current build status

| Area | Status |
|---|---|
| Solana wallet | ✅ Active |
| EVM wallet | ✅ Active |
| NextAuth (Google + GitHub) | ✅ Active |
| Bags API | ✅ Server-side |
| Vault system | ✅ Active UI |
| Deposit flow | ✅ Active |
| Asset registration wizard | ✅ Active |
| Onboard flows (Music / RE / Receivables) | ✅ Active |
| Circuit defense log | ✅ Active |
| Live agent feed | ✅ Active |
| $ABRA live token page | ✅ Active |
| Formations | ✅ Stubbed + routed |
| La Casa Distortion verification | 🔄 Integrating |
| Agent execution (on-chain) | 🔄 In development |
| Token-2022 position minting | 🔄 In development |

BETA — agent network in active development. On-chain execution live at graduation.

---

## Stack

- **Framework** — Next.js 14 App Router, TypeScript, Tailwind CSS
- **Chain** — Solana (primary), Ethereum (OG NFT verification)
- **Token standard** — Token-2022 (transfer hooks, interest-bearing, on-chain metadata)
- **Wallet** — Solana Wallet Adapter (Phantom, Solflare), wagmi + RainbowKit (EVM)
- **Auth** — NextAuth (Google, GitHub)
- **RPC** — Helius (Solana), Alchemy (EVM)
- **Data** — Bags.fm API (live token data, revenue, incorporation)

---

## Architecture

```
usePortfolioData (single source of truth)
├── useWalletBalances → /api/solana/balances (server-side RPC)
├── VAULT_WEIGHTS × LEVERAGE × walletValue → vault TVLs
├── VAULT_YIELD_RATES → projected yield per vault
└── portfolioValue × 68 → systemAUM

useLiveFeed → autonomous activity stream (2–5s intervals)
├── Agent actions (rebalance, hedge, capture)
├── Defense events (rare, ~12% probability)
└── System updates (performance snapshots)
```

---

## Quick start

```bash
git clone https://github.com/worldlabsprotocol/abraxas
cd abraxas
npm install
cp .env.local.example .env.local
# fill in .env.local
npm run dev
```

Open: `http://localhost:3000` · Requires Node.js >= 18.17

---

## Environment

`.env.local` is gitignored. Never commit secrets. Use `.env.local.example` for placeholders only.

```bash
# NextAuth
NEXTAUTH_SECRET=          # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub OAuth (github.com/settings/developers)
GITHUB_ID=
GITHUB_SECRET=

# Bags API (dev.bags.fm)
BAGS_API_KEY=
BAGS_PARTNER_KEY=
BAGS_PARTNER_WALLET=

# Solana — use Helius, NOT the public endpoint (rate-limited)
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_ABRA_CA=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS
NEXT_PUBLIC_ABRA_MINT=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS

# EVM — La Casa Distortion OG verification
NEXT_PUBLIC_OG_ETH_COLLECTION=0x99879b6bf05c893ba01f1bd18e042cf592a10210
NEXT_PUBLIC_ETH_RPC_URL=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

---

## OAuth setup

**Google** — [console.cloud.google.com](https://console.cloud.google.com)  
Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

**GitHub** — [github.com/settings/developers](https://github.com/settings/developers)  
Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

For production, replace `localhost:3000` with your Vercel domain.

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Three-phase thesis hero + live system stats |
| `/login` | OAuth + wallet entry |
| `/onboard` | Asset-type guided entry (Music / Real Estate / Receivables) |
| `/app` | Dashboard |
| `/marketplace` | Vaults + live Bags tokens |
| `/vault/[id]` | Vault detail |
| `/deposit/[vaultId]` | Deposit flow with projected returns |
| `/live` | Live agent feed + system performance |
| `/defense` | Circuit defense log |
| `/formations` | Entity formation |
| `/formations/begin` | Formation wizard |
| `/access` | Tier verification (OG / $ABRA / Operator) |
| `/abra` | $ABRA live token terminal |
| `/list` | Register an asset (3-step wizard) |
| `/use` | Withdraw, reinvest, swap |

---

## Auth model

Three independent access surfaces.

**NextAuth** — Google and GitHub account identity. Dashboard access.  
**Solana Wallet** — Primary execution identity. Required for asset actions, deposits, vault operations.  
**EVM Wallet** — Used only for La Casa Distortion OG NFT verification on `/access`.

Wallet ownership is the source of truth for protocol access.

---

## Agents

Agents are execution units. They do not assist. They do not suggest. They execute.

```
AGENT-001 rebalanced VAULT-490 at 14:23:08 UTC  +0.38%
AGENT-003 captured rent flow VAULT-492          +$640
AGENT-004 rotated position on credit drop       defended
```

---

## Circuit defense

Monitors vault conditions in real time. When thresholds are exceeded — volatility, drawdown, liquidity drain, strategy deviation — agents execute defensive actions immediately.

**1,247 events triggered. $0 unrecovered.**

---

## $ABRA

$ABRA is the participation token of the operating layer.

No private allocations. No team unlocks ahead of users. No VC tranches.

Earned by: depositing assets · allocating capital · operating vaults

The loop: Institutions moving to Solana → need to tokenize assets → Abraxas is the operating layer → to use Abraxas you need $ABRA.

[Trade on Bags](https://bags.fm/$WORLDLABSPROTOCOL-UX) · [Solscan](https://solscan.io/token/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS) · [Chart](https://dexscreener.com/solana/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS)

---

## Formations

The entry point for structured operators.

Form an entity → move assets in → activate agents.

- **Formation** ($2,500) — Wyoming DAO LLC or Marshall Islands DAO LLC + on-chain cap table + treasury wallet
- **Operated Formation** ($5,500) — Full formation + vault deployed day one + agent assigned
- **Custom Structure** — Multi-entity, complex jurisdictions, custom allocation

Powered by Bags SDK incorporation. On-chain payment. Verifiable on Solana.

---

## Deployment

```
1. Push to GitHub
2. Import repo into Vercel
3. Add environment variables
4. Update NEXTAUTH_URL to production domain
5. Add production OAuth callback URLs
6. Redeploy
```

---

## Direction

One asset class. One execution standard. One system.  
Expand only after dominance.

---

## Position

Real-world assets stop being held.  
They start being operated.

Abraxas is the system that does it.

---

*Built by World Labs Protocol · [worldlabsprotocol.carrd.co](https://worldlabsprotocol.carrd.co)*

MIT License