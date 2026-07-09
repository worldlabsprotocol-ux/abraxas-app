# Step 5 — Tier 3 eligibility + partner sandbox

## Honest positioning

Step 5 adds **transaction-specific eligibility (Tier 3)** and an **internal partner sandbox** for testing policy, consent, and screening architecture.

**What is built:** partner-style policy, consent flow, screening claim, and Tier 3 eligibility experience.

**What is not proven yet:** an independent organization using its own `abx_live_` key, making real requests, and relying on Abraxas for a production decision.

Do **not** present the sandbox as a live external relying party until a separate organization has explicitly agreed to participate.

## Abraxas Partner Sandbox

- **Public name:** Abraxas Partner Sandbox
- **Partner ID:** `abraxas-partner-sandbox`
- **Policy:** `partner-sandbox-gate-v1` (`sandbox_only: true`)
- **Disclaimer:** Sandbox demonstration — not a live financial offering or external partner integration.

Required claims (demo):

```json
{
  "sandbox_only": true,
  "required_claims": [
    { "claim_type": "identity_verified", "max_age_hours": 8760, "min_assurance": "L2" },
    { "claim_type": "wallet_binding_confirmed", "max_age_hours": 720, "min_assurance": "L2" },
    { "claim_type": "screening_outcome", "max_age_hours": 24, "must_equal": "clear" }
  ]
}
```

## Sandbox screening

**Production:** keep `PILOT_TIER3_SCREENING` unset or `false`. Demo screening is disabled in production by default.

When enabled (non-production or explicit opt-in), demo screening claims include:

- `issuer`: Abraxas Sandbox
- `environment`: sandbox
- `status`: demo
- `non_reliance`: true

Policy responses for sandbox policies return `decision_context: "sandbox_only"` and `production_usable: false`.

Sandbox claims **cannot** satisfy production policies.

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/passport/transaction-eligibility` | Tier 3 status + sandbox policy evaluation |
| POST | `/api/passport/pilot-screening` | Sandbox demo screening claim |
| POST | `/api/passport/demo-partner-request` | Demo consent URL (sandbox policy) |
| GET | `/api/partners/registry` | **External** relying partners only (excludes sandbox) |
| POST | `/api/external-assets/apply` | External asset owner application |

## External asset owner intake

Applications land in `external_asset_applications` with:

- `originator`: `external` or `abraxas_sample`
- `status`: `pending_review` until a named reviewer signs
- Public verify slug assigned after review — not before

One sample record (`ABX-DEMO-LAND-001`) is seeded as `is_demo_sample: true`.

## Partner onboarding (admin)

`/admin/partners` supports registering real future relying parties:

- Company, legal entity, contact email, use case
- Allowed environment (sandbox / production)
- Policy assignment + API key issuance and revocation
- Usage logs via `partner_api_usage`

## Migrations

Run in order in Supabase SQL editor:

1. `028_meridian_relying_partner.sql` — seeds sandbox partner + policy (filename is historical)
2. `029_sandbox_honest_labeling.sql` — relabel + external asset applications
3. `030_rename_legacy_sandbox_ids.sql` — **required if you previously ran an older 028 with meridian-* IDs**

## Public language (until real external proof exists)

> Pilot-ready verification infrastructure for real assets. Public verification, consent-based Passport access, and partner policy APIs are live in pilot. External relying-party and external-originator onboarding is underway.

## QA checklist

1. Passport → Tier 3 section shows **Abraxas Partner Sandbox** with amber sandbox label
2. Apply sandbox demo screening → claim shows demo/sandbox, not production Tier 3
3. Sandbox consent flow → partner access history
4. `/integrations/relying-parties` — sandbox in demo section; external list empty
5. `/api/partners/registry` → `count: 0`
6. Production policy evaluation rejects sandbox screening claims
7. No `meridian` strings in partner_id / policy_id after migration 030
