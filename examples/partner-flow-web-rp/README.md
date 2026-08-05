# Partner Flow — minimal web relying party example

Integrate Abraxas Partner Flow with **one browser redirect** and **server-side receipt verification**.

**Canonical production host:** `https://abraxasworld.xyz`

> **No fake customer / no self-serve production provisioning.** Partner rows, policies, and callback allowlists are created by Abraxas operators only. This example does not provision partners or mutate live data.

## Generic configuration (any protocol)

Set your operator-provisioned ids via environment variables — **no Good Trouble defaults**:

```bash
export PARTNER_FLOW_RP_PARTNER_ID=your-protocol-partner
export PARTNER_FLOW_RP_POLICY_ID=your-protocol-policy-v1
export PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback
export PARTNER_FLOW_RP_BASE_URL=https://abraxasworld.xyz
```

Build a verify URL:

```bash
node examples/partner-flow-web-rp/build-verify-url.mjs
```

Run the conformance harness:

```bash
npm run partner:conformance
```

Full integrator workflow: `docs/PARTNER_FLOW_REFERENCE_INTEGRATION.md`

## Good Trouble pilot example (labeled reference only)

Good Trouble (`good-trouble-cannabis` / `good-trouble-retail-v1`) is Abraxas's hosted pilot checkout at `/good-trouble/*` — see `lib/goodTrouble/pilotExample.ts`. New protocols must use their own ids via the env vars above.

## Prerequisites (operator-provisioned)

Before redirecting users, Abraxas operators must:

1. Create a `partners` row with your `partner_id`
2. Create an active `partner_policies` row with your `policy_id`
3. Add your **exact** callback URL to `partners.allowed_return_urls`

See `docs/PARTNER_ONBOARDING_CHECKLIST.md`. There is no self-serve provisioning.

> **Warning:** Return URLs are **fail-closed**. If your callback is not explicitly allowlisted, Partner Flow returns `400 return_url is not allowlisted`.

## Integration steps

### 1. Add a “Continue with Abraxas” link (browser only — no API key)

```html
<a href="https://abraxasworld.xyz/partner/verify?partner_id=YOUR_PARTNER_ID&policy_id=YOUR_POLICY_ID&return_url=https%3A%2F%2Fyour-app.example.com%2Fauth%2Fabraxas%2Fcallback">
  Continue with Abraxas
</a>
```

Build the URL server-side in production so `return_url` is always your canonical HTTPS callback.

### 2. Handle the callback (server-side)

After verification, Abraxas redirects the holder to your `return_url` with query parameters:

| Parameter | Example | Notes |
|-----------|---------|-------|
| `status` | `approved` | Do not trust alone — verify receipt |
| `receipt_id` | `dr_…` | Fetch public receipt view |
| `decision_id` | UUID | Audit correlation |
| `receipt_expires_at` | ISO8601 | Session receipt TTL |
| `credential_id` | JTI | Credential reference |
| `policy_id` | your policy | Must match your gate |
| `partner_id` | your partner | Must match your integration |

**No PII** is included in the callback URL.

### 3. Verify the signed receipt (server-side, no API key)

```bash
node examples/partner-flow-web-rp/verify-callback.mjs \
  --receipt-id dr_FROM_CALLBACK \
  --partner-id YOUR_PARTNER_ID \
  --policy-id YOUR_POLICY_ID
```

Or call the public endpoint from your backend:

```bash
curl -s "https://abraxasworld.xyz/api/receipts/dr_FROM_CALLBACK/public"
```

Check (fail closed on any failure):

- `signature_valid === true`
- `decision_result === "approved"`
- `status === "active"`
- `expires_at` present, valid, and not passed
- `production_usable === true` (production integrations)
- `partner_id` and `policy_id` match your integration

For sandbox/pilot policies only, pass `--allow-sandbox` to the example verifier or set `allowSandbox: true` in `validatePartnerFlowPublicReceipt`. Never accept `production_usable: false` in production by default.

### 4. Grant access only after verification passes

Fail closed on any validation error. Do not parse or trust callback parameters without fetching and verifying the receipt.

## Auth boundary

| Surface | Credential |
|---------|------------|
| `/partner/verify`, evaluate, complete, refresh | Browser session cookie on `abraxasworld.xyz` |
| `GET /api/receipts/{id}/public` | **None** — call from your server |
| Server trust APIs | Partner API key (`abx_live_…`) — **never in browser** |

## Full documentation

- `/docs/partner-flow` — decision tree, lifecycle, error table
- `lib/partner/verifyPartnerFlowReceipt.ts` — validation logic used in tests
- `docs/PARTNER_ONBOARDING_CHECKLIST.md` — operator provisioning

## Local development

Use a callback URL that operators have explicitly added to your sandbox partner allowlist (e.g. `http://localhost:3000/your/callback`). Implicit demo URLs are not guaranteed in production.
