# Abraxas Trust Layer v1

Pilot infrastructure making Decision Receipts **continuously trustworthy** via live credential status, issuer signing keys, and trust registry enforcement.

## Flow

```
issuer → signed claim attestation → credential (live status)
  → policy evaluation (issuer trust rules) → Decision Receipt (signed, immutable)
  → live validity check (dependencies + status propagation)
```

Decision Receipts prove a decision happened at a point in time. Trust Layer v1 proves that decision can **still be trusted** — or explains why it cannot.

## Migrations

| Order | File | Requires |
|-------|------|----------|
| 1 | `033_decision_receipts.sql` | 018 |
| 2 | **`034_credential_status_registry.sql`** | 018, 033 |
| 3 | **`035_issuer_framework_trust_registry.sql`** | 019, 018 |

Run preflight and postflight queries in each migration file.

## API (pilot)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/v1/credentials/:id/status` | Partner key (`verify:credential`) | Live claim status, no PII |
| `GET /api/v1/decision-receipts/:id/status` | Partner key (`verify:requests`) | Receipt + live validity + dependencies |
| `POST /api/v1/issuers/claims/submit` | Partner key | Submit issuer-signed claim attestation |
| `GET /api/admin/issuers` | Admin PIN | Issuer list |
| `GET /api/admin/issuers/:id` | Admin PIN | Issuer + keys + audit |
| `GET /api/admin/credentials/:id` | Admin PIN | Credential timeline + dependent receipts |
| `PATCH /api/admin/claims/status` | Admin PIN | Validated status transitions |

## Receipt validity states

- `active`
- `invalidated` / `expired`
- `suspended_dependency` / `revoked_dependency` / `under_review_dependency`
- `issuer_key_revoked` / `issuer_untrusted`
- `signature_invalid` / `sandbox_only`

Historical receipt payloads and signatures are **never mutated**. Validity is computed at read time.

## Admin UI

- `/admin/trust` — issuers + credential timeline
- `/admin/receipts` — receipt inspector with dependencies and live validity

## Explicitly not built

- Public self-serve issuer portal
- MetaMask / Phantom native integration
- OpenID4VCI / OpenID4VP
- External issuer pilots (next milestone after deploy)
- On-chain enforcement

## Asset monitoring v1

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/admin/asset-signals` | Admin PIN | Preview or apply signals (operator) |
| `POST /api/v1/asset-signals` | Partner `abx_live_` key | Partner webhook for material state changes |
| `GET /api/cron/asset-monitoring` | `CRON_SECRET` | Daily automated feeds (also runs inside `/api/cron/bags-sync`) |

Set `ASSET_MONITORING_AUTO_APPLY=true` to auto-apply claim transitions from cron feeds.

## External relying party proof

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/integrations/relying-party-proof` | Public | Live status of mainnet gate #5 |

Production verify calls from external `abx_live_` partners with `decision: approved` count toward the gate.

## Next milestone

1. **Asset monitoring v1** — `POST /api/admin/asset-signals` ingests material state-change signals (ownership, lien, appraisal TTL) and applies validated claim transitions (preview or apply). Full automation (MLS/title feeds) is still in progress.
2. One **real external issuer pilot** + one **real relying-party pilot** outside Abraxas first-party flows.
