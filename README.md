⬢ ABRAXAS PROTOCOL
The Sovereign Terminal for Tokenized Reality on Solana.
 The OpenSea of RWAs — vault assets, borrow USDC, win the Arena.
     
[![Live App](https://img.shields.io/badge/Live_App-abraxas--app.vercel.app-9945FF?style=for-the-badge&logo=vercel)](https://abraxas-app.vercel.app/)




Built by [@pabloretroworld](https://x.com/pabloretroworld) · World Labs Protocol

◈ What Is Abraxas

Abraxas is a sovereign RWA operating system — the first protocol that treats physical assets (graded cards, aged spirits, luxury watches, vintage comics, precious metals, tokenized equities) as first-class DeFi citizens.
The insight behind Abraxas: existing tokenization rails (Baxus, Courtyard, Collector Crypt) have already solved custody. Abraxas is the utility layer on top — lending, yield, gameplay, and prediction markets that activate those dormant physical assets without ever moving them from their vaults.

◈ Why Abraxas Exists (The Gap No One Is Filling)
Most RWA protocols focus on a single vertical: T-bills, real estate, or corporate credit.
 Abraxas covers the long tail of physical value that those protocols ignore:
A 1999 Charizard PSA 10 worth $550,000 — can now be collateral for USDC
A bottle of Pappy Van Winkle — can earn yield and battle in the Arena
A Rolex Submariner — earns the Precision Strike arena buff and 65% LTV
An Amazing Fantasy #15 CGC — can enter the $10 USDC Prize Pool as a vaulted position
No one else is building the bridge between collector culture, DeFi lending, and on-chain gameplay. Abraxas is that bridge.

✦ Navigation
Surface
Route
Purpose
Terminal
/
Live feed · RWA charts · Sovereign Arena · Game Modes
Vaults
/protect
Loopscale borrowing · Prize Pool · x402 · RWA market intel
Tokenize
/tokenize
Convert physical assets to Token-2022 on Solana


◈ Core Features
1. Loopscale Lending (Live)
Borrow USDC against vaulted RWAs at fixed APR via Loopscale Modular Vaults.
Asset Class
LTV
Fixed APR
Gold / Silver (LBMA)
80%
5.2%
NASDAQ Equities
70%
5.2%
Watches (Courtyard)
65%
5.2%
Comics (CGC)
65%
5.2%
Spirits (Baxus)
55%
5.2%
Collectibles (PSA)
55%
5.2%

2. Sovereign Arena
5-phase economic warfare with 111 real tokenized assets as combat cards.
Archetypes: Tank · Aggro · Control · Yield · Volatility
Arena Buffs: Liquid Gold (Spirits) · Precision Strike (Watches) · Iconic Power (Comics)
ELO Progression: Bronze → Silver → Gold → Platinum → Sovereign
Macro Events: Fed Rate Hike · Crypto Risk-Off · Commodity Surge · Solana Inflow · Treasury Shock
3. Game Modes Hub
Mode
Description
AbraxClaw
Arcade gacha — rarity-weighted pulls from the 111-asset inventory
Chase Markets
CALL/PUT price predictions on RWA assets · 18% call bonus (bullish bias)
Brain Games
Trivia · Oracle Gauntlet · Asset Memory Match · $ABRA rewards
Leaderboard
Global ELO rankings · Season 1

4. Vault Prize Pool (x402-Powered)
Entry: 10 USDC via x402 HTTP 402 Payment Required
Split: 70% winner · 20% protocol treasury · 10% $ABRA buyback
Eligibility: Any vaulted asset qualifies as your entry position
Settlement: Automated on-chain at season end via Anchor program
5. x402 Micropayment Protocol
Sophia Agents and external callers pay for oracle data, hedge execution, Arena antes, and Prize Pool entry via x402 — no accounts, no approval flows.
# External entry to Prize Pool
POST https://abraxas-app.vercel.app/api/pool/enter
X-Payment: <base64-signed-usdc-transfer>
Content-Type: application/json

{"vaultId": "490", "asset": "1999 Charizard PSA 10"}

6. RWA Market Intelligence
Live-updating charts and news: RWA market cap · tokenized T-bills AUM · stablecoin supply · Solana RWA TVL · gold spot · PSA auction comps.

◈ Asset Inventory — 111 Assets
Category
Count
Custody
Range
Pokémon
37
Collector Crypt
$2K–$550K
One Piece
25
Collector Crypt
$2K–$9.5K
Spirits
22
Baxus
$200–$4,500
Watches
13
Courtyard
$5.8K–$120K
Comics
5
Metropolis / CGC
$89K–$525K
Sports
4
Collector Crypt
$4.5K–$12K
Stocks
3
Digital Custody
$211–$412
Metals
2
LBMA
$73–$4,733


◈ Real On-Chain Addresses
$ABRA Token:       5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS
Vault Authority:   65JkcHbtaEaJHyNjCF8BxQHcYQub8XwgJnRLDfztiBqA
VAULT-490 PDA:     CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf
VAULT-491 PDA:     CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk
VAULT-492 PDA:     8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58
VAULT-493 PDA:     Db6RHGeqsZYkxjMvqjFQ4EV8KLs9xMxto3dK9Y8Q9TFf
VAULT-494 PDA:     HeFqPHNCTgZ68fxaGgJes9af16W63mg7UbZUy5LScwZq


◈ Transparency — Current Tech Gaps
We believe in showing users exactly where the technology stands:
Area
Status
Detail
Physical custody attestation
In Progress
Custodian co-sign on-chain coming Q3 2026
Token → Physical redemption
Manual
Programmatic redemption via Anchor + Helius webhook planned
Real-time price oracles
Partial
Metals/equities via Pyth live · Collectibles via Baxus API planned
On-chain lending settlement
Simulated
Loopscale Anchor CPI implemented, not mainnet-deployed
Legal SPV wrapper
Not live
Required for equities/real estate; exploring Securitize partnership


◈ Stack
Chain:       Solana Mainnet
Token std:   Token-2022 (transfer hooks, metadata pointer)
Framework:   Next.js 14.2 App Router
Wallet:      @solana/wallet-adapter + Phantom/Backpack
Lending:     Loopscale Modular Vaults
Payments:    x402 HTTP micropayment protocol
Oracles:     Pyth Network (metals/equities)
Languages:   18 — EN ES PT ZH JA KO FR DE AR FA TR HI BN RU UK VI TH ID


◈ Links




Live App
https://abraxas-app.vercel.app
Buy $ABRA
https://jup.ag/swap?sell=So11…&buy=5c1FHZj…
Bags
https://bags.fm/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS
Twitter
@pabloretroworld
Baxus
https://www.baxus.co
Courtyard
https://courtyard.io/vending-machine/rolex-watch-box
Collector Crypt
https://gacha.collectorcrypt.com/#pokemon


Built by Pablo · World Labs Protocol · Solana · May 2026
