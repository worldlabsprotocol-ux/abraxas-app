# Investor milestone — Infrastructure independence (Build #561)

## What Abraxas independently controls

When deployed with `postgres_direct`, Abraxas operates **its own** identity persistence (PostgreSQL), **encrypted evidence custody**, **issuer signing keys**, **policy evaluation**, **receipt verification** (offline-capable), and **encrypted database recovery** — without Supabase, Veriff, or a hosted verifier as the trust root for that path.

## Why it matters

Defensibility comes from **portability**: the same protocol runs on ordinary Linux with Docker volumes and standard Postgres. A relying party can verify receipts with public keys and registry material — not Abraxas SaaS APIs.

## Verified in this build (code + tests)

- Runtime dependency audit with explicit A/B/C/D classification.
- Sovereign health reports provider independence status.
- Independent IDV readiness no longer **requires** Supabase when `postgres_direct` is configured.
- Portable compose stack for Postgres + restore + evidence/backup volumes.
- Existing backup/restore test documents A→B portability when two databases are available.

## External dependencies that remain

- **Commodity**: Linux, Docker, PostgreSQL engine, optional chain RPC, optional HTTP host (Vercel/VPS).
- **Legacy/demo**: Supabase PostgREST path until cutover; Veriff only when explicitly enabled.
- **Not claimed**: production deployment, customer traction, third-party audits, or full staging E2E on founder hardware.
