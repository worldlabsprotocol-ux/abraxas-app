# Cielo E2E — Revenue Loop Test Harness

Verify the full Cielo booking → pay → receipt loop before a VC demo or investor walkthrough.

## Web dashboard

Open **`/ops/cielo-e2e`** after deploy. All critical checks must pass for a live demo.

## API

```bash
curl https://abraxas-app.vercel.app/api/ops/cielo-e2e
```

Returns pass / warn / fail for env, Supabase, treasury, USDC, zkLogin, and captured bookings.

## CLI (local env)

```bash
npm run cielo:e2e
```

Uses `.env.local` via dotenv — checks env vars and Supabase directly.

## CLI (remote / production)

```bash
npm run cielo:e2e:remote
```

Hits the deployed `/api/ops/cielo-e2e` endpoint.

## Manual walkthrough

1. **Book** — `/terminal#featured-asset` → submit dates + email  
2. **Confirm** — `/admin/cielo` → confirm booking  
3. **Pay** — `/cielo/pay?booking_id=…` → sign in with Google → Pay now  
4. **Verify** — `/cielo/receipt?booking_id=…` + `/metrics` shows captured stay  

## Critical env vars

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Booking storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Server reads |
| `SUI_TREASURY_ADDRESS` | USDC destination |
| `SUI_USDC_COIN_TYPE` | Mainnet USDC type |
| `SUI_NETWORK=mainnet` | Production network |
| `GOOGLE_CLIENT_ID` | zkLogin one-click pay |

## Supabase SQL (if missing)

- `docs/SUPABASE_DESIGN_PARTNERS.sql` — integration applications  
- `docs/SUPABASE_INVESTMENT_INTEREST.sql` — investor portal  
