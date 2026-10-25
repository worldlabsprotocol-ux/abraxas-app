# Start here — external developer

## What you are integrating

Abraxas provides **wallet-native verification** (e.g. wallet control). Your app asks for a decision; the holder authorizes in Abraxas; you receive a **signed receipt** and enforce **permit**, **deny**, or **indeterminate** in your own code.

You do **not** need the Abraxas repository or `@/lib` imports.

## What you need from Abraxas (secure handoff)

Delivered privately (never in public docs or chat):

- `ABRAXAS_API_KEY` (`abx_test_…`)
- `ABRAXAS_APPLICATION_ID`
- `ABRAXAS_PARTNER_ID` and `ABRAXAS_POLICY_ID` (wallet-control sandbox)
- Demo **trust anchor** JSON + fingerprint
- Callback URL **allowlisted** on your sandbox app

Use one host for everything: **`https://demo.abraxasworld.xyz`** ([SANDBOX_ENVIRONMENT.md](./SANDBOX_ENVIRONMENT.md)).

## Run the working example (first action)

```bash
# Option A — clone only to copy the example + verifier tarball
git clone https://github.com/worldlabsprotocol-ux/abraxas-app.git
cd abraxas-app/examples/external-node-partner
cp .env.example .env   # fill from secure handoff
cp ../portable-relying-party/trust-config.demo.template.json ./trust-anchor.demo.json
npm install            # installs @abraxas/independent-verifier from artifacts/npm/*.tgz
npm start
```

Option B — without full clone: obtain `abraxas-independent-verifier-0.1.1.tgz` + checksum from your Abraxas contact, `npm install ./abraxas-independent-verifier-0.1.1.tgz`, and copy `examples/external-node-partner` source from the release tag.

Open **http://127.0.0.1:3847** → **Create verification request** → complete the holder flow → your callback shows JSON with `enforcement.action`.

The example uses **HTTPS only**:

- `POST /api/v1/partner-handoff` to start
- `GET /api/receipts/{id}/portable-verification` + `@abraxas/independent-verifier` to enforce

Details: [examples/external-node-partner/README.md](../../../examples/external-node-partner/README.md) and [HTTP_API.md](../../../examples/external-node-partner/HTTP_API.md).

## Success looks like

- `enforcement.action` is `permit`, `deny`, or `indeterminate` (never trust callback query params alone)
- `cryptographically_authentic: true` on genuine receipts
- Expired but authentic receipts → **deny**, not permit

## Advanced documentation

| Topic | Doc |
|-------|-----|
| Full pilot timeline | [QUICKSTART.md](./QUICKSTART.md) |
| Env vars | [ENVIRONMENT.md](./ENVIRONMENT.md) |
| Trust anchor | [TRUST_ANCHOR.md](./TRUST_ANCHOR.md) |
| Errors | [ERRORS_AND_RECOVERY.md](./ERRORS_AND_RECOVERY.md) |
| In-repo Partner Kit (optional) | [VERIFY_WITH_ABRAXAS_QUICKSTART.md](../../VERIFY_WITH_ABRAXAS_QUICKSTART.md) |
