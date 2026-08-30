# Abraxas

Abraxas is a **reusable verification and proof layer for partner flows**. A partner directs a user through a policy-based verification flow, receives a signed result on callback, and **independently re-fetches and validates the public receipt** before granting access.

Abraxas is **not** a unified KYC product, an automatic legal-compliance service, a guarantee of identity, or an investment product. Licensed or Abraxas-native identity capture may be part of a flow; partners receive cryptographic proof and must enforce their own access policies.

**Live (beta):** [https://abraxasworld.xyz](https://abraxasworld.xyz)

---

## How Partner Flow works

1. Your app redirects the holder to Abraxas with `partner_id`, `policy_id`, and an allowlisted `return_url`.
2. The holder completes verification on Abraxas (browser session on the Abraxas origin only).
3. Abraxas redirects back to your `return_url` with frozen query parameters — **no PII** in the URL.
4. **Your server** calls `GET /api/receipts/{receipt_id}/public`, validates the signed receipt, and only then grants access.

Full integrator guide: [/docs/partner-flow](https://abraxasworld.xyz/docs/partner-flow) · OpenAPI: [/docs/partner-flow-api](https://abraxasworld.xyz/docs/partner-flow-api)

### Sandbox vs Production

| | Sandbox | Production |
|---|---------|------------|
| **Access** | Operator-provisioned after design-partner review | Separate operator review and activation |
| **API keys** | `abx_test_…` | `abx_live_…` |
| **Receipts** | `production_usable: false` is **expected** | `production_usable: true` required for live gates |
| **Authorization** | Sandbox receipts **cannot** authorize Production access | Validate every applicable field before granting access |

Sandbox and Production credentials, policies, and return URLs are **not** interchangeable.

### Public receipt vs webhooks

| Mechanism | Role |
|-----------|------|
| **`GET /api/receipts/{receipt_id}/public`** | **Authoritative proof** — signed decision receipt with live trust fields (`signature_valid`, `currently_valid`, `production_usable`, and related status). Partners must use this before granting access. |
| **Webhooks** | **Notification transport only** — optional HTTPS lifecycle events (for example `partner.receipt.issued`). A webhook is not proof of access. |

Webhook delivery states (`pending`, `delivering`, `delivered`, `retrying`, `failed`) describe **HTTP transport**, not receipt validity. `delivered` means your endpoint returned success — not that a receipt is valid. Partners must still re-fetch the public receipt and validate signatures and trust fields.

Sandbox webhook test events (`partner.webhook.test`) exercise signature handling only. They are not Partner Flow lifecycle receipts.

### Production receipt validation (fail closed)

Before granting Production access, your server should verify **all applicable checks** on the public receipt response, including:

- `signature_valid === true`
- `decision_result === "approved"`
- `status === "active"`
- `expires_at` is present, valid, and not passed
- `production_usable === true`
- `currently_valid === true` (where the response includes live trust enrichment)
- `partner_id` and `policy_id` match your integration

Do not trust callback query parameters alone. Do not treat webhook delivery as proof.

---

## Current capabilities

Grounded in the current `main` branch:

- **Partner Flow** — browser redirect entry at `/partner/verify`; browser-session APIs `POST /api/v1/partner-flow/evaluate`, `complete`, and `refresh`; public receipt at `GET /api/receipts/{receipt_id}/public`
- **OpenAPI contract** — `public/openapi/partner-flow.openapi.yaml` and [/docs/partner-flow-api](https://abraxasworld.xyz/docs/partner-flow-api)
- **Sandbox integration** — design-partner application, operator provisioning, partner portal at `/developers/partner`, conformance tooling (`npm run partner:conformance`, `npm run integration:preflight`)
- **Optional webhooks** — signed, non-PII lifecycle notifications; sandbox test delivery from the partner portal (separate `webhooks:read` scope)
- **Alternative server-driven path** — `POST /api/v1/verification-requests` with a partner API key (see [/docs/partner-verification-requests](https://abraxasworld.xyz/docs/partner-verification-requests))
- **Passport (holder tools)** — `/passport` for zkLogin sign-in and optional identity capture; separate from Partner Flow receipt gates
- **Credential verify path** — `POST /api/credentials/verify` for relying parties gating on existing credentials (see [/docs/relying-party-verify](https://abraxasworld.xyz/docs/relying-party-verify))

### In development (not live)

These capabilities are **planned** — do not implement against them until documented as shipped:

- **Consented passwordless partner-account creation** — create or recover a partner-local account from an Abraxas verification
- **Pairwise partner identity** — per-partner subject identifiers; partners cannot correlate users across services
- **Optional email sharing** — separate `contact.email` consent scope
- **Separate newsletter / marketing consent** — never bundled with eligibility verification; never preselected
- **Returning “Continue with Abraxas” login** — faster return visits; partner sessions remain partner-owned
- **Partner-owned sessions and benefits** — purchases, rewards, and communications stay on the partner

Planning reference: [docs/PARTNER_PASSWORDLESS_ONBOARDING_PLAN.md](docs/PARTNER_PASSWORDLESS_ONBOARDING_PLAN.md) (repository only — **not deployed**).

**Positioning:** “One verification. Faster onboarding. Fewer forms.” — Abraxas helps users prove eligibility without repeatedly exposing sensitive identity information. Partners receive only authorized claims; Abraxas does not send ID photos or date of birth to partners.

---

## External design partners

Partner Flow sandbox access is **reviewed and operator-provisioned** — not self-serve.

| Step | Link |
|------|------|
| Apply | [/integrations#apply](https://abraxasworld.xyz/integrations#apply) |
| Design partner hub | [/design-partner](https://abraxasworld.xyz/design-partner) |
| Integrator docs | [/docs/partner-flow](https://abraxasworld.xyz/docs/partner-flow) |
| Partner portal (API key) | [/developers/partner](https://abraxasworld.xyz/developers/partner) |

Pilot playbook (partner-facing): [docs/EXTERNAL_DESIGN_PARTNER_PILOT.md](docs/EXTERNAL_DESIGN_PARTNER_PILOT.md)

---

## Passport (holder verification — separate lane)

Passport is the **holder-facing** surface for sign-in, optional identity capture, and credential tooling. It supports Partner Flow holders but is a **different integration path** from partner receipt verification.

- Sign in with Google (zkLogin) at [/passport](https://abraxasworld.xyz/passport)
- Optional biometric / document capture and W3C verifiable credentials
- Docs: [/docs/passport-spec](https://abraxasworld.xyz/docs/passport-spec), [/docs/zklogin-setup](https://abraxasworld.xyz/docs/zklogin-setup), [/docs/sui](https://abraxasworld.xyz/docs/sui)

---

## API surface (summary)

### Partner Flow (primary)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/partner/verify` | GET | None (browser redirect) | Holder entry with `partner_id`, `policy_id`, `return_url` |
| `/api/v1/partner-flow/evaluate` | POST | Browser session | Evaluate policy for signed-in holder |
| `/api/v1/partner-flow/complete` | POST | Browser session | Issue session receipt after verification |
| `/api/v1/partner-flow/refresh` | POST | Browser session | Re-issue receipt when credential still valid |
| `/api/receipts/{receipt_id}/public` | GET | None (partner backend) | **Authoritative** signed receipt + live trust |

### Optional webhooks (notification transport)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/partner/webhooks/test-delivery` | POST | Sandbox API key (`webhooks:read`) | Queue a sandbox test event (asynchronous) |
| `/api/partner/webhooks/status` | GET | Partner API key | Webhook configuration status |
| `/api/v1/partner/webhooks/deliveries` | GET | Partner API key | Delivery history (transport metadata) |

Details: [/docs/partner-flow](https://abraxasworld.xyz/docs/partner-flow) and [docs/PARTNER_WEBHOOKS.md](docs/PARTNER_WEBHOOKS.md).

### Passport / credentials (supporting)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/zklogin/register` | POST | Register OAuth → Sui holder address |
| `/api/credentials/verify` | POST | Verify credential presentation |
| `/api/passport/spec` | GET | Machine-readable Passport spec |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Application | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Credentials | W3C VC · Ed25519 · zkLogin |
| Hosting | Vercel |

Architecture overview: [/docs/architecture](https://abraxasworld.xyz/docs/architecture)

---

## Local development

### Clone and install

```bash
git clone https://github.com/worldlabsprotocol-ux/abraxas-app.git
cd abraxas-app
npm ci
npm run dev
```

Node **≥ 18.17** (`package.json`); CI uses Node 20.

### Functional setup (your Supabase project)

To run Passport, Partner Flow, or receipt signing against a real backend, configure a **local or team-authorized Supabase project**:

1. Copy [.env.local.example](.env.local.example) to `.env.local` and fill in your project values.
2. Follow [docs/ZKLOGIN_BACKEND_SETUP.md](docs/ZKLOGIN_BACKEND_SETUP.md) for zkLogin, Google OAuth, and backend wiring.
3. Apply schema using [docs/MIGRATIONS.md](docs/MIGRATIONS.md) (Supabase SQL Editor on **your** project).

Generate local signing keys:

```bash
node scripts/generate-abraxas-key.js
```

Set in `.env.local` (use a **contributor-controlled origin** — never the production host for local signing):

```bash
ABRAXAS_SIGNING_KEY=          # from generate-abraxas-key.js
ABRAXAS_PUBLIC_KEY=           # from generate-abraxas-key.js
ABRAXAS_ISSUER_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Partner Flow integration testing also requires operator-provisioned `partner_id`, `policy_id`, and allowlisted `return_url` — see the [external design partner playbook](docs/EXTERNAL_DESIGN_PARTNER_PILOT.md).

### CI placeholders (build and type-check only — nonfunctional)

GitHub Actions uses **placeholder** environment variables so `next build` succeeds without repository secrets. These values are **not** a runnable local or production configuration:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-placeholder
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-placeholder
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=ci-build-placeholder-secret
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_VERIFICATION_PROGRAM_ID=ABRAXASverify1111111111111111111111111111111
```

### Useful scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development server |
| `npm test` | Vitest unit tests |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run integration:preflight` | Read-only integration checks ([docs/INTEGRATION_PREFLIGHT.md](docs/INTEGRATION_PREFLIGHT.md)) |
| `npm run partner:conformance` | Partner Flow conformance checks (after credentials are issued) |

---

## Documentation

| Topic | Location |
|-------|----------|
| Docs hub | [/docs](https://abraxasworld.xyz/docs) |
| Partner Flow | [/docs/partner-flow](https://abraxasworld.xyz/docs/partner-flow) |
| External pilot playbook | [docs/EXTERNAL_DESIGN_PARTNER_PILOT.md](docs/EXTERNAL_DESIGN_PARTNER_PILOT.md) |
| Integration preflight | [docs/INTEGRATION_PREFLIGHT.md](docs/INTEGRATION_PREFLIGHT.md) |
| Partner webhooks | [docs/PARTNER_WEBHOOKS.md](docs/PARTNER_WEBHOOKS.md) |
| Integration status (internal) | [docs/INTEGRATION_READINESS_RECONCILIATION.md](docs/INTEGRATION_READINESS_RECONCILIATION.md) |

---

## Security

Report vulnerabilities in good faith:

- **Bug bounty (pre-registration):** [https://abraxasworld.xyz/security/bounty](https://abraxasworld.xyz/security/bounty)
- **Email:** security@worldlabsprotocol.com (subject: `[Abraxas Bug Bounty]`)

Do not publicly disclose issues before acknowledgment. See the bounty page for scope, safe harbor, and the optional API submission form.

---

## Repository

This repository is **private** — World Labs Protocol. All rights reserved.

There is no public contribution policy in this repository. Coordinate changes with the maintainers.
