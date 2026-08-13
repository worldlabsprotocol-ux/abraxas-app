# Demo Signing-Key Bootstrap

**Current state:** Local generation and verification tooling only. `EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT` remains `null`. Live provisioner `--apply` stays disabled until a separate reviewed thumbprint PR merges.

This document covers the **demo-only** Ed25519 signing key used by the isolated Partner Sandbox environment at `https://demo.abraxasworld.xyz`. It is separate from production signing keys on `https://abraxasworld.xyz`.

## What the thumbprint is

The **public thumbprint** is a non-secret SHA-256 hex digest of the canonical public JWK:

```json
{"crv":"Ed25519","kty":"OKP","x":"<base64url-public-key>"}
```

It is computed by `canonicalPublicJwkThumbprint` in `scripts/demo/lib/demoProvisionerSigning.ts`. The thumbprint **may** appear in source code, tests, PR descriptions, and operator records.

**Never commit:**
- `demo-signing-private.jwk`
- `demo-signing-public.jwk`
- `demo-signing-bootstrap.json`

## Key format

| Field | Private JWK | Public JWK |
|-------|-------------|------------|
| `kty` | `OKP` | `OKP` |
| `crv` | `Ed25519` | `Ed25519` |
| `x` | base64url 32-byte public key | base64url 32-byte public key |
| `d` | base64url 32-byte seed | **must not be present** |

Runtime consumers:
- **Credential JWTs:** `jose` `importJWK(..., "EdDSA")` + `SignJWT` / `jwtVerify`
- **Decision receipts:** `tweetnacl` detached signature over SHA-256 canonical payload hash
- **Provisioner apply:** hidden `ABRAXAS_SIGNING_KEY` prompt must match committed thumbprint

## Commands

### Generate (operator machine, outside repository)

```bash
mkdir -p ~/secure/abraxas-demo-keys
npm run demo:signing-key:generate -- --output-dir /absolute/path/outside/repo
```

Optional:

```bash
npm run demo:signing-key:generate -- \
  --output-dir /absolute/path/outside/repo \
  --key-id abraxas-demo-primary
```

**Output files (mode `0600`, exclusive create):**
- `demo-signing-private.jwk`
- `demo-signing-public.jwk`
- `demo-signing-bootstrap.json` (non-secret metadata only)

**Stdout prints only:**
- safe status lines
- `signing_key_id`
- `public_thumbprint`
- file paths
- `signing_key_backup_required`

Private JWK contents are never printed.

### Verify (before thumbprint PR or Vercel install)

```bash
npm run demo:signing-key:verify -- \
  --private-jwk /absolute/path/demo-signing-private.jwk \
  --public-jwk /absolute/path/demo-signing-public.jwk \
  --metadata /absolute/path/demo-signing-bootstrap.json
```

Verification checks:
- strict JWK schema (unknown fields rejected)
- seed `d` derives `x` and matches public file
- thumbprint recomputation via `canonicalPublicJwkThumbprint`
- credential JWT EdDSA sign/verify round trip
- decision-receipt sign/verify via current `lib/decisionReceipts/signing.ts`

Exit **0** on success, **2** on failure. No key material is printed.

## Operator sequence

| Step | Action | Gate |
|------|--------|------|
| 1 | Create durable directory **outside** repository/workspace (not `/tmp`) | Required |
| 2 | `demo:signing-key:generate` | Writes local files only |
| 3 | `demo:signing-key:verify` | Must pass |
| 4 | **Encrypted backup attestation** | Operator copies private JWK to encrypted backup or secure secret manager **manually** — tooling does not upload or copy automatically |
| 5 | Record `public_thumbprint` from verify output | Non-secret |
| 6 | Open **small thumbprint-only PR** | Sets `EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT` only |
| 7 | **Vercel isolation verification** (hard gate, manual) | See below |
| 8 | Install demo private/public JWK on **demo Vercel environment only** | After steps 6–7 |
| 9 | `demo:provision --apply` | After thumbprint PR + demo env keys |

### Backup gate (required before thumbprint PR)

After generation, tooling prints:

```text
signing_key_backup_required
```

