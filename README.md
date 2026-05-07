# ⬢ ABRAXAS PROTOCOL

> **The Sovereign Terminal for Tokenized Reality on Solana.**  
> *Vault assets. Deploy agents. Win the Arena.*

[![Live App](https://img.shields.io/badge/Live_App-abraxas--app.vercel.app-9945FF?style=for-the-badge&logo=vercel)](https://abraxas-app.vercel.app/)


Built by [@pabloretroworld](https://x.com/pabloretroworld) · World Labs Protocol

---

## ◈ What Is Abraxas

Abraxas is a sovereign wealth operating system. It tokenizes real-world assets — graded collectibles, precious metals, luxury timepieces, equities — and turns them into playable, stakeable, duelable on-chain instruments.

Every asset enters the **Arena**. Sophia Agents defend them. The Circuit Engine monitors risk in real time.

---

## ✦ Navigation (3 Surfaces)

| Surface | Route | Purpose |
|---|---|---|
| **Terminal ⬢** | `/` | Sold Tape + Active Arena + Card Flip gameplay |
| **Vaults ⛊** | `/protect` | Asset management + Circuit Engine + USDC Borrow |
| **Arena** | `/arena` | 3v3 Duel system |

---

## ⊕ Core Features

| Feature | Description |
|---|---|
| **Sold Tape** | Live scrolling ticker of settled RWA transactions |
| **Card Flip Arena** | Click any card to reveal combat stats — front/back flip animation |
| **Sophia Agents** | 4 agents with unique buffs: Hed (DEF), Reb (ATK), Yld ($ABRA), Cgd (Shield) |
| **Battle Simulation** | Deploy agent + asset → 3-round combat → $ABRA rewards |
| **USDC Borrow** | Vault Stocks (70% LTV) or Timepieces (65% LTV) → borrow USDC for Arena |
| **Yield Strategist** | Circuit Engine auto-lends collateral → earns $ABX |
| **Pink Slips Mode** | Loser forfeits RWA metadata. High stakes, real consequences |
| **Agentic Metadata** | Every asset carries `power_level`, `liquidity_velocity`, `win_formula` |

---

## ◈ Asset Categories (44 total, $39.5M insured)

| Category | Count | Notes |
|---|---|---|
| Pokemon | 23 | PSA/BGS/CGC graded, vault-verified |
| One Piece | 8 | Manga Alt Arts, Secret Rares |
| Comics | 3 | Superman #1, Batman #1, Action Comics #1 |
| Stocks | 3 | AAPL, TSLA, NVDA tokenized equities |
| Timepieces | 2 | Rolex Daytona Paul Newman, Patek 5711 |
| Metals | 2 | Gold $4,733.39/oz · Silver $72.91/oz (May 2026) |
| Sports | 2 | Josh Allen, Shohei Ohtani |
| Luxury | 1 | Dubai Plate K-121 |

---

## ⬡ Tech Stack

```
Frontend:   Next.js 14 App Router · TypeScript · Tailwind CSS · Framer Motion
Blockchain: Solana · @solana/wallet-adapter · @solana/web3.js · Token-2022
Data:       Helius RPC · DeFiLlama · Pyth Oracle
On-chain:   Anchor 0.30 · $CARDS program · Transfer Hooks
AI:         Sophia Agent swarm · Circuit Engine (6-signal risk model)
Deploy:     Vercel Edge + Serverless
```

---

## ◈ Quick Start

```bash
git clone https://github.com/worldlabsprotocol-ux/abraxas-app
cd abraxas-app
npm install
npm install framer-motion sonner lucide-react
npm run dev
```

### Environment Variables

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=   # Helius RPC recommended
VAULT_AUTHORITY_SECRET=        # JSON keypair bytes for live minting
ELEVENLABS_API_KEY=            # Voice alerts (optional)
CRON_SECRET=                   # /api/agent/tick protection
POKEMON_TCG_KEY=               # Unlimited Pokemon TCG API
```

---

## ⚔ Arena Gameplay

**Card Flip Mechanic:** Click any card in the Terminal to flip it and reveal combat stats (ATK/DEF/SPD) and last sold price.

**Battle Loop:**
1. Select a card from the Arena grid
2. Choose your Sophia Agent (4 agents, each with unique buff)
3. View your win probability: `(grade×0.4) + (log_price×0.4) + (circuit_buff×0.2)`
4. Click **Deploy + Fight** — 3-round simulation plays out
5. Win → earn $ABRA · Lose → study the replay

**Pink Slips Mode:** Available in DuelButton — loser forfeits the RWA's on-chain metadata. One-click via `components/DuelButton.tsx`.

---

## ◈ $CARDS Program (Anchor)

```
programs/cards/src/lib.rs   — 569 lines, Token-2022 + Transfer Hook
Vault PDA:    ["vault", authority]
DuelRecord:   ["duel", vault, duel_id]
HookConfig:   ["hook_config", authority]
```

Deploy:
```bash
anchor build && anchor deploy --provider.cluster devnet
```

---

## ✦ Roadmap

### Shipped
- [x] 44-asset inventory (Pokemon, One Piece, Comics, Metals, Stocks, Timepieces)
- [x] 3v3 Arena duel engine with Sophia Agent buffs
- [x] Circuit Engine (6-signal risk model, auto-updates)
- [x] USDC Borrow against Stocks + Timepieces (LTV-gated)
- [x] Yield Strategist (Kamino routing → $ABX)
- [x] Token-2022 $CARDS program with Transfer Hook
- [x] Helius webhook → SSE → real-time UI

### Next (Q3 2026)
- [ ] Mainnet $CARDS deployment
- [ ] Jupiter swap integration (one-click liquidity)
- [ ] Real-time Pyth price feeds for metals
- [ ] Solana Seeker biometric duel approvals
- [ ] PvP Arena (real wallet vs wallet)
- [ ] $ABRA token launch + liquidity

---

## ★ Links

| | |
|---|---|
| Live | [abraxas-app.vercel.app](https://abraxas-app.vercel.app) |
| Twitter | [@pabloretroworld](https://twitter.com/pabloretroworld) |
| Token CA | `5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS` |

---

*"Vault assets. Deploy agents. Win the Arena."*

<sub>Built on Solana · Powered by Sophia · Defended by Circuit</sub>

MIT License
