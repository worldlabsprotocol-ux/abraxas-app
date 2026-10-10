# Cielo Sunrise — operator activation (Build #501)

## Staging requirements

- HTTPS Vercel **preview** bound to demo Supabase `ocntwbxarpjeixdnzide`
- `GET /api/launchpad/staging/environment` → `deployment_environment: preview` + matching ref
- Partner row `cielo` + active policy `cielo-verified-guest-v1` (migrations 026/032)
- Optional: `CIELO_LAUNCHPAD_APPLICATION_ID` for funnel events in `partner_integration_events`

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CIELO_STAGING_BASE_URL` | Preview origin |
| `LAUNCHPAD_EXPECTED_SUPABASE_REF` | Defaults to `ocntwbxarpjeixdnzide` |
| `VERCEL_PROTECTION_BYPASS` | If deployment protection enabled |
| `PLAYWRIGHT_STORAGE_STATE` | Authorized test holder session (local only) |
| `CIELO_LAUNCHPAD_APPLICATION_ID` | Optional Launchpad UUID for metrics |
| `CIELO_EXECUTE_LIVE_HOLDER_FLOW=1` | Gate live instructions (does not bypass MFA) |

Do **not** set `CIELO_VERIFIED_RATE_FIXTURE` for real proof.

## Commands

```bash
npm run cielo:staging-activate
CIELO_EXECUTE_LIVE_HOLDER_FLOW=1 npm run cielo:staging-activate

npm run cielo:e2e   # existing env/table health
```

## Holder journey (staging)

1. Open `/flagship` → **Start verified-guest flow**
2. `/cielo/verified-rate` — Google sign-in, profile, wallet bind, consent
3. Submit verified-rate request → confirmation ref `CVR-…`
4. Operator `/admin/cielo` — review queue (not booking confirmation)

## Receipt verification

After consent, note `receipt_id` from API response. Verify via public receipt endpoint using partner-kit trust path (`partner_id=cielo`, `policy_id=cielo-verified-guest-v1`).

## Airbnb

Use **View listing on Airbnb** from flagship — external only. Abraxas does not confirm Airbnb reservations.

## Troubleshooting

See `docs/BUILD_500_OPERATOR_ACTIVATION.md` for universal staging probe failures.

## Cleanup

Revoke test sandbox keys; delete local Playwright storage; do not copy production Supabase data into demo.
