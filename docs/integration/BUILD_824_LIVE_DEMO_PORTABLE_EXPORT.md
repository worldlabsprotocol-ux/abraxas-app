# Build #824 — Live Demo portable export (no new infrastructure)

## Intent

Prove the **deployed Demo** environment can export portable verification artifacts for genuine receipt `dr_jSXuDfM_pFMT36du`, using **existing Demo authoritative state** (Supabase operational store) for signed status — not a new sovereign PostgreSQL installation.

Relying-party verification remains **standalone** (`@abraxas/independent-verifier`); issuer-side DB reads never become the partner trust root.

## Issuer-side status authority

| Path | When |
| --- | --- |
| `sovereign_pg` | `ABRAXAS_SOVEREIGN_ENV_CLASS` staging/disposable + sovereign PG URL configured |
| `operational_demo_store` | Default on Demo — `evaluateReceiptCurrentValidity` + issuer key checks from SIAS |

Export **fails closed** when `store_available` is false or status signer / anchor env is missing.

Status version monotonic bump uses, in order:

1. Sovereign PG `sovereign_receipt_status_checkpoints`
2. Demo Postgres `portable_export_status_checkpoints` (migration `150_portable_export_status_checkpoints.sql`)
3. Deterministic hash fallback from evaluation basis (only if checkpoint tables absent)

## Demo deployment

`demo.abraxasworld.xyz` is bound to Vercel **custom environment** `env_OILNDL1XzhouauSEnyVNGapIKsY2` — merging `main` does **not** auto-update Demo. Promote an approved deployment to that environment after CI passes.

## Live probe

```bash
npm run build824:live-demo-portable-acceptance
```

Optional standalone step (supply pin JSON out-of-band):

```bash
export ABRAXAS_BUILD824_INTEGRATOR_PINNED_ANCHOR_JSON='…'
npm run build824:live-demo-portable-acceptance
```

## Expected acceptance for expired genuine receipt

- `cryptographically_authentic`: **true**
- `currently_acceptable`: **no** (expired / not current — not a failure of integration)
