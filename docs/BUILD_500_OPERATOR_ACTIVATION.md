# Build #500 — Example Merchant operator activation

Independent **Example Merchant** sandbox integration on isolated Abraxas staging (demo Supabase). Policy pack **`age_21_retail`** → partner receives **`age_eligible_21` only**.

## Prerequisites (who provides what)

| Input | Provider | Notes |
|--------|-----------|--------|
| Vercel **preview** URL bound to **demo** Supabase | Abraxas platform | Must not be production host or production ref `bztwutzprwsdrtqdpymf` |
| Launchpad sandbox application | Partner operator | Policy pack `age_21_retail`, callback allowlisted |
| `partner_id`, pinned `policy_id`, application UUID | Partner operator | From Launchpad — never commit |
| `PARTNER_FLOW_RP_*` env | Partner operator | See below |
| Authorized **test holder** session | Identity operator | `PLAYWRIGHT_STORAGE_STATE` local file only |
| `VERCEL_PROTECTION_BYPASS` | Vercel project admin | If deployment protection enabled |

## Environment variables

```bash
export PARTNER_FLOW_RP_PARTNER_ID="<launchpad partner_id>"
export PARTNER_FLOW_RP_POLICY_ID="<pinned policy_id e.g. acme-age_21_retail-v1>"
export PARTNER_FLOW_RP_RETURN_URL="https://<your-rp>/auth/abraxas/callback"
export PARTNER_FLOW_RP_BASE_URL="https://<preview>.vercel.app"
export LAUNCHPAD_EXPECTED_SUPABASE_REF="ocntwbxarpjeixdnzide"   # demo only
export EXAMPLE_MERCHANT_LAUNCHPAD_APPLICATION_ID="<uuid>"
export PLAYWRIGHT_STORAGE_STATE="$HOME/.abraxas/example-merchant-storage.json"
export VERCEL_PROTECTION_BYPASS="<optional>"
```

## Safe provisioning steps

1. Confirm preview identity: `GET /api/launchpad/staging/environment` → `deployment_environment: preview` and expected `supabase_project_ref`.
2. Create Launchpad application; pin **Age 21 eligibility** pack; add exact HTTPS callback.
3. Issue/rotate **sandbox** API credential (never production).
4. Export `PARTNER_FLOW_RP_*` from Launchpad integration docs.

Optional reference smoke (provisions tagged app): `npm run smoke:launchpad:staging` with `LAUNCHPAD_STAGING_URL`.

## Activation commands

```bash
# Phase 1 — readiness only (no browser)
npm run partner:staging-activate

# Phase 2 — live holder flow + server receipt verify
EXAMPLE_MERCHANT_EXECUTE_LIVE=1 npm run partner:staging-activate

# Manual MFA/biometric checkpoint
PARTNER_LIVE_E2E_AUTOMATION_SOURCE=manual_checkpoint npm run partner:live-e2e -- --interactive
```

Reports (safe, no secrets): `reports/example-merchant-staging-readiness.json`, `reports/example-merchant-staging-evidence.json`.

## Expected success

- Readiness `overall: ready_to_execute` (or `operator_setup_required` with clear missing items)
- Playwright captures callback with `receipt_id`
- Harness `live_e2e_complete: true` and `live_receipt_verify: pass`
- Launchpad `signals.live_e2e_complete: true` after real flow (integration events)

## Failure troubleshooting

| Symptom | Action |
|---------|--------|
| `staging identity endpoint status=404` | URL is not a preview deployment or wrong project |
| `supabase_project_ref mismatch` | Preview points at wrong Supabase — do not proceed |
| `Vercel deployment protection` | Set bypass token or storage state after SSO |
| `callback_timeout` | Complete holder verification; use `--interactive` |
| `live_receipt_correlation_missing` | Ensure artifact or callback URL written after run |

## Cleanup / rollback

- Revoke sandbox API keys in Launchpad if test complete.
- Delete local `PLAYWRIGHT_STORAGE_STATE` and artifact JSON from shared machines.
- Do not delete production partners or promote to production without review.

## Good Trouble

Example Merchant uses generic Partner Flow only. Good Trouble adapters remain unchanged; run `vitest run examples/good-trouble-wix/` before release if touching shared partner modules.
