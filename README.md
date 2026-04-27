# Abraxas

> Real-world assets stop being held and start being operated.

Phase 3 RWA app shell — Next.js 14 + TypeScript + Tailwind. Live wired to:
- **Solana wallet adapter** (Phantom, Solflare, etc.)
- **Bags API** (live $ABRA + token launches)
- **wagmi + RainbowKit** (Ethereum mainnet for OG NFT verification)
- **NextAuth** (Google + GitHub OAuth)

---

## Quick start

```bash
npm install

# Set up env (NextAuth + RPC keys)
cp .env.local.example .env.local
# edit .env.local — see "Environment variables" below

npm run dev
```

Open `http://localhost:3000`. Requires Node.js >= 18.17.

---

## Environment variables

`.env.local` is **gitignored** — never commit secrets.

### Required for OAuth

```bash
NEXTAUTH_SECRET=        # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_ID=
GITHUB_SECRET=
```

### Required for Bags API

```bash
BAGS_API_KEY=           # from dev.bags.fm
BAGS_PARTNER_KEY=
BAGS_PARTNER_WALLET=
```

### Public client config

```bash
NEXT_PUBLIC_ABRA_CA=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS
NEXT_PUBLIC_ABRA_MINT=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS
NEXT_PUBLIC_OG_ETH_COLLECTION=0x99879b6bf05c893ba01f1bd18e042cf592a10210
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_ETH_RPC_URL=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

### RPC notes

The public Solana RPC (`api.mainnet-beta.solana.com`) is rate-limited and
will frequently 429 on token-account reads. Use [Helius](https://helius.dev)
(free tier) or QuickNode in `NEXT_PUBLIC_SOLANA_RPC_URL`.

---

## Setting up OAuth apps

### Google

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a project (or select existing)
3. Click **Create Credentials → OAuth client ID**
4. Application type: **Web application**
5. **Authorized JavaScript origins:** `http://localhost:3000`
6. **Authorized redirect URIs:** `http://localhost:3000/api/auth/callback/google`
7. Copy the Client ID + Client Secret into `.env.local`
8. For production, add your prod domain to both lists

### GitHub

1. Go to https://github.com/settings/developers
2. Click **OAuth Apps → New OAuth App**
3. **Homepage URL:** `http://localhost:3000`
4. **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
5. Copy Client ID into `GITHUB_ID` and generate a secret for `GITHUB_SECRET`

---

## Routes

| Route          | Purpose                                                |
| -------------- | ------------------------------------------------------ |
| `/`            | Three-phase thesis hero + system stats                 |
| `/login`       | Google + GitHub OAuth + Solana wallet                  |
| `/app`         | Dashboard — vault positions, live balances             |
| `/marketplace` | Live Bags tokens + Abraxas vaults                      |
| `/vault/[id]`  | Vault detail                                           |
| `/live`        | Live performance dashboard                             |
| `/defense`     | Circuit defense log                                    |
| `/formations`  | Entity formation (Bags incorporation API)              |
| `/access`      | Tier verification — La Casa Distortion + $ABRA + ops   |
| `/abra`        | $ABRA token info                                       |
| `/list`        | Register an asset                                      |
| `/use`         | Withdraw / reinvest / swap                             |

API routes:

| Route                                  | Purpose                                |
| -------------------------------------- | -------------------------------------- |
| `/api/auth/[...nextauth]`              | NextAuth session handling              |
| `/api/bags/assets`                     | Token launch feed                      |
| `/api/bags/token?mint=<addr>`          | Pool + creators + fees for a token     |
| `/api/bags/market`                     | Partner-level claimed/unclaimed fees   |

---

## Auth model

Three independent auth surfaces, intentionally:

1. **NextAuth (Google / GitHub)** — account identity. Lets you see the
   dashboard and your past activity.
2. **Solana wallet** — required for asset actions (deposit, list, use).
   `<WalletGate>` enforces this on `/list`, `/use`, `/vault/[id]/deposit`.
3. **EVM wallet** — *only* used on `/access` to verify OG NFT ownership.
   Does not gate anything else.

The dashboard at `/app` uses `requireWallet={false}` so OAuth users can land
there and see their info before being asked to connect a wallet.

---

## Folder structure

```
abraxas/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   → NextAuth handler
│   │   └── bags/{assets,token,market}/route.ts
│   ├── access/page.tsx                   → OG NFT verification
│   ├── app/page.tsx                      → Dashboard
│   ├── marketplace/                      → Vaults + live Bags tokens
│   ├── vault/[id]/page.tsx
│   ├── live/page.tsx
│   ├── defense/page.tsx
│   ├── formations/page.tsx
│   ├── abra/page.tsx
│   ├── list/page.tsx
│   ├── use/page.tsx
│   ├── login/page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx
├── components/
│   ├── SolanaProvider.tsx           → wallet adapter
│   ├── EvmProvider.tsx              → wagmi + RainbowKit
│   ├── SessionProvider.tsx          → NextAuth wrapper
│   ├── ConnectWalletButton.tsx      → styled WalletMultiButton
│   ├── WalletGate.tsx               → action gating
│   ├── LiveBalances.tsx             → real SOL + ABRA balance panel
│   ├── LiveAbraStatus.tsx           → Bags API verification panel
│   ├── BagsTokenCard.tsx
│   ├── VaultCard.tsx
│   ├── AgentFeed.tsx
│   ├── DefenseFeed.tsx
│   ├── Nav.tsx
│   ├── Button.tsx
│   ├── StatCard.tsx
│   ├── PageHeader.tsx
│   ├── Toast.tsx
│   └── Layout.tsx
├── lib/
│   ├── bags.ts                      → Bags API client (server-only)
│   ├── solanaRpc.ts                 → centralized RPC URL helper
│   ├── useWalletBalances.ts         → SOL + ABRA balance hook
│   ├── useOgVerification.ts         → ERC-721 balanceOf hook
│   ├── authState.tsx                → bridges NextAuth + Solana wallet
│   ├── providers.tsx                → provider stack
│   ├── toastState.tsx
│   ├── constants.ts
│   ├── mockData.ts
│   └── utils.ts
├── .env.local.example
├── .gitignore
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── README.md
```

---

## License

MIT.
