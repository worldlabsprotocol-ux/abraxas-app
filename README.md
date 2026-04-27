# Abraxas

<p align="center">
  <strong>Phase 3 infrastructure for operated real-world assets.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-beta-c8a96e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/built_on-Solana-111111?style=for-the-badge" />
  <img src="https://img.shields.io/badge/access-EVM-111111?style=for-the-badge" />
  <img src="https://img.shields.io/badge/stack-Next.js-000000?style=for-the-badge" />
</p>

> Real-world assets stop being held.  
> They start being operated.

---

## Thesis

Phase 1  
Assets moved on-chain. Passive.

Phase 2  
Assets became programmable. Static logic.

Phase 3  
Assets become operated. Autonomous.

Abraxas is Phase 3.

---

## Overview

Abraxas is the operating layer for real-world assets.

Users define strategy.  
Autonomous agents execute.  
Vaults track performance.  
Circuit defense monitors risk.  
Access is earned through participation.

No projections.  
No roadmap theater.  
No noise.

---

## Product Surface

| Layer | Function |
|---|---|
| Vaults | Assets are deposited, tracked, and operated |
| Agents | Execution units assigned to vault strategies |
| Defense | Circuit logic monitors risk and logs events |
| Access | $ABRA, La Casa Distortion, and operator status |
| Formations | Legal-grade entry point for serious operators |

---

## Current Build

| Area | Status |
|---|---|
| Solana wallet | Active |
| EVM wallet | Active |
| Helius RPC | Connected |
| Alchemy RPC | Connected |
| La Casa Distortion verification | Integrating |
| $ABRA balance | Integrating |
| Bags API | Server-side |
| Vault system | Active UI |
| Agent execution | In development |
| Circuit defense | In development |
| Formations | Stubbed |
| Marketplace | Partial |

BETA — agent network in active development.

This build is an active product shell. Live integrations are being connected progressively.

---

## Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Solana Wallet Adapter
- wagmi + RainbowKit
- NextAuth
- Helius RPC
- Alchemy RPC
- Bags API

---

## Quick Start

```bash
npm install
cp .env.local.example .env.local
npm run dev

Open:

http://localhost:3000

Requires Node.js >= 18.17.


---

Environment

.env.local is gitignored. Never commit secrets.

Use .env.local.example for placeholders only.

NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_ID=
GITHUB_SECRET=

BAGS_API_KEY=
BAGS_PARTNER_KEY=
BAGS_PARTNER_WALLET=

NEXT_PUBLIC_ABRA_CA=
NEXT_PUBLIC_ABRA_MINT=
NEXT_PUBLIC_OG_ETH_COLLECTION=
NEXT_PUBLIC_SOLANA_RPC_URL=
NEXT_PUBLIC_ETH_RPC_URL=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

Public Solana RPC is rate-limited. Use Helius or QuickNode for NEXT_PUBLIC_SOLANA_RPC_URL.


---

OAuth Setup

Google

Authorized JavaScript origin:

http://localhost:3000

Authorized redirect URI:

http://localhost:3000/api/auth/callback/google

GitHub

Homepage URL:

http://localhost:3000

Authorization callback URL:

http://localhost:3000/api/auth/callback/github

For production, replace localhost with the Vercel domain.


---

Routes

Route	Purpose

/	Three-phase thesis hero
/login	OAuth + wallet entry
/app	Dashboard
/marketplace	Vaults + Bags tokens
/vault/[id]	Vault detail
/live	Live system feed
/defense	Circuit defense log
/formations	Entity formation flow
/access	Tier verification
/abra	$ABRA token info
/list	Register asset
/use	Withdraw, reinvest, swap



---

API Routes

Route	Purpose

/api/auth/[...nextauth]	NextAuth handler
/api/bags/assets	Bags token launch feed
/api/bags/token?mint=<addr>	Token pool, creators, fees
/api/bags/market	Partner-level fee data



---

Auth Model

Abraxas uses three independent access surfaces.

NextAuth

Google and GitHub account identity.

Solana Wallet

Primary execution identity. Required for asset actions.

EVM Wallet

Used only for La Casa Distortion OG NFT verification.

Wallet ownership remains the source of truth for protocol access.


---

Vaults

Vaults are the product.

Assets are not static listings.
They are deposited into named vaults.

Each vault has:

identity

inception timestamp

performance history

assigned agent

public action log


There is no projected yield.
Only performance since inception.


---

Agents

Agents are execution units.

They do not assist.
They do not suggest.
They execute.

Example:

AGENT-007 rebalanced VAULT-ATLAS at 14:23:08 UTC


---

Defense

Circuit defense monitors vault conditions in real time.

When thresholds are exceeded:

positions reduce

capital is preserved

events are logged


Target:

Zero unrecovered positions.


---

$ABRA

$ABRA is the participation token of the operating layer.

It is earned by:

depositing assets

allocating capital

operating vaults


The system prioritizes operators over passive speculation.


---

Formations

Formations are the entry point for structured operators.

Form an entity.
Move assets in.
Activate agents.

Entities formed through Abraxas are operational from day one.


---

Deployment

Deploy through Vercel.

1. Push to GitHub


2. Import repo into Vercel


3. Add environment variables


4. Update NEXTAUTH_URL


5. Add production OAuth callback URLs


6. Redeploy




---

Direction

One asset class.
One execution standard.
One system.

Expand only after dominance.


---

Position

Real-world assets stop being held.
They start being operated.

Abraxas is the system that does it.


---

License

MIT
