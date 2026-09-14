# AGENTS.md

## Cursor Cloud specific instructions

Abraxas is a single **Next.js 14 (App Router) + TypeScript** web app (the "verification and identity layer for RWAs"). There is one service: the Next.js app. The `abraxas-program` directory is a separate Anchor/Solana program and is excluded from the TS build (`tsconfig.json`); it is not part of running the web app.

### Running / testing / building
- Dev server: `npm run dev` (serves on `http://localhost:3000`). Use this for development, not `npm run build` + `npm start`.
- Type check: `npx tsc --noEmit` — this is what CI gates on (`.github/workflows/ci.yml`), along with `npm run build`. CI does **not** run lint.
- `npm run lint` / `next lint` is **interactive** (no ESLint config is committed) and will hang waiting for TTY input. Do not run it non-interactively; rely on `npx tsc --noEmit` instead.
- There is no automated test suite in this repo.

### Environment / external services (key gotchas)
- The app runs fine with **no real secrets**. `lib/supabaseClient.ts` returns a null client when Supabase env vars are absent and all hooks fall back to a local Zustand store, so pages render without a database.
- Copy `.env.local.example` to `.env.local` for local dev. `.env*.local` is gitignored.
- Features that call external providers will surface in-app error toasts (e.g. the "N errors" badge, or "Could not start verification") when their keys are missing. These are expected without credentials and are **not** setup failures. Affected integrations include: Supabase (DB persistence), Reclaim Protocol (social verification on `/passport`), Veriff (IDV), Helius/QuickNode (`NEXT_PUBLIC_SOLANA_RPC` live feeds), Resend (email), Stripe.
- The credential "verify once" core flow works **fully locally** with just an Ed25519 keypair. Set `ABRAXAS_SIGNING_KEY` and `ABRAXAS_PUBLIC_KEY` (JWK JSON) in `.env.local`, then `POST /api/credentials/issue` → `POST /api/credentials/verify` round-trips without any database.
- Note: the committed `scripts/generate-abraxas-key.js` fails with the installed `jose` v6 ("non-extractable CryptoKey cannot be exported as a JWK"). To generate keys locally, generate an EdDSA keypair with `extractable: true` and export the JWKs, rather than relying on that script.
- `/identity` redirects to `/passport`.
