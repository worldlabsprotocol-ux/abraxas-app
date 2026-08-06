# Second Relying-Party Pilot Runbook

**Purpose:** Operator steps to onboard and validate a **second** external relying party using the existing Partner Flow Conformance Kit.  
**Scope:** Provisioning + validation only — does not change protocol behavior.  
**Prerequisite:** `docs/PARTNER_ONBOARDING_CHECKLIST.md`, `docs/PARTNER_FLOW_REFERENCE_INTEGRATION.md`

**Good Trouble** remains the first labeled pilot (`lib/goodTrouble/pilotExample.ts`). This runbook is for an additional protocol (partner #2).

---

## Overview

| Phase | Owner | Output |
|-------|-------|--------|
| 1. Partner row | Abraxas operator | `public.partners` row with `allowed_return_urls` |
| 2. Active immutable policy | Abraxas operator | `public.partner_policies` active row |
| 3. Conformance harness | Partner + operator | `npm run partner:conformance` exit 0 |
| 4. Live holder flow | Partner + operator | evaluate → Passport/consent → complete → callback |
| 5. Receipt verification | Partner backend | `signature_valid: true` on public receipt |
| 6. Audit trace | Abraxas operator | `npm run audit:partner-flow-trace` correlation PASS |

Record evidence IDs (no PII) in `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` or partner-specific pilot notes.

---

## 1. Create partner row (`public.partners`)

Run in **Supabase SQL editor** (production) after review. Replace placeholders.

```sql
-- Example: second pilot partner (sandbox-first)
insert into public.partners (
  partner_id,
  company,
  status,
  is_external,
  assigned_policy_id,
  allowed_environments,
  allowed_return_urls
) values (
  'your-protocol-v1',                    -- stable partner_id used in URLs
  'Your Protocol Inc.',
  'pilot',                               -- or 'active' when promoting
  true,
  'your-protocol-policy-v1',             -- must match policy id in step 2
  array['sandbox'],                      -- add 'production' when promoting
  array[
    'https://your-app.example.com/auth/abraxas/callback'
  ]
);
```

**Verify:**

```sql
select partner_id, status, is_external, allowed_return_urls, allowed_environments
from public.partners
where partner_id = 'your-protocol-v1';
```

**Fail-closed rule:** Partner Flow returns **400** `return_url is not allowlisted` if the callback URL used in `/partner/verify` is not listed **exactly** (origin + path prefix match per `lib/connect/returnUrlAllowlist.ts`).

---

## 2. Create active immutable policy (`public.partner_policies`)

Policy must be **`active`** before holders are redirected. For P1-1 immutability (migration 055), publish via operator workflow — see `docs/POLICY_VERSION_OPERATOR.md`.

**Draft example (adjust `rules_json` to pilot requirements):**

```sql
insert into public.partner_policies (
  id,
  version,
  partner_id,
  name,
  status,
  rules_json,
  effective_at
) values (
  'your-protocol-policy-v1',
  1,
  'your-protocol-v1',
  'Your Protocol — pilot policy',
  'active',
  '{
    "required_claims": ["identity_verified", "residency_country"],
    "minimum_age": 21,
    "session_receipt_hours": 24,
    "consent_required": true
  }'::jsonb,
  now()
);
```

**Verify:**

```sql
select id, version, partner_id, status
from public.partner_policies
where id = 'your-protocol-policy-v1';
```

**Note:** After migration 055, `rules_json` on `active` rows cannot be edited — create a new version row to change rules.

---

## 3. Configure explicit `allowed_return_urls`

Confirm the partner row from step 1 includes **every** production and pilot callback URL:

- HTTPS only (localhost only if explicitly allowlisted for dev)
- Path must match the route that runs **server-side** receipt verification
- No wildcard domains

**Update allowlist if needed:**

```sql
update public.partners
set allowed_return_urls = array[
  'https://your-app.example.com/auth/abraxas/callback',
  'https://staging.your-app.example.com/auth/abraxas/callback'
]
where partner_id = 'your-protocol-v1';
```

Share these values with the partner — they set `PARTNER_FLOW_RP_RETURN_URL` to the **exact** production callback.

---

## 4. Run Partner Flow Conformance Kit

From the Abraxas app repo (read-only — no Supabase mutations):

```bash
PARTNER_FLOW_RP_PARTNER_ID=your-protocol-v1 \
PARTNER_FLOW_RP_POLICY_ID=your-protocol-policy-v1 \
PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback \
PARTNER_FLOW_RP_BASE_URL=https://abraxasworld.xyz \
npm run partner:conformance
```

**Optional:**

- `PARTNER_CONFORMANCE_ALLOW_SANDBOX=true` — include sandbox receipt fixture case
- `PARTNER_CONFORMANCE_SKIP_LIVE_MANIFEST=true` — offline fixtures only

**PASS:** exit code `0`, no **FAIL** rows. **PENDING** is acceptable.

**Build verify URL for partner QA:**

```bash
PARTNER_FLOW_RP_PARTNER_ID=your-protocol-v1 \
PARTNER_FLOW_RP_POLICY_ID=your-protocol-policy-v1 \
PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback \
node examples/partner-flow-web-rp/build-verify-url.mjs
```

---

## 5. Live flow — evaluate → consent/Passport → complete → callback

Execute with a **test holder** in a browser (human steps). Capture IDs only.

| Step | Action | Evidence to record |
|------|--------|-------------------|
| 1 | Partner app links to `/partner/verify?partner_id=…&policy_id=…&return_url=…` | Verify URL timestamp |
| 2 | Holder signs in (zkLogin) if needed | Session cookie present |
| 3 | `POST /api/v1/partner-flow/evaluate` | `verification_request_id`, `flow_trace_id` (`ft_vr_*`), `next: passport` or `enter` |
| 4 | If `passport`: consent ceremony + ID capture + **admin approval** | Consent + approval confirmed |
| 5 | `POST /api/v1/partner-flow/complete` (via `PartnerFlowReturnHandler`) | `decision_id`, `receipt_id` (`dr_*`) |
| 6 | Redirect to partner `return_url` with frozen query params | Callback URL shape (no PII) |

Frozen callback parameters: `status`, `decision_id`, `receipt_id`, `receipt_expires_at`, `credential_id`, `policy_id`, `partner_id`.

**Do not trust query params alone** — partner backend must fetch the public receipt.

---

## 6. Validate public receipt signature (partner backend)

```bash
curl -s "https://abraxasworld.xyz/api/receipts/dr_FROM_CALLBACK/public" | jq .
```

Or use the reference verifier:

```bash
node examples/partner-flow-web-rp/verify-callback.mjs \
  --receipt-id dr_FROM_CALLBACK \
  --partner-id your-protocol-v1 \
  --policy-id your-protocol-policy-v1
```

**PASS requires all:**

- `signature_valid === true`
- `decision_result === "approved"`
- `status === "active"`
- `expires_at` valid and not expired
- `production_usable === true` (production integrations)
- `partner_id` and `policy_id` match provisioning

Validation logic: `lib/partner/verifyPartnerFlowReceipt.ts`

---

## 7. Audit trace correlation (operator)

After a successful live flow, correlate evaluate + complete audit events (read-only):

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

npm run audit:partner-flow-trace -- ft_vr_<VERIFICATION_REQUEST_ID>
```

**PASS requires:**

- `correlation_ok`, `sequence_ok`, `linkage_ok`, `pii_ok` (see script output)
- Same `flow_trace_id` on `partner_flow.evaluate` and `partner_flow.complete`

**SQL alternative** (Supabase SQL editor):

```sql
select action, metadata->>'flow_trace_id' as flow_trace_id,
       metadata->>'outcome' as outcome, metadata->>'receipt_id' as receipt_id,
       created_at
from audit_events
where metadata->>'flow_trace_id' = 'ft_vr_<VERIFICATION_REQUEST_ID>'
order by created_at;
```

---

## Evidence checklist (second partner)

- [ ] `partner_id` + `policy_id` provisioned
- [ ] `allowed_return_urls` includes exact callback
- [ ] `npm run partner:conformance` exit 0
- [ ] Live flow: `decision_id`, `receipt_id`, `flow_trace_id` recorded
- [ ] `GET /api/receipts/{id}/public` → `signature_valid: true`
- [ ] Callback captured (frozen params only)
- [ ] `audit:partner-flow-trace` PASS

---

## References

- `docs/PARTNER_ONBOARDING_CHECKLIST.md`
- `docs/PARTNER_FLOW_REFERENCE_INTEGRATION.md`
- `examples/partner-flow-web-rp/README.md`
- `docs/RELEASE_READINESS.md`
- `npm run release:readiness`
