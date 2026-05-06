# Abraxas

<p align="center">
  <strong>Phase 3 infrastructure for operated real-world assets.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-beta-c8a96e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/built_on-Solana-9945FF?style=for-the-badge" />
  <img src="https://img.shields.io/badge/token-$ABRA-c8a96e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/token-$CARDS-c8a96e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/stack-Next.js_14-000000?style=for-the-badge" />
</p>

> Real-world assets stop being held.  
> They start being **operated**.

**Sovereign AI Guardian Protocol for Tokenized Real-World Assets on Solana.**

Blade Runner aesthetics. Ancient rune logic. Autonomous defense.

---

### Links
[![X](https://img.shields.io/badge/X-@pabloretroworld-000000?style=for-the-badge&logo=x)](https://x.com/pabloretroworld)
[![Live App](https://img.shields.io/badge/Live_App-abraxas--app.vercel.app-9945FF?style=for-the-badge&logo=vercel)](https://abraxas-app.vercel.app/)

Built by [@pabloretroworld](https://x.com/pabloretroworld) · World Labs Protocol

---

## Thesis

**Phase 1** — Assets moved on-chain. Passive.  
**Phase 2** — Assets became programmable. Static.  
**Phase 3** — Assets become **reactive, operated, and defended**.

**Abraxas is Phase 3.**

---

## Vision

Abraxas is the first AI-native protection layer for tokenized physical assets on Solana.

We don’t build dashboards.  
We build **fortresses**.

Every asset that enters the system receives:
- A **Sophia Agent** — autonomous AI guardian that monitors and acts 24/7
- A **Circuit Shield** — programmable defense layer that reacts instantly
- A **Token-2022 RWA position** — fully on-chain, yield-bearing, and reactive

---

## Core Features

- **SovereignPulse** — Real-time terminal powered by Helius webhooks + SSE (<200ms updates)
- **$CARDS** — Token-2022 with Interest-Bearing + Transfer Hooks (big moves auto-trigger duels & circuit events)
- **Collector Arena** — Duel, stake, and fractionalize tokenized collectibles (Pokémon, One Piece, etc.)
- **Circuit Defense** — Autonomous risk engine with verifiable on-chain actions
- **Operated Vaults** — Music IP, Real Estate, Luxury Assets, and Receivables
- **Helius Integration** — On-chain events instantly reflected in the UI

---

## Current Status (Live)

- **$ABRA** live with liquidity and holders
- SovereignPulse real-time terminal active
- $CARDS Anchor program complete with Transfer Hooks
- Helius + SSE pipeline fully functional
- Multiple operating vaults + active Circuit Defense

---

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Blockchain**: Solana · Anchor 0.30 · Token-2022 (Transfer Hooks + Interest Bearing)
- **Real-time**: Helius Webhooks + Server-Sent Events
- **On-chain**: Custom $CARDS program with Vault PDAs, Duel records, and admin suite
- **Auth**: Wallet-first (Solana primary)

---

## Architecture

```
Helius Webhook → /api/helius → SSE Broadcast
                    ↓
            useHeliusStream + ingestHeliusEvent()
                    ↓
          System State → CIRCUIT_TRIGGERED UI
```

Large $CARDS transfers automatically fire the Transfer Hook → `DuelResolvedEvent` → live vault reaction.

---

## Quick Start

```bash
git clone https://github.com/worldlabsprotocol-ux/abraxas-app
cd abraxas-app
npm install
cp .env.local.example .env.local
npm run dev
```

Open → `http://localhost:3000`

---

## $CARDS Program (On-Chain Engine)

The reactive core of Abraxas.

Located in the separate `abraxas-program` folder.

**Key Capabilities:**
- Transfer Hooks with auto risk detection
- Interest-bearing mechanics
- Per-duel + Vault PDAs
- Full admin control suite

---

## $ABRA

The participation & utility token of the operating layer.

**CA**: `5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS`

[Trade on Bags](https://bags.fm/$WORLDLABSPROTOCOL-UX)

---

## Direction

One unified system.  
Real assets, defended and operated autonomously in real time.

**Abraxas closes the loop.**

---

*Built by World Labs Protocol*  
[abraxas-app.vercel.app](https://abraxas-app.vercel.app/)

MIT License
```
