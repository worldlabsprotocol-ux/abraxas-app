# External Node partner — copy-ready integration

Integrate Abraxas **without cloning the Abraxas app** or importing `@/lib/*`.

Uses only:

- `POST /api/v1/partner-handoff` (sandbox API key, server-side)
- Public portable export + `@abraxas/independent-verifier`

## Quick start (5 steps)

1. Copy this folder into your project (or clone the repo once and work here).
2. `cp .env.example .env` and fill values from the **secure founder handoff** (never commit `.env`).
3. Copy the Demo trust anchor:  
   `cp ../portable-relying-party/trust-config.demo.template.json ./trust-anchor.demo.json`
4. `npm install` then `npm start`
5. Open `http://127.0.0.1:3847` → **Create verification request** → complete holder flow → callback shows JSON enforcement.

Set your sandbox application **callback URL** in Integration Studio to match `CALLBACK_BASE_URL/callback` (e.g. `http://127.0.0.1:3847/callback`). Hosted handoff uses that stored URL — it is not passed in the POST body.

## Environment (minimum)

| Variable | Purpose |
|----------|---------|
| `ABRAXAS_BASE_URL` | e.g. `https://demo.abraxasworld.xyz` |
| `ABRAXAS_API_KEY` | `abx_test_…` (server only) |
| `ABRAXAS_APPLICATION_ID` | Sandbox app id |
| `ABRAXAS_PARTNER_ID` | Expected receipt audience |
| `ABRAXAS_POLICY_ID` | Wallet-control policy id |
| `ABRAXAS_TRUST_ANCHOR_PATH` | Out-of-band anchor JSON |

Optional: `ABRAXAS_BINDING_ID`, `CALLBACK_BASE_URL`, `PORT`.

## Verifier package

Install from the **versioned tarball** (no Abraxas app source required):

```bash
npm install ../../artifacts/npm/abraxas-independent-verifier-0.1.1.tgz
```

Verify integrity: `shasum -a 256 -c ../../artifacts/npm/abraxas-independent-verifier-0.1.1.tgz.sha256`

After founder-approved npm publish: `npm install @abraxas/independent-verifier@0.1.1`.

## HTTP contract

See [HTTP_API.md](./HTTP_API.md) and `lib/partner/hostedHandoff/examples.ts` in the Abraxas repo (reference).

## Tests (fixtures — not live sandbox)

```bash
npm test
```