Operators must confirm:
- [ ] `demo:signing-key:verify` passed on the generated files
- [ ] Private JWK stored in **encrypted backup** or approved secure secret manager (manual copy only)
- [ ] Backup location recorded in operator runbook (not in git)
- [ ] No JWK files staged or committed

No network secret-manager upload is implemented in this phase.

## Vercel isolation gate (hard prerequisite before key install)

Do **not** install the demo private key until all checks pass:

| Check | Requirement |
|-------|-------------|
| Demo environment exists | Vercel **Custom Environment** (or dedicated preview) for demo — not Production |
| Stable demo domain | `demo.abraxasworld.xyz` attached to demo environment |
| Variable scope | `ABRAXAS_SIGNING_KEY`, `ABRAXAS_PUBLIC_KEY`, `ABRAXAS_SIGNING_KEY_ID` scoped **only** to demo environment |
| Supabase project | Demo project `ocntwbxarpjeixdnzide` — not production |
| No inheritance | Production signing variables are **not** inherited by demo environment |
| Issuer URL | `ABRAXAS_ISSUER_URL=https://demo.abraxasworld.xyz` |
| Browser session | Separate `ABRAXAS_BROWSER_SESSION_SECRET` — do not rely on signing-key fallback |

This tooling makes **no Vercel API calls**. Isolation is verified manually by operators.

## Runtime configuration (later phase)

On the **demo Vercel environment only**:

```env
ABRAXAS_SIGNING_KEY={"kty":"OKP","crv":"Ed25519","x":"...","d":"..."}
ABRAXAS_PUBLIC_KEY={"kty":"OKP","crv":"Ed25519","x":"..."}
ABRAXAS_SIGNING_KEY_ID=abraxas-demo-primary
ABRAXAS_ISSUER_URL=https://demo.abraxasworld.xyz
```

`ABRAXAS_PUBLIC_KEY` is required for `lib/credentials/verifyJwt.ts` and published at `GET /api/credentials/public-key`. Receipt verification uses the same public JWK via `loadReceiptVerificationKey()`.

## Thumbprint PR (separate small PR)

Allowed changes only:
- `EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT = "<64-hex>"` in `expectedDemoSigningKeyThumbprint.ts`
- tests + documentation

Forbidden:
- private/public JWK files
- metadata files
- Vercel changes

Until merged, `npm run demo:provision -- --apply` exits **2** with `demo_signing_key_not_configured`.

## Rotation and revocation (design only — not implemented)

Current code supports **one** verification public key per deployment:

- `process.env.ABRAXAS_PUBLIC_KEY` is a single JWK (`lib/credentials/verifyJwt.ts`, `loadReceiptVerificationKey`)
- No multi-key JWKS registry exists for credentials or receipts

**Implication:** Replacing `ABRAXAS_PUBLIC_KEY` on the demo environment causes **previously issued demo JWTs and decision receipts to fail signature verification** unless a separately designed multi-key verification registry is added.

Rotation therefore requires either:
1. Accepting that old demo artifacts stop validating after key replacement, plus reprovisioning/re-issuance as needed, or
2. A future multi-key verification design (out of scope for this phase)

**Never:**
- Reuse production keys in demo
- Copy production private keys
- Share one key across Production and Demo

Emergency revocation: remove demo signing keys from demo Vercel environment and redeploy. Archived public JWK may be kept in operator encrypted backup for audit-only verification of historical artifacts.

## Filesystem safety

Generation refuses:
- relative paths
- paths inside repository/workspace
- disposable locations (`/tmp`, `/var/tmp`, `/dev/shm`) unless test-only dependency injection
- symlink components in parent path
- symlink or existing target files
- implicit overwrite (`O_CREAT | O_EXCL`)

## Threat model summary

| Risk | Control |
|------|---------|
| Private key in git | Write outside repo; never stage `*.jwk` |
| Demo key on Production Vercel | Manual isolation checklist before install |
| Accidental production key use | `KNOWN_PRODUCTION_SIGNING_KEY_THUMBPRINTS` denylist (when populated) |
| Key logged to terminal | Generator/verify never print JWK fields |
| Thumbprint PR leaks secret | PR contains hex digest only |
