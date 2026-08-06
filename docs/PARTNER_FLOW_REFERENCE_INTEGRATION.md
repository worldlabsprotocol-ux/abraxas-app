# Partner Flow — reference relying-party integration

Generic, environment-driven Partner Flow integration for **any protocol** — not tied to Good Trouble.

**Canonical Abraxas host:** `https://abraxasworld.xyz`

> **No fake customer / no self-serve production provisioning**
>
> Abraxas does **not** create partner rows, policies, or callback allowlists automatically. There is no self-serve portal to provision production partners. Every third-party protocol must complete **operator onboarding** before redirecting real users. This reference integration and conformance harness validate configuration and contracts only — they do not mint partners or mutate Supabase.

---

## Who this is for

- A **second protocol** (or any external relying party) integrating Abraxas Partner Flow
- Engineering teams building a sandbox pilot before production promotion
- CI pipelines verifying contract alignment without creating verification requests

**Good Trouble** (`/good-trouble/*`) remains a **labeled pilot example** only — see `lib/goodTrouble/pilotExample.ts`. New protocols must use their own `partner_id`, `policy_id`, and callback URL.

---

## Operator workflow (human step required)

Before your protocol can run a live pilot, an Abraxas operator must:

1. **Create a partner row** in `public.partners` with your stable `partner_id`, `is_external=true`, and exact callback URL(s) in `allowed_return_urls`
2. **Create an active policy** in `public.partner_policies` bound to your `partner_id`
3. **Confirm signing** is enabled in production (`GET /api/trust/status` → `signing_configured: true`)
4. **Issue API keys** only if you also need server trust APIs (Partner Flow browser routes do not use API keys)

See `docs/PARTNER_ONBOARDING_CHECKLIST.md` for the full checklist.

**Second partner pilot (operator runbook):** `docs/SECOND_PARTNER_PILOT_RUNBOOK.md` — create partner row, active policy, `allowed_return_urls`, `npm run partner:conformance`, live flow, receipt verification, audit trace.

**This is the remaining human/operator step** — the reference app and conformance harness cannot substitute for provisioning.

---

## Configure the reference app

Set environment variables (no Good Trouble defaults):

| Variable | Required | Example |
|----------|----------|---------|
| `PARTNER_FLOW_RP_PARTNER_ID` | Yes | `your-protocol-partner` |
| `PARTNER_FLOW_RP_POLICY_ID` | Yes | `your-protocol-policy-v1` |
| `PARTNER_FLOW_RP_RETURN_URL` | Yes | `https://your-app.example.com/auth/abraxas/callback` |
| `PARTNER_FLOW_RP_BASE_URL` | No | `https://abraxasworld.xyz` (default) |
| `PARTNER_FLOW_RP_DISPLAY_NAME` | No | `Your Protocol` |

### Build a verify URL

```bash
PARTNER_FLOW_RP_PARTNER_ID=your-protocol-partner \
PARTNER_FLOW_RP_POLICY_ID=your-protocol-policy-v1 \
PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback \
PARTNER_FLOW_RP_BASE_URL=https://abraxasworld.xyz \
node examples/partner-flow-web-rp/build-verify-url.mjs
```

Output is a browser redirect URL:

```
https://abraxasworld.xyz/partner/verify?partner_id=your-protocol-partner&policy_id=...
```

Add this as a “Continue with Abraxas” link in your app. Build it **server-side** in production.

---

## Launch a sandbox pilot

1. Ask operators to provision a **sandbox/pilot** partner row with your callback URL allowlisted (localhost permitted only if explicitly added)
2. Configure the env vars above with your provisioned ids
3. Run the conformance harness against Abraxas:

```bash
PARTNER_FLOW_RP_PARTNER_ID=your-protocol-partner \
PARTNER_FLOW_RP_POLICY_ID=your-protocol-policy-v1 \
PARTNER_FLOW_RP_RETURN_URL=https://your-app.example.com/auth/abraxas/callback \
PARTNER_FLOW_RP_BASE_URL=https://abraxasworld.xyz \
npm run partner:conformance
```

4. For sandbox-only policies, add `PARTNER_CONFORMANCE_ALLOW_SANDBOX=true` when validating receipt fixtures
5. Redirect a test holder through the verify URL — **do not** skip server-side receipt verification on callback

---

## Validate callback and signed receipt on your backend

After Abraxas redirects to your `return_url`, query parameters are present but **must not be trusted alone**. Fetch and verify the public receipt view:

```bash
node examples/partner-flow-web-rp/verify-callback.mjs \
  --receipt-id dr_FROM_CALLBACK \
  --partner-id your-protocol-partner \
  --policy-id your-protocol-policy-v1
```

Or from your backend:

```bash
curl -s "https://abraxasworld.xyz/api/receipts/dr_FROM_CALLBACK/public"
```

Fail closed unless all checks pass:

- `signature_valid === true`
- `decision_result === "approved"`
- `status === "active"`
- `expires_at` present, valid, and not passed
- `production_usable === true` (production integrations)
- `partner_id` and `policy_id` match your integration

Validation logic: `lib/partner/verifyPartnerFlowReceipt.ts`

---

## Conformance harness

```bash
npm run partner:conformance
```

Requires `PARTNER_FLOW_RP_PARTNER_ID`, `PARTNER_FLOW_RP_POLICY_ID`, and `PARTNER_FLOW_RP_RETURN_URL`.

### What it validates

| Check | Description |
|-------|-------------|
| Configuration complete | Partner/policy/return URL present |
| Canonical origin | Base URL is `https://abraxasworld.xyz` in production mode |
| Callback URL format | HTTPS absolute URL, callback path, no stale hosts |
| Receipt fail-closed fixtures | Offline validation rejects invalid signature, wrong partner/policy, expired, revoked, sandbox-only |
| Compatibility manifest | Live `GET /api/protocol/compatibility` vs frozen local contract |
| Frozen callback parameters | Manifest `callback.query_parameters` match frozen contract |

Optional:

- `PARTNER_CONFORMANCE_ALLOW_SANDBOX=true` — include sandbox receipt opt-in fixture
- `PARTNER_CONFORMANCE_SKIP_LIVE_MANIFEST=true` — fixture-only mode (no HTTP)

**Exit code:** `0` unless any check is **FAIL**. **PENDING** does not fail CI.

---

## Good Trouble pilot example (reference only)

Good Trouble is Abraxas's hosted pilot checkout — not a template for new partners:

- Config: `lib/goodTrouble/pilotExample.ts`
- Hosted UI: `/good-trouble/*`
- Integration preflight defaults still use Good Trouble ids for operator smoke tests — override with env vars for your protocol

---

## Related docs

- `examples/partner-flow-web-rp/README.md` — minimal web RP walkthrough
- `docs/PARTNER_ONBOARDING_CHECKLIST.md` — operator provisioning
- `docs/INTEGRATION_PREFLIGHT.md` — deployment-wide integration preflight
- `docs/PROTOCOL_COMPATIBILITY.md` — frozen Partner Flow contract
- `/docs/partner-flow` — integrator guide
