# Good Trouble — First Production Transaction Runbook

Operator guide for the canonical Launchpad production path. Read-only preflight first; no automatic production mutations.

## Canonical vs legacy

| | Canonical production | Legacy sandbox |
|---|---|---|
| Partner ID | `good-trouble` | `good-trouble-cannabis` |
| Application slug | `good-trouble` | (none) |
| Policy | `age_21_retail` → `good-trouble-age_21_retail-v1` | `good-trouble-retail-v1` |
| Start | `POST /api/v1/partner-handoff` | `/good-trouble` → `/partner/verify` |
| Verify | `AbraxasPartnerKit.verifyForAction` | `decideGoodTroubleAccess` (sandbox kit) |
| Callback | `https://www.goodtroublecanna.com/age-verification-result` | `/good-trouble/enter` |

Do not route the production pilot through legacy sandbox infrastructure.

---

## A. Preflight

```bash
npm run good-trouble:production-readiness
```

All **critical** checks must be **PASS**. If anything is **FAIL**, stop and perform the manual operator action listed in the report blockers. The command is read-only and never prints credential secrets.

---

## B. Good Trouble initiates handoff

**Endpoint:** `POST https://<abraxas-host>/api/v1/partner-handoff`

**Headers:**

```
Authorization: Bearer <GOOD_TROUBLE_ABX_LIVE_KEY>
x-abraxas-application-id: <GOOD_TROUBLE_APPLICATION_ID>
Content-Type: application/json
```

**Body** (strict allowlist — only these fields):

```json
{
  "runtime": "universal_https",
  "binding_id": "<AGE_21_RETAIL_BINDING_ID>"
}
```

- `runtime` defaults to `universal_https` if omitted.
- `binding_id` must be the production-authorized `age_21_retail` binding for the Good Trouble application.
- Forbidden body fields (rejected): `partner_id`, `policy_id`, `return_url`, `callback_url`, `receipt_id`, `api_key`, etc.

Obtain `<GOOD_TROUBLE_ABX_LIVE_KEY>` and `<GOOD_TROUBLE_APPLICATION_ID>` from Launchpad after production activation. Never embed the live key in client-side code.

---

## C. Expected Abraxas response

Successful response includes:

- `ok: true`
- Handoff / request identifier (e.g. `handoff_id`, `verify_request`)
- Hosted Partner Flow URL for the holder
- Expiry / TTL (handoffs expire; default 15 minutes)

The response is **not** a receipt grant. Good Trouble must re-verify after holder completion.

---

## D. Holder flow

1. Good Trouble redirects the holder to the Hosted Partner Flow URL only (never the API key).
2. Holder sees:
   - **Good Trouble** as requestor
   - **Age 21 eligibility** purpose
   - **What is shared:** signed result `age_eligible_21`
   - **What stays private:** date of birth, government ID, legal name, email
3. Holder consents explicitly.
4. Holder completes verification or reuses qualifying Passport evidence (fresh consent still required per request).

---

## E. Decision

Expected eligibility result: **`age_eligible_21`** — only when policy evaluation genuinely passes.

If evaluation fails, holder sees a denial path; no production receipt should be issued.

---

## F. Receipt

1. Production signed receipt is issued (`decision_context: production`).
2. Holder sees the live **DecisionReceiptCard** (#505) before returning.
3. Confirm on the public receipt (`GET /api/receipts/{receipt_id}/public`):
   - `environment` / production-usable
   - `currently_valid: true`
   - `signature_valid: true`
   - Correct `policy_id`, `partner_id`, binding context
   - Result family `age_eligible_21`

---

## G. Return

Holder **explicitly** selects **Return to Good Trouble**. There is no auto-redirect before receipt review (#505).

Good Trouble receives `receipt_id` on the approved callback URL (query param per Partner Flow configuration).

---

## H. Partner verification

On callback, Good Trouble server **must** verify before granting access:

1. `GET /api/receipts/{receipt_id}/public`
2. `AbraxasPartnerKit.verifyForAction({ receiptId, binding })` with:
   - Production environment
   - Good Trouble `partner_id`
   - `age_21_retail` binding / policy match
   - Receipt current and signature valid

Grant access only when verification permits. A callback or deep link is never a grant.

**Wix / Velo:** same server-side pattern via backend web methods; use `runtime: "wix_velo"` if generating starter snippets. **Universal HTTPS:** identical verify path from any backend.

---

## I. Privacy contract

**Good Trouble does NOT receive:**

- Date of birth
- Government ID images
- Legal name (unless independently collected outside Abraxas)
- Email (unless independently collected)
- Underlying verification evidence or raw Reclaim proof

**Good Trouble DOES receive:**

- Signed eligibility result: `age_eligible_21`
- Receipt metadata: `receipt_id`, `policy_id`, `policy_version`, `partner_id`, validity/expiry, signature validity
- Safe integration telemetry (no holder PII)

---

## J. Evidence

After the transaction, confirm privacy-safe telemetry:

- `/admin/pilot-evidence` shows production funnel stages (`first_production_request`, `receipt_issued`, `partner_verification_succeeded`) from **live events only**
- Re-run preflight JSON acceptance checklist — stages advance only with real event evidence
- Retain investor-safe fields: application ID, binding ID, policy, environment, timestamps, receipt ID, verification outcome, event IDs, latency (if captured)

Do not backfill or synthesize events.

---

## Second request / reuse test

After transaction #1 succeeds:

1. Repeat **Section B** for the **same holder**.
2. Expect fresh request-specific consent and a **new receipt_id**.
3. Underlying qualifying evidence may be **reused** when freshness rules allow (`evidence_reuse_accepted` vs `evidence_refresh_required` in integration telemetry).
4. Good Trouble still receives only `age_eligible_21`.

---

## Failure acceptance (do not manufacture in production)

Existing tests cover safe denial paths:

- Expired handoff / receipt
- Invalid or non-allowlisted callback
- Wrong binding or policy mismatch
- Sandbox credential against production binding
- Revoked credential or non-production-authorized binding
- Invalid signature, wrong partner, replayed action

See `lib/goodTrouble/productionAcceptance.test.ts` and `lib/goodTrouble/productionReadiness.test.ts`.

---

## Integration surface (minimum)

| Item | Requirement |
|---|---|
| Endpoints called | `POST /api/v1/partner-handoff`, `GET /api/receipts/{id}/public` |
| SDK | `AbraxasPartnerKit.verifyForAction` |
| Secret held | One `abx_live_*` key + application ID (server only) |
| Callback exposed | HTTPS allowlisted return URL on Good Trouble site |
| Result received | `age_eligible_21` via verified receipt |
| Server verification | Mandatory before access grant |

---

## Investor claims after one transaction

**Defensible after transaction #1:**

- External relying party completed a production eligibility flow
- Partner received a policy-specific signed decision, not underlying identity evidence
- Production receipt was independently verified by the relying party
- Integration used binding-scoped production authorization

**Requires more data (not from one transaction):**

- Reuse rate, repeat-holder metrics, conversion/retention, multi-policy usage, time-series volume
