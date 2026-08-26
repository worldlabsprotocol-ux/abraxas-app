# External design partner pilot playbook

**Audience:** Engineers integrating Abraxas Partner Flow at a third-party company.
**Goal:** Complete a **sandbox** integration in about two weeks, then submit evidence for an Abraxas sandbox-complete review.
**Not in scope:** Self-serve production access, live API keys, or production policy activation — those require a separate later review.

Read the technical contract first at `/docs/partner-flow` on `https://abraxasworld.xyz`. This playbook is your day-by-day checklist.

---

## What you are building

Partner Flow is a **browser redirect** flow:

1. Your app sends the holder to Abraxas with `partner_id`, `policy_id`, and an allowlisted `return_url`.
2. The holder completes verification on Abraxas.
3. Abraxas redirects back to your `return_url` with frozen query parameters (no PII), including `receipt_id`.
4. **Your server** calls `GET /api/receipts/{receipt_id}/public`, validates the signed receipt, and only then grants gated access.

**Webhooks** are an optional second track. They use different credentials and proof than Partner Flow receipts.

---

## Day 0–14 pilot timeline

| Day | Partner engineer | Abraxas operator |
|-----|------------------|------------------|
| **0** | Submit design partner application at `/integrations#apply`. | Review application (manual). |
| **1–2** | Read `/docs/partner-flow` and implement a server-side callback handler stub. | If approved, provision sandbox `partner_id`, `policy_id`, allowlisted `return_url`, and sandbox API key. |
| **2–3** | Receive secure handoff package. Store API keys and signing secrets **server-side only**. | Deliver credentials through an agreed secure channel — never in public tickets or chat logs. |
| **3–4** | Sign in to the partner portal at `/developers/partner` with your sandbox API key. | Confirm portal access and scopes (`verify:credential`, `verify:registry` by default). |
| **4–7** | Run Partner Flow end-to-end in sandbox: redirect → callback → public receipt fetch. | Answer provisioning questions; adjust allowlist if callback URL changes. |
| **7–9** | Validate sandbox receipts on your server (see checks below). Use `/verify?mode=receipt` only as a public mirror. | Review early blockers if receipt checks fail. |
| **9–11** | *(Optional)* Webhook track: register endpoint, queue sandbox test, confirm HTTP delivery, verify signature in your receiver. | Issue separate `webhooks:read` key if requested; register webhook endpoint. |
| **11–13** | Run `npm run partner:conformance` after credentials are issued. Collect evidence (template below). | Spot-check evidence; no production promotion yet. |
| **14** | Submit sanitized evidence package to your Abraxas operator contact. | Schedule sandbox-complete review. Production activation is a **separate** later step. |

---

## Step 1 — Apply

1. Go to `https://abraxasworld.xyz/integrations#apply`.
2. Describe your age-gated checkout or eligibility gate and technical contact.
3. Applications are reviewed **manually** — typically within a few business days.
4. There is no self-serve production portal and no automatic API-key issuance.

While you wait, read `/docs/partner-flow` and sketch your callback route.

---

## Step 2 — Secure credential handoff

After approval, Abraxas operators send a **handoff package**. Expect:

| Item | Notes |
|------|--------|
| `partner_id` | Stable identifier used in redirect URLs and receipts |
| `policy_id` | Sandbox policy Abraxas assigned to your integration |
| `return_url` | Exact HTTPS callback URL Abraxas allowlisted — must match character-for-character |
| Sandbox API key (`abx_test_…`) | Server-side only — scopes typically `verify:credential` and `verify:registry` |
| Partner portal URL | `https://abraxasworld.xyz/developers/partner` |

Sandbox handoff includes **`abx_test_…` keys only**. **`abx_live_…` credentials are never included** in sandbox pilot provisioning. Production (`abx_live_…`) keys require a separate later review.

**Optional (webhook track only):**

| Item | Notes |
|------|--------|
| Separate API key with `webhooks:read` | Default promote keys do **not** include webhook scope |
| Webhook signing secret | For validating inbound webhook signatures in **your** receiver |

### Credential safety rules

- **Never** put API keys, signing secrets, or raw keys in browser JavaScript, mobile apps, or public repos.
- **Never** commit credentials to git or paste them into support tickets.
- Store secrets in your server environment (secret manager, encrypted env vars).
- If a key is exposed, contact your Abraxas operator immediately so it can be rotated.

---

## Step 3 — Partner portal authentication

1. Open `https://abraxasworld.xyz/developers/partner`.
2. Paste your **sandbox API key** when prompted (server-to-portal handoff — do not embed in your product UI).
3. The portal shows sandbox integration progress scoped to your key capabilities.
4. Default keys support credential verification APIs — not webhook testing unless you received a `webhooks:read` key.

---

## Step 4 — Partner Flow testing (Track A)

### Entry URL

Operators supply all three values. Do not guess missing fields.

```
https://abraxasworld.xyz/partner/verify?partner_id={partner_id}&policy_id={policy_id}&return_url={return_url}
```

Replace `{partner_id}`, `{policy_id}`, and `{return_url}` with operator-provided values.
If `return_url` is not allowlisted, Partner Flow returns **400** — contact your operator.

### Callback parameters

Abraxas appends frozen query parameters (no PII): `status`, `decision_id`, `receipt_id`, `receipt_expires_at`, `credential_id`, `policy_id`, `partner_id`.

Your server must **not** trust URL parameters alone. Always fetch the public receipt.

### Server-side verification

