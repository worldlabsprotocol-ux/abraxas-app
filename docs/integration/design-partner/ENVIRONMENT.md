# Environment variables (design partner sandbox)

**Never commit secrets.** Use your platform secret manager.

## Hosted Partner Flow (issuance + callback)

| Variable | Required | Description |
|----------|----------|-------------|
| `ABRAXAS_SANDBOX_API_KEY` | Yes (canonical `vr_*` path) | `abx_test_…` from Integration Studio |
| `ABRAXAS_PARTNER_ID` | Yes | Sandbox partner id |
| `ABRAXAS_POLICY_ID` | Yes | Policy bound to your application |
| `ABRAXAS_APP_ID` | Yes | Sandbox application id |
| `ABRAXAS_BASE_URL` | Yes | `https://abraxasworld.xyz` (or staging URL provided) |
| `ABRAXAS_PACK_ID` | If pack-bound | e.g. age or wallet-control pack id |

## Trust (verify time)

| Variable | Required | Description |
|----------|----------|-------------|
| `ABRAXAS_INTEGRATOR_TRUST_ANCHOR_JSON` | One of anchor envs | Inline trust anchor bundle JSON |
| `ABRAXAS_INTEGRATOR_TRUST_ANCHOR_PATH` | One of anchor envs | Path to anchor JSON file |
| `ABRAXAS_INTEGRATOR_TRUST_REGISTRY_JSON` | Optional (#827) | Multi-anchor registry with overlap/distrust |
| `ABRAXAS_INTEGRATOR_TRUST_REGISTRY_PATH` | Optional (#827) | Path to registry JSON |

## Standalone portable example (`examples/portable-relying-party/`)

| Variable | Required | Description |
|----------|----------|-------------|
| `RP_PARTNER_ID` | Yes | Must match receipt audience |
| `RP_POLICY_ID` | Yes | Must match receipt policy binding |
| `RP_ENVIRONMENT` | Yes | `demo` or `production` |
| `RP_ABRAXAS_BASE_URL` | Yes | Base URL for portable export fetch |
| `RP_TRUST_ANCHOR_PATH` | Yes | Out-of-band anchor file |
| `RP_CHECKPOINT_PATH` | Optional (#827) | Local checkpoint store file |

## Not required for partners

- Supabase credentials
- Abraxas service role keys
- Production signing keys
- Founder wallet keys

Partners implement **their own** checkpoint persistence (file, Redis, Postgres, etc.) via `PartnerStatusCheckpointStore` — Abraxas does not host this state.
