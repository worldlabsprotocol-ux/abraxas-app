# Build #561 — Sovereign infrastructure independence

## Dependency inventory (A / B / C / D)

| Surface | Class | Sovereign core | Notes |
|---------|-------|----------------|-------|
| Wallet auth + holder subjects | A / B | Yes | **A** on `postgres_direct`; PostgREST legacy = **D** transport |
| PostgreSQL persistence | B / D | Yes | **B** wire-protocol Postgres; Supabase API = **D** |
| Encrypted evidence | A | Yes | `ABRAXAS_EVIDENCE_STORAGE_ROOT` + AES-256-GCM |
| Credential issuance (manual path) | A | Yes | Abraxas Verify default (`IDV_PROVIDER=manual`) |
| Signing / receipts | A | Yes | Ed25519 `ABRAXAS_SIGNING_KEY`; `verifyReceiptIndependently` |
| Policy + revocation + replay | A | Yes | PostgreSQL claims + consumption |
| Backups / recovery | A | Yes | Build #552 encrypted `pg_dump` + restore drill |
| Veriff | D | No (legacy opt-in) | Blocked on sovereign disposable certification |
| Supabase PostgREST/Auth | D | No on direct | Forbidden on staging/disposable sovereign activation |
| Sui zkLogin / Google | D | No | Legacy holder path |
| On-chain stamps | C | No | Optional commodity RPC |
| Vercel / generic hosting | C | No | HTTP runtime only — not trust root |

Run audit (redacted JSON):

```bash
npm run sovereign-runtime:audit-dependencies-561
```

`GET /api/sovereign/health` includes `provider_independence` when configured.

## Portable deployment

```bash
export SOVEREIGN_PORTABLE_POSTGRES_PASSWORD='…'
export SOVEREIGN_PORTABLE_RESTORE_POSTGRES_PASSWORD='…'
bash scripts/sovereign-runtime/init-portable-data-dirs.sh
cp .env.sovereign.portable.example .env.sovereign.portable   # set keys; never commit
docker compose -f docker-compose.sovereign.portable.yml up -d --build
npm run sovereign-runtime:verify-portable-561
```

Includes **Next.js API** service (`abraxas-portable-api`) with evidence/backup bind mounts. Native Linux: `deploy/systemd/abraxas-sovereign-portable.service.example` after `ABRAXAS_STANDALONE_BUILD=1 npm run build`.

**Configured vs operational:** `provider_independent_core_configured` (env) vs `provider_independent_core_operational` (live Postgres + evidence R/W + signing probes).

Trust semantics are unchanged across founder hardware, Linux VPS, or institution-operated Postgres — only env URLs and volumes differ.

## Portability proof (observed)

When `ABRAXAS_SOVEREIGN_PG_URL` and `ABRAXAS_SOVEREIGN_RESTORE_PG_URL` point to **distinct** databases:

```bash
npm run test:sovereign-certification
```

The `sovereignBackupRestore.test.ts` case exports encrypted backup from environment A, restores to B, verifies schema inventory and evidence decryptability. **Not claimed** without two live endpoints.

## Blockers (this agent run)

- No founder-operated persistent staging/VPS deploy executed from cloud agent.
- Demo hostname remains Supabase-backed (`UNCONFIGURED` sovereign health).
- Two-environment portability requires operator-provisioned Postgres pair (compose or VPS).

## Security invariants

- Category **D** must not be active on sovereign core (`provider_independent_core_configured` false otherwise; env alone is not operational).
- Synthetic DB tests remain disposable-only (#559 isolation).
- No proprietary cryptography — standard Ed25519 + AES-GCM via audited libraries.
