# Build #510 — Solana full-system integration & Demo acceptance

## Local / CI build (no production credentials)

`next build` must not require a live Supabase project at **import time**. Legacy API routes now call `supabaseForRoute()` inside handlers (`lib/supabase/routeAdmin.ts`).

For a **clean local build** without your real project:

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-placeholder
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-placeholder
npm ci && npm run build
```

These placeholders match CI (`.github/workflows/ci.yml`). They are non-functional at runtime — use your authorized Demo project in `.env.local` for real flows.

## Demo preflight (read-only)

```bash
DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/solana-native-demo-preflight.ts
```

Never prints secrets. Does not apply migrations or change Vercel env.

## Memo privacy (v2)

On-chain memos are `{ "p":"abx-rcpt", "v":2, "d":"<commitment_digest>" }` — **no receipt id**. Receipt binding is off-chain in `decision_receipt_solana_commitments`. Legacy v1 memos with `rid` remain verifiable.

## Operator devnet proof (when creds exist)

```bash
DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/solana-native-demo-preflight.ts
# If committer funded and flags enabled, issue a Solana-native receipt via partner flow, then:
DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/solana-receipt-commitment-retry.ts <receipt_id>
```

(`solana-receipt-commitment-retry.ts` — process/retry commitment for one receipt; add if not present)

## Acceptance matrix (Build #510 agent run)

| Area | Result | Evidence |
|------|--------|----------|
| Integration audit (credentials/me Solana subject) | PASS | Code fix in `app/api/credentials/me/route.ts` |
| Build import-time Supabase | PASS | Lazy `supabaseForRoute` across legacy API routes |
| Memo v2 privacy | PASS | Unit tests |
| Demo preflight script | PASS | `scripts/solana-native-demo-preflight.ts` |
| Full `npm run build` (CI placeholders) | PASS | Agent run with placeholder Supabase env |
| Full `npm run build` (zero env) | FAIL | Static export still executes some routes; use documented placeholders |
| Live devnet transaction | BLOCKED | No committer key/funds in agent VM |
| Cielo Phantom E2E | BLOCKED | No Demo stack in agent VM |
| Good Trouble IDV E2E | BLOCKED | No Veriff/reviewer in agent VM |
| Browser/mobile UX | NOT RUN | Requires Demo deployment |
| Security regressions | PASS | `integrationSecurity.test.ts` + commitment tests |

Update this table after operator runs Demo acceptance.

## Rollback

1. Disable `ABRAXAS_SOLANA_RECEIPT_COMMITMENTS` and redeploy.
2. Revert to Build #509 branch if memo v2 is incompatible (v1 still parses).

## Merge readiness

- **#622 → #510 PR:** merge after Demo operator confirms preflight + one devnet signature + Cielo/GT smoke on Demo URL.
- Do not merge automatically.