```
GET https://abraxasworld.xyz/api/receipts/{receipt_id}/public
```

Implement this on your backend before granting access.

---

## Step 5 — Sandbox receipt validation

On every callback, your server should confirm:

| Check | Required in sandbox? |
|-------|----------------------|
| `signature_valid === true` | **Yes** — Ed25519 signature must verify |
| `partner_id` matches your `{partner_id}` | **Yes** |
| `policy_id` matches your `{policy_id}` | **Yes** |
| `decision_result === "approved"` | **Yes** when your gate requires approval |
| `production_usable === false` | May be expected — **not** a failure by itself |
| `currently_valid === false` | May be expected (e.g. `production_not_usable:false`) — **not** a failure by itself |

### Important sandbox boundary

**Sandbox receipts cannot authorize Production access.**
Even when signature and policy checks pass, treat `production_usable: false` and `currently_valid: false` as normal sandbox behavior. Reserve `currently_valid === true` for **production** gates only after Abraxas completes a separate production activation review.

The public receipt tester at `/verify?mode=receipt` mirrors the API response — it is **not** a substitute for server-side validation in your product.

---

## Step 6 — Optional webhook testing (Track B)

Skip this section unless Abraxas issued a `webhooks:read` key and registered your HTTPS endpoint.

Webhook proof is **independent** from Partner Flow receipts. Never validate `partner.webhook.test` events via `GET /api/receipts/{receipt_id}/public`.

### Status progression (do not conflate these)

| Stage | What it means |
|-------|----------------|
| **Queued** | Abraxas accepted your test enqueue. Delivery is asynchronous — **queued does not mean delivered**. |
| **HTTP delivered** | Your endpoint returned a successful HTTP response. This is **transport only** — not signature verification, not receipt validation. |
| **Signature verified by your receiver** | **You** manually confirm your handler validated the Abraxas webhook signature using the signing secret. Abraxas cannot infer this from delivery history. |

### Sandbox test flow

1. In the partner portal, enqueue a user-initiated `partner.webhook.test` event (`test: true` only).
2. Wait for delivery history to show **delivered** (HTTP success).
3. In your receiver, verify the signature with your signing secret.
4. Record `event_id` from the test — not a `receipt_id`.

---

## Step 7 — Evidence submission

When Track A (and optional Track B) are complete, send a **sanitized** evidence package to your Abraxas operator.
**Do not include** API keys, signing secrets, PII, raw ID images, holder emails, or internal operator notes.

### Evidence template (copy and fill in)

```
External design partner — sandbox evidence
Company: [your company name]
Contact: [your name, work email]
Date: [YYYY-MM-DD]

Provisioning (operator-supplied)
- partner_id: {partner_id}
- policy_id: {policy_id}
- return_url host/path confirmed: [yes/no]

Track A — Partner Flow
- End-to-end sandbox flow completed: [yes/no]
- Sample receipt_id: {receipt_id}
- Server-side GET /api/receipts/{receipt_id}/public implemented: [yes/no]
- signature_valid true: [yes/no]
- partner_id match: [yes/no]
- policy_id match: [yes/no]
- decision_result approved (if applicable): [yes/no]
- production_usable false acknowledged as expected: [yes/no]
- currently_valid false acknowledged as expected: [yes/no]
- npm run partner:conformance exit 0: [yes/no/not run]

Track B — Webhooks (optional)
- webhooks:read key issued: [yes/no/n/a]
- Sandbox test event_id: {event_id}
- Status reached queued: [yes/no/n/a]
- Status reached HTTP delivered: [yes/no/n/a]
- Signature verified by our receiver (manual): [yes/no/n/a]

Production
- Requesting production activation: [not yet — sandbox-complete review first]
```

---

## Step 8 — Sandbox-complete review

Abraxas operators review your evidence for:

- Correct server-side receipt validation behavior
- Understanding that sandbox receipts do not authorize production
- Optional webhook signature handling (if applicable)

**Production activation and `abx_live_…` credentials are a separate later review.**
Sandbox handoff uses `abx_test_…` keys only — never `abx_live_…`. Do not expect production policy promotion as part of sandbox completion.

---

## Escalation and support

For pilot provisioning, evidence review, and integration blockers, contact the **Abraxas operator contact provided during sandbox handoff**. Do not post API keys, signing secrets, or holder PII in public channels.

Use these **public** self-serve references while you wait or for general orientation:

| Situation | Where to go |
|-----------|-------------|
| Submit or check application status | `https://abraxasworld.xyz/integrations#apply` |
| Program overview | `https://abraxasworld.xyz/design-partner` |
| Technical integration questions | `https://abraxasworld.xyz/docs/partner-flow` |
| Partner portal access | `https://abraxasworld.xyz/developers/partner` |
| General product questions | `https://abraxasworld.xyz/faq` |

---

## Quick reference

| Topic | Rule |
|-------|------|
| API keys | Server-side only; sandbox handoff uses `abx_test_…` only |
| `abx_live_…` keys | Never included in sandbox pilot — separate production review |
| Sandbox receipts | May have `production_usable: false` and `currently_valid: false` |
| Production gates | Separate Abraxas review after sandbox-complete |
| Webhook queued | Not delivered yet |
| Webhook delivered | HTTP only — verify signature yourself |
| Receipt proof | `GET /api/receipts/{receipt_id}/public` on your server |

**Pilot support:** your Abraxas operator contact from sandbox handoff
**Technical contract:** `https://abraxasworld.xyz/docs/partner-flow`
