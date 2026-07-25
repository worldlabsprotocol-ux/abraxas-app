# Abraxas Independent Biometric IDV + Mainnet

Abraxas can verify identity **without Veriff**: users capture name + government ID + selfie on `/passport`; reviewers approve at `/admin/identity`; the app issues an L2 W3C credential and on-chain Sui passport stamps.

## Quick env (Vercel)

### Independent biometric (no Veriff)

```env
IDV_PROVIDER=manual
VERIFF_DISABLED=true
ABRAXAS_SIGNING_KEY={"kty":"OKP",...}   # Ed25519 JWK for JWT issuance
ABRAXAS_BROWSER_SESSION_SECRET=...        # optional; falls back to signing key
```

### Sui devnet (current pilot)

```env
SUI_NETWORK=devnet
NEXT_PUBLIC_SUI_NETWORK=devnet
SUI_RPC_URL=https://rpc-devnet.suiscan.xyz
SUI_SPONSOR_SECRET_KEY=suiprivkey1...
SUI_ISSUANCE_CAP_OBJECT_ID=0x...
```

### Sui mainnet (after audit + publish)

```env
SUI_NETWORK=mainnet
NEXT_PUBLIC_SUI_NETWORK=mainnet
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
SUI_SPONSOR_SECRET_KEY=suiprivkey1...    # mainnet-funded sponsor
SUI_ISSUANCE_CAP_OBJECT_ID=0x...         # from npm run sui:mint-cap -- mainnet
```

Commit `lib/sui/deployment.mainnet.json` with a real `packageId` after:

```bash
CONFIRM_MAINNET=1 npm run sui:deploy:mainnet
npm run sui:mint-cap -- mainnet
```

## End-to-end flow

1. User **Sign in** (Google zkLogin) → browser session cookie minted
2. `/passport` → **Verify who you are** → `AbraxasIdentityCapture`
3. `POST /api/identity/documents/capture` (session-authenticated) → Supabase Storage + queue
4. Admin `/admin/identity` → preview ID + selfie → **Approve L2**
5. `issueIdentityCredential` → JWT + claims (`abraxas_capture`) + `provisionOnChainPassport`
6. User polls `/api/identity/status` → credential active + on-chain stamps

## Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /api/idv/independent/status` | Provider, signing key, Sui network, issuer config, pending review queue |
| `GET /api/verify/layer` | Verification layer scoreboard (includes independent biometric item) |
| `GET /api/mainnet/readiness` | Mainnet gates + `independent_idv` telemetry |
| `GET /api/sui/passport/sponsor` | Sponsor wallet + cap diagnostics |
| `GET /api/sui/mainnet/readiness` | Mainnet gate #3 deploy checklist |

## Mainnet gates (summary)

1. Core verification live — **done** (independent + Veriff paths)
2. Move audit published — required before mainnet publish
3. Package on mainnet + IssuanceCap in Vercel
4.–7. Credential API review, external RP, monitoring, open integrate

See `docs/MAINNET_CUTOVER.md` and `lib/mainnetReadiness.ts`.

## Security notes

- Capture API requires **httpOnly browser session** (no spoofed `sui_address` in form body)
- Document images stay in private `passport-documents` bucket; partners receive **outcome only**
- Rotate sponsor key if exposed in chat or logs
