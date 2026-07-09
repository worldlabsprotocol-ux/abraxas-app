# Abraxas Connect v1 (pilot)

Turns Trust Layer infrastructure into a **consent-gated authorization loop** partners can integrate.

## Primary flow

```
Partner POST /api/v1/authorize
  → { authorization_request_id, hosted_connect_url, expires_at }
User completes hosted Connect (Passport session + wallet bind + consent)
  → policy evaluation + Decision Receipt
Partner validates via status polling / redirect / webhook
```

**`POST /api/v1/authorize` never returns approval without user consent.**

## Migration

Run **`036_connect_wallet_authority.sql`** after 033–035.

## Demo

- `/demo/partner-access` — internal DEMO partner page (MetaMask → Connect → unlock)
- Partner ID: `abraxas-connect-demo`
- Policy: `abraxas-booking-v1` (live evaluation; requires Passport claims)

## API

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/v1/authorize` | Partner key | Create auth request + Connect URL |
| `GET /api/v1/authorize/:id/status` | Partner key | Outcome + live receipt validity |
| `GET/POST /api/connect/authorize/:id` | Browser session (POST) | Preview + consent |
| `POST /api/wallet-authority/evm/challenge` | Session | SIWE challenge |
| `POST /api/wallet-authority/evm/bind` | Session | Confirm EVM binding |

## SDK

```typescript
import { AbraxasConnectClient } from "@/lib/connect/sdk";

const client = new AbraxasConnectClient({ apiKey: process.env.PARTNER_KEY! });
const req = await client.createAuthorizationRequest({
  policyId: "abraxas-booking-v1",
  walletAddress: "0x…",
  chainId: 1,
  returnUrl: "https://partner.example/callback",
});
// Redirect user to req.hosted_connect_url
```

## Deferred

- Solana/Phantom binding
- OpenID4VCI/VP
- WalletConnect / Privy
- Public issuer self-serve portal

## Public claims we cannot make yet

- External partner adoption
- “Any wallet” (EVM SIWE only in v1)
- OAuth-for-finance positioning as shipped product
