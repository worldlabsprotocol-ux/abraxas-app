# Start here — external developer

## What you are integrating

Abraxas **wallet-control verification**: your app requests a decision, the holder authorizes on Abraxas, you receive a **signed receipt** and enforce **permit**, **deny**, or **indeterminate** locally.

No Abraxas application code. No `@/lib` imports.

## What you need (secure handoff — not public chat)

- Demo sandbox: API key, application id, partner id, policy id
- Callback URL allowlisted on your sandbox app
- **Trust anchor JSON** (issuer trust — separate from software download)
- **Verifier tarball** `abraxas-independent-verifier-0.1.1.tgz` + SHA-256 (GitHub Release or secure channel)

Host: **`https://demo.abraxasworld.xyz`** end-to-end ([SANDBOX_ENVIRONMENT.md](./SANDBOX_ENVIRONMENT.md)).

## Run the example (first action)

```bash
# Copy only the example folder (email/zip from Abraxas, or clone and copy examples/external-node-partner)
cd external-node-partner
# Download release assets into vendor/ — see vendor/README.md
cp .env.example .env    # fill from secure handoff
cp /secure-handoff/trust-anchor.demo.json ./trust-anchor.demo.json
npm install
npm start
```

Open **http://127.0.0.1:3847** → **Create verification request** → holder flow → callback JSON with `enforcement.action`.

Uses **HTTPS only**: `POST /api/v1/partner-handoff`, then portable export + installed verifier.

## Success

- `enforcement.action` is `permit`, `deny`, or `indeterminate`
- Callback query params alone never grant access
- Authentic expired receipt → **deny**

## Reference

| Topic | Doc |
|-------|-----|
| HTTP API | [examples/external-node-partner/HTTP_API.md](../../examples/external-node-partner/HTTP_API.md) |
| Verifier install | [vendor/README.md](../../examples/external-node-partner/vendor/README.md) |
| Release process (internal) | [VERIFIER_GITHUB_RELEASE.md](../../docs/operations/VERIFIER_GITHUB_RELEASE.md) |
| Trust anchor | [TRUST_ANCHOR.md](./TRUST_ANCHOR.md) |
| Full pilot | [QUICKSTART.md](./QUICKSTART.md) |
